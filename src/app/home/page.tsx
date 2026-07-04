import { listCalendarEntries, getTodaySpecialEvents, toDateKey } from "@/lib/calendar-entry-db";
import { requireAuth } from "@/lib/page-auth";
import { TodayScheduleHeader } from "@/components/home/today-schedule-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { DailyRosterGrid } from "@/components/roster/daily-roster-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import { OnboardingModal } from "@/components/home/onboarding-modal";

export default async function HomePage() {
  const { account } = await requireAuth();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();
  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const headerActions = account?.roleLabel ? (
    <span className="app-header__chip">{account.roleLabel}</span>
  ) : null;

  const todayKey = toDateKey(new Date());
  let todayScheduleItems: ReturnType<typeof getTodaySpecialEvents> = [];
  try {
    const entries = await listCalendarEntries({ from: todayKey, to: todayKey });
    todayScheduleItems = getTodaySpecialEvents(entries);
  } catch {
    // DB 未接続時は空表示
  }

  return (
    <AdminShell
      activeNav="home"
      account={account}
      role={role}
      scrollPanelLayout
    >
      {account.role === "admin" && <OnboardingModal />}
      <TodayScheduleHeader
        actions={headerActions}
        dateLabel={todayLabel}
        items={todayScheduleItems}
      />
      <DailyRosterGrid
        className="home-roster-panel"
        nurseryName={nurseryName}
        readOnly
        showEvents={false}
      />
    </AdminShell>
  );
}
