import { AdminRequestsPanel } from "@/components/admin/admin-requests-panel";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdminOrManager } from "@/lib/page-auth";
import { listAdminStaffRequestGroups } from "@/lib/staff-request-db";

export default async function RequestsPage() {
  const { account } = await requireAdminOrManager();

  const groups = await listAdminStaffRequestGroups(account.nurseryId);

  return (
    <AdminShell activeNav="requests" account={account} role={account.role} scrollPanelLayout>
      <AppHeader
        actions={<span className="app-header__chip">{account.roleLabel}</span>}
        description="職員名を押すと、その職員が提出した希望日を確認できます。"
        eyebrow="管理者メニュー"
        title="希望一覧"
      />

      <AdminRequestsPanel groups={groups} />
    </AdminShell>
  );
}
