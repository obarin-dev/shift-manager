import Link from "next/link";
import { buildAdminHref } from "@/lib/admin-navigation";
import { listCalendarEntries } from "@/lib/calendar-entry-db";
import { HOME_CONTENT } from "@/lib/mock-auth";
import { getTodaySpecialEvents, toDateKey } from "@/lib/mock-nursery-info";
import { requireAuth } from "@/lib/page-auth";
import { HomeFeatureCard } from "@/components/home/home-feature-card";
import { TodayScheduleHeader } from "@/components/home/today-schedule-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarIcon } from "@/components/layout/sidebar-icon";
import { DailyRosterGrid } from "@/components/roster/daily-roster-grid";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import {
  listAdminStaffRequestAlerts,
  type AdminStaffRequestAlert,
} from "@/lib/staff-request-db";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/mock-auth";

type NavItemConfig = {
  label: string;
  icon: ReactNode;
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

function HomeCards({
  role,
  cards,
}: {
  role: UserRole;
  cards: (typeof HOME_CONTENT)[UserRole]["cards"];
}) {
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

function StaffRequestAlert({
  requests,
  total,
}: {
  requests: AdminStaffRequestAlert[];
  total: number;
}) {
  if (total === 0) {
    return null;
  }

  return (
    <section className="staff-request-alert" aria-label="出勤希望アラート">
      <div className="staff-request-alert__heading">
        <span className="staff-request-alert__icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2>出勤希望が提出されています</h2>
          <p>{total}件の提出があります。勤務表作成前に確認してください。</p>
        </div>
        <Link className="staff-request-alert__link" href="/requests">
          希望一覧を見る
        </Link>
      </div>

      <div className="staff-request-alert__list">
        {requests.map((request) => (
          <article className="staff-request-alert__item" key={request.id}>
            <strong>{request.staffName}</strong>
            <span>
              {request.date} / {request.type} / {request.time}
            </span>
            {request.memo ? <small>{request.memo}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { account } = await requireAuth();
  const role = account.role;
  const content = HOME_CONTENT[role];
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
              description={content.description}
              eyebrow="仮ホーム画面"
              title={content.title}
            />
            <HomeCards cards={content.cards} role={role} />
          </div>
        </div>
      </section>
    </main>
  );
}
