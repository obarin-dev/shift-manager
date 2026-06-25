import { requireAdminOrManager } from "@/lib/page-auth";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { DailyRosterGrid } from "@/components/roster/daily-roster-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";

export default async function RosterPage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();

  return (
    <AdminShell activeNav="roster" account={account} role={role} scrollPanelLayout>
      <div className="no-print">
        <AppHeader
          actions={
            account?.roleLabel ? (
              <span className="app-header__chip">{account.roleLabel}</span>
            ) : null
          }
          description="指定日のクラス別・時間帯別の職員配置を体制表として確認します。縦軸は7時〜19時、横軸はクラス名です。"
          eyebrow="体制表"
          title="体制表作成"
        />
      </div>

      <div className="scroll-panel-host shift-roster-page">
        <DailyRosterGrid nurseryName={nurseryName} />
      </div>
    </AdminShell>
  );
}
