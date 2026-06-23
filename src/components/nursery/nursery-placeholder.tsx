import Link from "next/link";
import { buildAdminHref } from "@/lib/admin-navigation";
import type { UserRole } from "@/lib/auth-session";
import type { AuthAccount } from "@/lib/user-db";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";

type NurseryPlaceholderProps = {
  title: string;
  role: UserRole;
  account?: AuthAccount;
};

export function NurseryPlaceholder({ title, role, account }: NurseryPlaceholderProps) {

  return (
    <AdminShell activeNav="nursery" account={account} role={role}>
      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description="この画面は準備中です。園管理ハブから他の設定項目を確認できます。"
        eyebrow="園管理"
        title={title}
      />

      <section className="nursery-placeholder">
        <p>入力フォームや一覧は今後実装します。</p>
        <Link className="secondary-link" href={buildAdminHref("/nursery", role)}>
          園管理に戻る
        </Link>
      </section>
    </AdminShell>
  );
}
