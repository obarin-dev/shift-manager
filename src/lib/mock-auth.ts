import type { UserRole } from "@/lib/auth-session";

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
