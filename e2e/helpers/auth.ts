import type { Page } from "@playwright/test";

/**
 * シード済みデモアカウント（prisma/seed.ts と対応）。
 * パスワードは全アカウント共通で demo1234。
 */
export const DEMO_ACCOUNTS = {
  admin: { email: "admin@example.com", password: "demo1234" },
  manager: { email: "manager@example.com", password: "demo1234" },
  staff: { email: "staff@example.com", password: "demo1234" },
} as const;

export type DemoAccountKey = keyof typeof DEMO_ACCOUNTS;

/**
 * ログイン画面からフォーム送信までを行う。
 * 遷移先の検証は呼び出し側で行う（ロールによって遷移先が変わるため）。
 */
export async function login(
  page: Page,
  account: DemoAccountKey | { email: string; password: string },
) {
  const { email, password } =
    typeof account === "string" ? DEMO_ACCOUNTS[account] : account;

  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}
