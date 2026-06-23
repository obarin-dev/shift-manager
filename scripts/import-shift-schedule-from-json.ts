import "dotenv/config";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShiftSchedulePayload } from "../src/lib/shift-schedule-db";
import { saveShiftSchedule } from "../src/lib/shift-schedule-db";

const STORE_FILE = path.join(process.cwd(), "data/shift-schedule-store.json");

type ShiftScheduleStore = {
  byMonth: Record<string, ShiftSchedulePayload>;
};

async function removeMonthFromJsonStore(targetMonth: string) {
  let raw: string;
  try {
    raw = await readFile(STORE_FILE, "utf8");
  } catch {
    return;
  }

  const store = JSON.parse(raw) as ShiftScheduleStore;
  if (!store.byMonth?.[targetMonth]) {
    return;
  }

  delete store.byMonth[targetMonth];
  const remainingMonths = Object.keys(store.byMonth);

  if (remainingMonths.length === 0) {
    await unlink(STORE_FILE);
    console.log(`Removed empty JSON store: ${STORE_FILE}`);
    return;
  }

  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  console.log(`Kept JSON months: ${remainingMonths.join(", ")}`);
}

async function main() {
  const targetMonth = process.argv[2] ?? "2026-05";

  let raw: string;
  try {
    raw = await readFile(STORE_FILE, "utf8");
  } catch {
    throw new Error(`JSON が見つかりません: ${STORE_FILE}`);
  }

  const store = JSON.parse(raw) as ShiftScheduleStore;
  const monthData = store.byMonth?.[targetMonth];

  if (!monthData) {
    throw new Error(`${targetMonth} のデータが JSON にありません`);
  }

  await saveShiftSchedule(targetMonth, monthData);
  await removeMonthFromJsonStore(targetMonth);

  console.log(
    `Imported ${targetMonth} to DB (${monthData.assignments.length} assignment(s), status=${monthData.status})`,
  );
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
