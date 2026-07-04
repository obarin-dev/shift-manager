"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SidebarNavItem = {
  label: string;
  href?: string;
  isActive?: boolean;
  icon?: ReactNode;
  kind?: "link" | "section" | "sub";
};

type AppSidebarProps = {
  brandTitle: string;
  brandSubtitle?: string;
  roleLabel?: string;
  displayName?: string;
  email?: string;
  navItems: SidebarNavItem[];
  footer?: ReactNode;
  defaultCollapsed?: boolean;
};

export function AppSidebar({
  brandTitle,
  brandSubtitle,
  roleLabel,
  displayName,
  email,
  navItems,
  footer,
  defaultCollapsed = false,
}: AppSidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={isCollapsed ? "app-sidebar is-collapsed" : "app-sidebar"}
      aria-label="サイドバー"
    >
      <div className="app-sidebar__brand">
        <div className="app-sidebar__brand-copy">
          <p className="eyebrow">{brandTitle}</p>
          {brandSubtitle ? <strong>{brandSubtitle}</strong> : null}
        </div>

        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          className="app-sidebar__toggle"
          onClick={() => setIsCollapsed((current) => !current)}
          type="button"
        >
          {isCollapsed ? (
            <span className="app-sidebar__toggle-menu" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <span className="app-sidebar__toggle-chevron" aria-hidden="true">
              {"<"}
            </span>
          )}
        </button>
      </div>

      <nav className="app-sidebar__nav" aria-label="主要メニュー">
        {navItems.map((item) => {
          if (item.kind === "section") {
            return (
              <div className="app-sidebar__section-label" key={`section-${item.label}`}>
                {item.label}
              </div>
            );
          }

          const linkClass = [
            "app-sidebar__link",
            item.kind === "sub" && "app-sidebar__link--sub",
            item.isActive && "is-active",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <a
              className={linkClass}
              href={item.href ?? "#"}
              key={`${item.label}-${item.href}`}
            >
              <span className="app-sidebar__link-icon" aria-hidden="true">
                {item.icon ?? <span className="app-sidebar__link-fallback" />}
              </span>
              <span className="app-sidebar__link-label">{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="app-sidebar__user-section">
        <div className="app-sidebar__user-card">
          <span className="app-sidebar__user-avatar" aria-hidden="true">
            <svg className="sidebar-svg-icon" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 20v-1a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          {roleLabel ? <span className="app-sidebar__user-role">{roleLabel}</span> : null}
          {displayName ? <strong>{displayName}</strong> : null}
          {email ? <span>{email}</span> : null}
        </div>

        <button
          className="app-sidebar__logout"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          <span className="app-sidebar__logout-icon" aria-hidden="true">
            <svg className="sidebar-svg-icon" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <span className="app-sidebar__logout-label">
            {isLoggingOut ? "ログアウト中..." : "ログアウト"}
          </span>
        </button>
      </div>

      {footer && !isCollapsed ? <div className="app-sidebar__footer">{footer}</div> : null}
    </aside>
  );
}
