import Link from "next/link";
import { requireAuth } from "@/lib/page-auth";
import { buildAdminHref } from "@/lib/admin-navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { NurseryCalendarPanel } from "@/components/nursery-info/nursery-calendar-panel";

export default async function NurseryCalendarPage() {
  const { account } = await requireAuth();
  const role = account.role;

  return (
    <AdminShell activeNav="nursery" account={account} role={role}>
      <nav aria-label="パンくず" className="breadcrumb">
        <Link href={buildAdminHref("/nursery", role)}>園管理</Link>
        <span aria-hidden="true">/</span>
        <span>行事カレンダー</span>
      </nav>

      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="行事、休園日、臨時の開園時間をカレンダーに登録します。勤務表作成の前提情報になります。"
        eyebrow="園管理"
        title="行事カレンダー"
      />

      <NurseryCalendarPanel />
    </AdminShell>
  );
}

