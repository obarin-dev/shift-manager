import type { ReactNode } from "react";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AppHeader({
  eyebrow,
  title,
  description,
  actions,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>

        {actions ? <div className="app-header__actions">{actions}</div> : null}
      </div>

      {description ? <p className="app-header__description">{description}</p> : null}
    </header>
  );
}
