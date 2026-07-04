import type { ReactNode } from "react";
import {
  ADMIN_NAV_ITEMS,
  NURSERY_SUB_NAV_ITEMS,
  type AdminNavKey,
  type NurserySubNavKey,
  resolveAdminNavHref,
} from "@/lib/admin-navigation";
import type { UserRole } from "@/lib/auth-session";
import type { AuthAccount } from "@/lib/user-db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarIcon } from "@/components/layout/sidebar-icon";

type AdminShellProps = {
  role: UserRole;
  activeNav: AdminNavKey;
  activeStaffNav?: "requests" | "shifts";
  activeNurseryNav?: NurserySubNavKey;
  account?: AuthAccount;
  /** 一覧パネル内だけスクロールさせる画面向け */
  scrollPanelLayout?: boolean;
  children: ReactNode;
};

export function AdminShell({
  role,
  activeNav,
  activeStaffNav,
  activeNurseryNav,
  account,
  scrollPanelLayout = false,
  children,
}: AdminShellProps) {
  const staffNavItems = [
    {
      label: "出勤希望",
      href: "/staff/requests",
      isActive: activeStaffNav === "requests",
      icon: <SidebarIcon path="M12 20h9M15.5 3.5a2.1 2.1 0 1 1 3 3L7 18l-4 1 1-4 11.5-11.5Z" />,
    },
    {
      label: "勤務表",
      href: "/staff/shifts",
      isActive: activeStaffNav === "shifts",
      icon: <SidebarIcon path="M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h8m-8 4h5" />,
    },
  ];

  const nurserySubItems = NURSERY_SUB_NAV_ITEMS.map((item) => ({
    label: item.label,
    href: item.path,
    isActive: item.key === activeNurseryNav,
    icon: <SidebarIcon path={item.iconPath} />,
    kind: "sub" as const,
  }));

  let navItems;

  if (role === "staff") {
    const homeItem = ADMIN_NAV_ITEMS[0];
    navItems = [
      {
        label: homeItem.label,
        href: resolveAdminNavHref(homeItem.path, role),
        isActive: activeNav === homeItem.key,
        icon: <SidebarIcon path={homeItem.iconPath} />,
      },
      ...staffNavItems,
    ];
  } else {
    navItems = ADMIN_NAV_ITEMS.flatMap((item) => {
      const base = {
        label: item.label,
        href: resolveAdminNavHref(item.path, role),
        isActive: !activeStaffNav && item.key === activeNav,
        icon: <SidebarIcon path={item.iconPath} />,
      };

      if (item.key === "nursery" && activeNav === "nursery") {
        return [base, ...nurserySubItems];
      }

      return [base];
    });
  }

  return (
    <main className="home-page">
      <section className="home-shell">
        <div className="home-layout">
          <AppSidebar
            brandTitle="Shift Manager"
            displayName={account?.displayName}
            email={account?.email}
            navItems={navItems}
            roleLabel={account?.roleLabel}
          />

          <div
            className={
              scrollPanelLayout
                ? "home-content home-content--scroll-panel"
                : "home-content"
            }
          >
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
