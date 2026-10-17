import { requireAdminOrManager } from "@/lib/page-auth";
import { RosterShell } from "@/components/layout/roster-shell";
import { AppHeader } from "@/components/layout/app-header";
import { DailyRosterGrid } from "@/components/roster/daily-roster-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";

export default async function RosterPage() {
  const { account } = await requireAdminOrManager();
  const nurseryName = await getPrimaryNurseryName();

  return (
    <RosterShell activeNav="roster" account={account} scrollPanelLayout>
      <div className="no-print">
        <AppHeader
          actions={<span className="app-header__chip">{account.roleLabel}</span>}
          description="指定日のクラス別・時間帯別の職員配置を体制表として確認します。縦軸は7時〜19時、横軸はクラス名です。"
          eyebrow="体制表"
          title="体制表作成"
        />
      </div>

      <div className="scroll-panel-host shift-roster-page">
        <DailyRosterGrid nurseryName={nurseryName} />
      </div>
    </RosterShell>
  );
}
