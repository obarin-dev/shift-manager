import type { UserRole } from "@/lib/auth-session";

export type AdminNavKey = "home" | "shifts" | "roster" | "requests" | "nursery";
export type NurserySubNavKey = "settings" | "calendar" | "classes" | "staff";

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  path: string | null;
  iconPath: string;
};

export type NurserySubNavItem = {
  key: NurserySubNavKey;
  label: string;
  path: string;
  iconPath: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "home",
    label: "ホーム",
    path: "/home",
    iconPath: "M3 10.5L12 3l9 7.5M6 9.5V21h12V9.5",
  },
  {
    key: "requests",
    label: "希望一覧",
    path: "/requests",
    iconPath:
      "M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h3m2 0h3m-8 4h8",
  },
  {
    key: "shifts",
    label: "勤務表作成",
    path: "/shifts",
    iconPath:
      "M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h10.9A1.6 1.6 0 0 1 17.5 3.5L20 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5ZM8 11h8M8 15h8M8 7h4",
  },
  {
    key: "roster",
    label: "体制表作成",
    path: "/roster",
    iconPath: "M5 5h14M5 12h14M5 19h14M8 5v14M16 5v14",
  },
  {
    key: "nursery",
    label: "園管理",
    path: "/nursery",
    iconPath:
      "M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  },
];

export const NURSERY_SUB_NAV_ITEMS: NurserySubNavItem[] = [
  {
    key: "settings",
    label: "基本設定",
    path: "/nursery/settings",
    iconPath:
      "M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  },
  {
    key: "calendar",
    label: "行事カレンダー",
    path: "/nursery/calendar",
    iconPath:
      "M7 2v2M17 2v2M5 7h14M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5Z",
  },
  {
    key: "classes",
    label: "クラス管理",
    path: "/nursery/classes",
    iconPath: "M5 5h14M5 12h14M5 19h14M8 5v14M16 5v14",
  },
  {
    key: "staff",
    label: "職員管理",
    path: "/nursery/staff",
    iconPath:
      "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6",
  },
];

export function buildAdminHref(path: string, _role?: UserRole) {
  return path;
}

export function resolveAdminNavHref(path: string | null, _role?: UserRole) {
  if (!path) {
    return "#";
  }

  return path;
}
