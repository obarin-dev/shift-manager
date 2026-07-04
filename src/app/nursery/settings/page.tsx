import Link from "next/link";
import { isReadOnlyRole, requireAdminOrManager } from "@/lib/page-auth";
import { buildAdminHref } from "@/lib/admin-navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { NurserySettingsPanel } from "@/components/nursery-info/nursery-settings-panel";
import { OnboardingBanner } from "@/components/home/onboarding-banner";

export default async function NurserySettingsPage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;

  return (
    <AdminShell activeNav="nursery" account={account} role={role}>
      <nav aria-label="パンくず" className="breadcrumb">
        <Link href={buildAdminHref("/nursery", role)}>園管理</Link>
        <span aria-hidden="true">/</span>
        <span>基本設定</span>
      </nav>

      <OnboardingBanner />

      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="園の基本情報、保育時間・延長保育、休日設定（定休日・祝日など）、勤務区分（早番・日勤・遅番など）を設定します。"
        eyebrow="園管理"
        title="基本設定"
      />

      <NurserySettingsPanel readOnly={isReadOnlyRole(role)} />
    </AdminShell>
  );
}

