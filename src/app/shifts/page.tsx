import { requireAdminOrManager } from "@/lib/page-auth";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { MonthlyShiftGrid } from "@/components/shifts/monthly-shift-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";

export default async function ShiftsPage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();

  return (
    <AdminShell activeNav="shifts" account={account} role={role} scrollPanelLayout>
      <div className="no-print">
        <AppHeader
          actions={
            account?.roleLabel ? (
              <span className="app-header__chip">{account.roleLabel}</span>
            ) : null
          }
          description="職員の出勤希望は勤務表のセルに反映されます。「希望を反映」で上書きできます。"
          eyebrow="勤務表"
          title="勤務表作成"
        />
      </div>

      <div className="scroll-panel-host shift-schedule-page">
        <MonthlyShiftGrid nurseryName={nurseryName} />
      </div>
    </AdminShell>
  );
}
