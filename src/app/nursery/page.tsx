import Link from "next/link";
import { buildAdminHref } from "@/lib/admin-navigation";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import { MOCK_NURSERY_HUB_DESCRIPTION, NURSERY_HUB_CARDS } from "@/lib/mock-nursery";
import { requireAuth } from "@/lib/page-auth";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppHeader } from "@/components/layout/app-header";
import { NurseryHubCard } from "@/components/nursery/nursery-hub-card";

export default async function NurseryPage() {
  const { account } = await requireAuth();
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
        description={MOCK_NURSERY_HUB_DESCRIPTION}
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
