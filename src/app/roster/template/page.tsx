import { requireAdminOrManager } from "@/lib/page-auth";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { RosterTemplateEditor } from "@/components/roster/roster-template-editor";
import Link from "next/link";

export default async function RosterTemplatePage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;

  return (
    <AdminShell activeNav="roster" account={account} role={role} scrollPanelLayout>
      <div className="no-print">
        <AppHeader
          actions={
            <Link href="/roster" className="secondary-button secondary-button--compact" style={{ textDecoration: "none" }}>
              ← 体制表に戻る
            </Link>
          }
          description="毎日の体制表のベースになる時間帯と枠数を設定します。設定した内容は「シフト表から生成」ボタンで毎日の体制表に適用されます。"
          eyebrow="体制表"
          title="体制表テンプレート"
        />
      </div>

      <div className="scroll-panel-host shift-roster-page">
        <RosterTemplateEditor />
      </div>
    </AdminShell>
  );
}
