import { SidebarIcon } from "@/components/layout/sidebar-icon";

type NurseryHubCardProps = {
  title: string;
  description: string;
  iconPath: string;
};

export function NurseryHubCard({ title, description, iconPath }: NurseryHubCardProps) {
  return (
    <>
      <div className="nursery-hub-card__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="nursery-hub-card__icon" aria-hidden="true">
        <SidebarIcon path={iconPath} />
      </span>
    </>
  );
}
