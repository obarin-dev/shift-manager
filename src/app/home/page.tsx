import Link from "next/link";
import { buildAdminHref } from "@/lib/admin-navigation";
import { listCalendarEntries, getTodaySpecialEvents, toDateKey } from "@/lib/calendar-entry-db";
import { requireAuth } from "@/lib/page-auth";
import { HomeFeatureCard } from "@/components/home/home-feature-card";
import { StaffRequestAlert } from "@/components/home/staff-request-alert";
import { TodayScheduleHeader } from "@/components/home/today-schedule-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarIcon } from "@/components/layout/sidebar-icon";
import { DailyRosterGrid } from "@/components/roster/daily-roster-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import { listAdminStaffRequestAlerts } from "@/lib/staff-request-db";
import type { UserRole } from "@/lib/auth-session";
import type { ReactNode } from "react";

type CardConfig = {
  title: string;
  description: string;
  href?: string;
  iconPath: string;
};

type NavItemConfig = {
  label: string;
  icon: ReactNode;
};

const HOME_CARDS: Record<UserRole, CardConfig[]> = {
  admin: [
    {
      title: "勤務表作成",
      description: "希望休を踏まえて勤務表のたたき台を作成し、確定まで進めます。",
      href: "/shifts",
      iconPath:
        "M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h10.9A1.6 1.6 0 0 1 17.5 3.5L20 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5ZM8 11h8M8 15h8M8 7h4",
    },
    {
      title: "体制表作成",
      description: "クラス別・時間帯別の職員配置を確認し、体制表として整えます。",
      href: "/roster",
      iconPath: "M5 5h14M5 12h14M5 19h14M8 5v14M16 5v14",
    },
    {
      title: "園管理",
      description: "園情報、クラス、職員の登録・招待などを管理します。",
      href: "/nursery",
      iconPath:
        "M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    },
  ],
  manager: [
    {
      title: "希望休一覧",
      description: "提出状況を確認し、不備がないかをチェックします。",
      iconPath: "M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h3m2 0h3m-8 4h8",
    },
    {
      title: "勤務表作成",
      description: "AIで勤務表案を作成し、必要に応じて修正します。",
      iconPath:
        "M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h10.9A1.6 1.6 0 0 1 17.5 3.5L20 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5ZM8 11h8M8 15h8M8 7h4",
    },
    {
      title: "配置チェック",
      description: "資格者不足や配置不足の警告を確認します。",
      iconPath: "M4 12l5 5L20 6",
    },
  ],
  staff: [
    {
      title: "希望休入力",
      description: "休みたい日や勤務希望を入力します。",
      href: "/staff/requests",
      iconPath: "M12 20h9M15.5 3.5a2.1 2.1 0 1 1 3 3L7 18l-4 1 1-4 11.5-11.5Z",
    },
    {
      title: "勤務表確認",
      description: "公開済みの勤務予定を確認します。",
      href: "/staff/shifts",
      iconPath: "M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h8m-8 4h5",
    },
    {
      title: "お知らせ",
      description: "園からの連絡事項や変更点を確認します。",
      iconPath: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4",
    },
  ],
};

const NAV_ITEMS: Record<Exclude<UserRole, "admin">, NavItemConfig[]> = {
  manager: [
    {
      label: "ホーム",
      icon: <SidebarIcon path="M3 10.5L12 3l9 7.5M6 9.5V21h12V9.5" />,
    },
    {
      label: "希望休一覧",
      icon: <SidebarIcon path="M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h3m2 0h3m-8 4h8" />,
    },
    {
      label: "勤務表作成",
      icon: (
        <SidebarIcon path="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h10.9A1.6 1.6 0 0 1 17.5 3.5L20 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5ZM8 11h8M8 15h8M8 7h4" />
      ),
    },
    {
      label: "配置チェック",
      icon: <SidebarIcon path="M4 12l5 5L20 6" />,
    },
    {
      label: "公開設定",
      icon: <SidebarIcon path="M12 3v18M4 7h16M4 17h16M5 7a7 7 0 0 0 14 0M5 17a7 7 0 0 1 14 0" />,
    },
  ],
  staff: [
    {
      label: "ホーム",
      icon: <SidebarIcon path="M3 10.5L12 3l9 7.5M6 9.5V21h12V9.5" />,
    },
    {
      label: "出勤希望",
      icon: <SidebarIcon path="M12 20h9M15.5 3.5a2.1 2.1 0 1 1 3 3L7 18l-4 1 1-4 11.5-11.5Z" />,
    },
    {
      label: "勤務表",
      icon: <SidebarIcon path="M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h8m-8 4h5" />,
    },
  ],
};

function HomeCards({ role, cards }: { role: UserRole; cards: CardConfig[] }) {
  return (
    <section className="home-grid" aria-label="機能一覧">
      {cards.map((card) => {
        if (card.href) {
          return (
            <Link
              className="home-card"
              href={buildAdminHref(card.href, role)}
              key={card.title}
            >
              <HomeFeatureCard
                description={card.description}
                iconPath={card.iconPath}
                title={card.title}
              />
            </Link>
          );
        }

        return (
          <article className="home-card" key={card.title}>
            <HomeFeatureCard
              description={card.description}
              iconPath={card.iconPath}
              title={card.title}
            />
          </article>
        );
      })}
    </section>
  );
}


export default async function HomePage() {
  const { account } = await requireAuth();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();
  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const headerActions = account?.roleLabel ? (
    <span className="app-header__chip">{account.roleLabel}</span>
  ) : null;

  const todayKey = toDateKey(new Date());
  let todayScheduleItems: ReturnType<typeof getTodaySpecialEvents> = [];
  try {
    const entries = await listCalendarEntries({ from: todayKey, to: todayKey });
    todayScheduleItems = getTodaySpecialEvents(entries);
  } catch {
    // DB 未接続時は空表示
  }

  if (role === "admin") {
    let staffRequestAlerts: Awaited<ReturnType<typeof listAdminStaffRequestAlerts>> = {
      total: 0,
      requests: [],
    };
    try {
      staffRequestAlerts = await listAdminStaffRequestAlerts(account.nurseryId);
    } catch {
      // 出勤希望アラートは補助情報なので、失敗してもホーム表示は継続する
    }

    return (
      <AdminShell
        activeNav="home"
        account={account}
        role={role}
        scrollPanelLayout
      >
        <TodayScheduleHeader
          actions={headerActions}
          dateLabel={todayLabel}
          items={todayScheduleItems}
        />
        <StaffRequestAlert
          requests={staffRequestAlerts.requests}
          total={staffRequestAlerts.total}
        />
        <DailyRosterGrid
          className="home-roster-panel"
          nurseryName={nurseryName}
          readOnly
          showEvents={false}
        />
      </AdminShell>
    );
  }

  const navItems = NAV_ITEMS[role].map((item, index) => ({
    label: item.label,
    href: index === 0 ? "/home" : index === 1 ? "/staff/requests" : "/staff/shifts",
    isActive: index === 0,
    icon: item.icon,
  }));

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

          <div className="home-content">
            <AppHeader
              actions={headerActions}
              description={
                role === "staff"
                  ? "希望休の入力や公開済み勤務表の確認ができます。"
                  : role === "manager"
                    ? "勤務表の作成・修正や希望休の確認ができます。"
                    : "勤務表・体制表の管理や園の設定を行います。"
              }
              eyebrow="ホーム"
              title="ようこそ"
            />
            <HomeCards cards={HOME_CARDS[role]} role={role} />
          </div>
        </div>
      </section>
    </main>
  );
}
