import { SidebarIcon } from "@/components/layout/sidebar-icon";

type HomeFeatureCardProps = {
  title: string;
  description: string;
  iconPath: string;
};

export function HomeFeatureCard({ title, description, iconPath }: HomeFeatureCardProps) {
  return (
    <>
      <span className="home-card__icon" aria-hidden="true">
        <SidebarIcon path={iconPath} />
      </span>
      <div className="home-card__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </>
  );
}
