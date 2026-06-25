import Link from "next/link";
import { requireAdminOrManager } from "@/lib/page-auth";
import { buildAdminHref } from "@/lib/admin-navigation";
import { ClassesSettings } from "@/components/classes/classes-settings";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";

export default async function NurseryClassesPage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;

  return (
    <AdminShell
      activeNav="nursery"
      account={account}
      role={role}
      scrollPanelLayout
    >
      <nav aria-label="パンくず" className="breadcrumb">
        <Link href={buildAdminHref("/nursery", role)}>園管理</Link>
        <span aria-hidden="true">/</span>
        <span>クラス管理</span>
      </nav>

      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="クラス・園児数・担当職員を管理します。配置基準は体制表作成で設定します。"
        eyebrow="園管理"
        title="クラス管理"
      />

      <div className="scroll-panel-host">
        <ClassesSettings readOnly={role === "manager"} />
      </div>
    </AdminShell>
  );
}
