import type { ReactNode } from "react";
import { ADMIN_NAV_ITEMS, resolveAdminNavHref, type AdminNavKey } from "@/lib/admin-navigation";
import type { LightAccount } from "@/lib/page-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarIcon } from "@/components/layout/sidebar-icon";

type RosterShellProps = {
  activeNav: AdminNavKey;
  account: LightAccount;
  scrollPanelLayout?: boolean;
  children: ReactNode;
};

/**
 * 本体のAdminShellの代わりに使う、体制表アプリ専用の簡易シェル。
 * AdminShellは通知件数・希望申請未対応件数のバッジ表示のために
 * notification-db / staff-request-db を呼んでいるが、それらは
 * 体制表と無関係のドメインなのでここでは持ち込まない(バッジなしで表示)。
 */
export function RosterShell({
  activeNav,
  account,
  scrollPanelLayout = false,
  children,
}: RosterShellProps) {
  const navItems = [
    {
      label: "ホーム",
      href: resolveAdminNavHref("/home"),
      isActive: false,
      icon: <SidebarIcon path={ADMIN_NAV_ITEMS[0]!.iconPath} />,
    },
    { label: "管理者", kind: "section" as const },
    ...ADMIN_NAV_ITEMS.slice(1).map((item) => ({
      label: item.label,
      href: resolveAdminNavHref(item.path),
      isActive: item.key === activeNav,
      icon: <SidebarIcon path={item.iconPath} />,
    })),
  ];

  return (
    <main className="home-page">
      <section className="home-shell">
        <div className="home-layout">
          <AppSidebar
            brandTitle="Shift Manager"
            displayName={account.email}
            email={account.email}
            navItems={navItems}
            roleLabel={account.roleLabel}
          />

          <div
            className={
              scrollPanelLayout ? "home-content home-content--scroll-panel" : "home-content"
            }
          >
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
