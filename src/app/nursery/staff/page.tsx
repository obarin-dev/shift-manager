import Link from "next/link";
import { requireAdminOrManager } from "@/lib/page-auth";
import { buildAdminHref } from "@/lib/admin-navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { StaffManagementSettings } from "@/components/staff/staff-management-settings";
import { OnboardingBanner } from "@/components/home/onboarding-banner";

export default async function NurseryStaffPage() {
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
        <span>職員管理</span>
      </nav>

      <OnboardingBanner />

      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="職員マスタを登録し、個人端末で使う職員には一覧の「招待」から QR / URL を発行します。"
        eyebrow="園管理"
        title="職員管理"
      />

      <div className="scroll-panel-host">
        <StaffManagementSettings role={role} roleLabel={account?.roleLabel} />
      </div>
    </AdminShell>
  );
}
