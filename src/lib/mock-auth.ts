export type UserRole = "admin" | "manager" | "staff";

export type MockAccount = {
  role: UserRole;
  roleLabel: string;
  email: string;
  password: string;
  displayName: string;
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    role: "admin",
    roleLabel: "管理者",
    email: "admin@example.com",
    password: "demo1234",
    displayName: "園管理者",
  },
  {
    role: "manager",
    roleLabel: "勤務表作成者",
    email: "manager@example.com",
    password: "demo1234",
    displayName: "勤務表担当者",
  },
  {
    role: "staff",
    roleLabel: "職員",
    email: "staff@example.com",
    password: "demo1234",
    displayName: "伊藤 誠",
  },
];

export function findMockAccount(email: string, password: string) {
  return MOCK_ACCOUNTS.find(
    (account) => account.email === email && account.password === password,
  );
}

export const HOME_CONTENT: Record<
  UserRole,
  {
    title: string;
    description: string;
    cards: Array<{ title: string; description: string; href?: string; iconPath: string }>;
  }
> = {
  admin: {
    title: "",
    description: "",
    cards: [
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
  },
  manager: {
    title: "勤務表作成をスムーズに進める",
    description:
      "希望休の確認、AIによるたたき台作成、配置チェックを行うための仮ホーム画面です。",
    cards: [
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
  },
  staff: {
    title: "自分の勤務と希望休を確認",
    description:
      "希望休の入力や公開済み勤務表の確認を行うための仮ホーム画面です。",
    cards: [
      {
        title: "希望休入力",
        description: "休みたい日や勤務希望を入力します。",
        iconPath: "M12 20h9M15.5 3.5a2.1 2.1 0 1 1 3 3L7 18l-4 1 1-4 11.5-11.5Z",
      },
      {
        title: "勤務表確認",
        description: "公開済みの勤務予定を確認します。",
        iconPath: "M8 2v4M16 2v4M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h8m-8 4h5",
      },
      {
        title: "お知らせ",
        description: "園からの連絡事項や変更点を確認します。",
        iconPath: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4",
      },
    ],
  },
};

export type TodaySpecialEvent = {
  time: string;
  label: string;
};

/** 開園・給食などの通常フローではなく、行事・イベントなど特別な予定のみ */
export const MOCK_TODAY_SPECIAL_EVENTS: TodaySpecialEvent[] = [
  { time: "9:30", label: "わくわく体育" },
  { time: "10:30", label: "避難訓練" },
  { time: "11:00", label: "誕生日会打ち合わせ" },
  { time: "12:30", label: "昼勉強会" },
  { time: "14:00", label: "こうちゃん療育" },
];
