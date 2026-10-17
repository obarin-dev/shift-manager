import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * .claude/skills/ の SKILL.md が参照しているファイルが実在するかを検査する。
 *
 * Skill はコードベースの構造を説明するドキュメントだが、コードが移動・削除されても
 * 自動では更新されない。テストも型チェックも通るため、古くなっても誰も気づかない。
 * 「存在しないファイルを参照している」という機械的に判定できる部分だけを検出する。
 */

const SKILLS_DIR = ".claude/skills";

/**
 * ファイル名だけが書かれている場合に探す対象。ここに無ければ「消えた」と判定する。
 *
 * roster-app/ は意図的に含めない。本体の Skill は src/ の構造を説明しており、
 * roster-app へ切り出されたファイルは「本体にはもう無い」のが事実のため。
 * roster-app を指したい場合は `roster-app/src/lib/roster-db.ts` のように
 * パス付きで書けば、そのパスの実在を直接確認する。
 */
const SEARCH_ROOTS = ["src", "scripts", "prisma"];

/** バッククォートで囲まれた .ts / .tsx を拾う */
const FILE_REF_PATTERN = /`([A-Za-z0-9_./\-[\]]+\.tsx?)`/g;

type Finding = {
  skill: string;
  ref: string;
};

/** 指定ディレクトリ以下の全ファイルの basename を集める */
async function collectFileNames(dir: string, acc: Set<string>) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // ルートが存在しない場合は黙って飛ばす（roster-app が無い構成もありうる）
    return;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFileNames(full, acc);
    } else {
      acc.add(entry.name);
    }
  }
}

/**
 * 参照が実在するかを判定する。
 *
 * - パスを含む（`roster-app/src/lib/roster-db.ts`）→ そのパスを直接確認する
 * - ファイル名のみ（`roster-db.ts`）→ SEARCH_ROOTS 内に同名ファイルがあるか探す
 */
async function refExists(ref: string, knownNames: Set<string>): Promise<boolean> {
  if (ref.includes("/")) {
    try {
      await stat(ref);
      return true;
    } catch {
      return false;
    }
  }
  return knownNames.has(ref);
}

async function listSkills(): Promise<string[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function main() {
  const existingNames = new Set<string>();
  for (const root of SEARCH_ROOTS) {
    await collectFileNames(root, existingNames);
  }

  const skills = await listSkills();
  const findings: Finding[] = [];
  let totalRefs = 0;

  for (const skill of skills) {
    const mdPath = path.join(SKILLS_DIR, skill, "SKILL.md");
    try {
      await stat(mdPath);
    } catch {
      console.log(`⏭  ${skill}: SKILL.md が無いため対象外`);
      continue;
    }

    const text = await readFile(mdPath, "utf8");
    const refs = new Set<string>();
    for (const match of text.matchAll(FILE_REF_PATTERN)) {
      refs.add(match[1]);
    }

    const checks = await Promise.all(
      [...refs].map(async (ref) => ({ ref, ok: await refExists(ref, existingNames) })),
    );
    const missing = checks.filter((c) => !c.ok).map((c) => c.ref).sort();

    totalRefs += refs.size;
    findings.push(...missing.map((ref) => ({ skill, ref })));

    const mark = missing.length > 0 ? "⚠️ " : "✅";
    console.log(`${mark} ${skill}: 参照 ${refs.size}件 / 消失 ${missing.length}件`);
    for (const ref of missing) {
      console.log(`      ❌ ${ref}`);
    }
  }

  console.log(`\n合計: 参照 ${totalRefs}件 / 消失 ${findings.length}件`);

  if (findings.length > 0) {
    console.log(
      "\nSKILL.md が存在しないファイルを参照しています。" +
        "ファイルが移動・削除された場合は SKILL.md の記述も更新してください。",
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
