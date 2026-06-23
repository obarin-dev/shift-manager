import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { listClassrooms } from "../src/lib/classroom-db";
import { sortClassrooms } from "../src/lib/mock-classes";
import {
  normalizeRosterSheetPayload,
  saveRosterSheet,
  type RosterSheetPayload,
} from "../src/lib/roster-db";

const STORE_FILE = path.join(process.cwd(), "data/roster-store.json");

type RosterStore = {
  byDate: Record<string, RosterSheetPayload>;
};

async function main() {
  let raw: string;
  try {
    raw = await readFile(STORE_FILE, "utf8");
  } catch {
    throw new Error(`JSON が見つかりません: ${STORE_FILE}`);
  }

  const store = JSON.parse(raw) as RosterStore;
  const dates = Object.keys(store.byDate ?? {}).sort();

  if (dates.length === 0) {
    console.log("移行対象の日付がありません。");
    return;
  }

  const classrooms = sortClassrooms(await listClassrooms());

  for (const dateKey of dates) {
    const payload = normalizeRosterSheetPayload(store.byDate[dateKey], classrooms);
    if (!payload) {
      console.warn(`Skipped invalid payload: ${dateKey}`);
      continue;
    }

    await saveRosterSheet(dateKey, payload);
    console.log(`Imported ${dateKey} (${payload.assignments.length} assignment(s))`);
  }

  console.log(`Done. ${dates.length} date(s) imported to DB.`);
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
