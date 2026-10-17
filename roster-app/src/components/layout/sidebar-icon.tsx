type SidebarIconProps = {
  path: string;
};

export function SidebarIcon({ path }: SidebarIconProps) {
  return (
    <svg className="sidebar-svg-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
