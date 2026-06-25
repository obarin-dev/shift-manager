import Link from "next/link";
import { requireAdminOrManager } from "@/lib/page-auth";
import { buildAdminHref } from "@/lib/admin-navigation";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { NurseryHubCard } from "@/components/nursery/nursery-hub-card";

type NurseryHubCardConfig = {
  title: string;
  description: string;
  path: string;
  iconPath: string;
};

const NURSERY_HUB_DESCRIPTION =
  "園情報、クラス管理、職員管理の各設定へ進む一覧ページです。勤務表づくりの土台になるデータを、ここから管理します。";

const NURSERY_HUB_CARDS: NurseryHubCardConfig[] = [
  {
    title: "基本設定",
    description: "園名、保育時間、休日設定、勤務区分を設定します。",
    path: "/nursery/settings",
    iconPath:
      "M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  },
  {
    title: "行事カレンダー",
    description: "行事、休園日、臨時の開園時間をカレンダーに登録します。",
    path: "/nursery/calendar",
    iconPath:
      "M7 2v2M17 2v2M5 7h14M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5Z",
  },
  {
    title: "クラス管理",
    description: "クラス名、年齢区分、園児数、担当職員を管理します。",
    path: "/nursery/classes",
    iconPath: "M5 5h14M5 12h14M5 19h14M8 5v14M16 5v14",
  },
  {
    title: "職員管理",
    description: "職員の登録・一覧と、QR・招待URL によるアカウント招待を管理します。",
    path: "/nursery/staff",
    iconPath:
      "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6",
  },
];

export default async function NurseryPage() {
  const { account } = await requireAdminOrManager();
  const role = account.role;
  const nurseryName = await getPrimaryNurseryName();

  return (
    <AdminShell activeNav="nursery" account={account} role={role}>
      <AppHeader
        actions={
          account?.roleLabel ? (
            <span className="app-header__chip">{account.roleLabel}</span>
          ) : null
        }
        description={NURSERY_HUB_DESCRIPTION}
        eyebrow="園管理"
        title={nurseryName}
      />

      <section className="nursery-hub-grid" aria-label="園管理メニュー">
        {NURSERY_HUB_CARDS.map((card) => (
          <Link
            className="home-card nursery-hub-card"
            href={buildAdminHref(card.path, role)}
            key={card.path}
          >
            <NurseryHubCard
              description={card.description}
              iconPath={card.iconPath}
              title={card.title}
            />
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
