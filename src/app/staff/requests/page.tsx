import { AppHeader } from "@/components/layout/app-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { StaffRequestPanel } from "@/components/staff/staff-request-panel";
import { requireAuth } from "@/lib/page-auth";

export default async function StaffRequestsPage() {
  const { account } = await requireAuth();
  const role = account.role;

  return (
    <AdminShell
      activeNav="home"
      activeStaffNav="requests"
      account={account}
      role={role}
      scrollPanelLayout
    >
      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="休み希望や出勤希望を提出できます。提出内容は管理者の希望一覧で確認する想定です。"
        eyebrow="職員メニュー"
        title="出勤希望"
      />

      <StaffRequestPanel canSubmit={role === "staff"} />
    </AdminShell>
  );
}
