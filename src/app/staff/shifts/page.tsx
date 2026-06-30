import { requireAuth } from "@/lib/page-auth";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { MonthlyShiftGrid } from "@/components/shifts/monthly-shift-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";

export default async function StaffShiftPage() {
  const { account } = await requireAuth();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();

  return (
    <AdminShell
      activeNav="home"
      activeStaffNav="shifts"
      account={account}
      role={role}
      scrollPanelLayout
    >
      <div className="no-print">
        <AppHeader
          actions={
            account?.roleLabel ? (
              <span className="app-header__chip">{account.roleLabel}</span>
            ) : null
          }
          description="保存済みの月間勤務表を確認できます。この画面では編集できません。"
          eyebrow="職員メニュー"
          title="勤務表"
        />
      </div>

      <div className="scroll-panel-host shift-schedule-page">
        <MonthlyShiftGrid
          nurseryName={nurseryName}
          readOnly
          filterStaffId={account.staffId}
        />
      </div>
    </AdminShell>
  );
}
