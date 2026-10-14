import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { captureScreen } from "./helpers/screenshot";

test.describe("ログイン画面", () => {
  test("ログインフォームが表示される", async ({ page }) => {
    await page.goto("/login");

    // 見出し・入力欄・送信ボタンが揃っていることを確認
    await expect(page.getByRole("heading", { name: "Shift Manager" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();

    // Claude がレビューするためのスクリーンショットを保存
    await captureScreen(page, "login");
  });

  test("admin でログインすると /nursery に遷移する", async ({ page }) => {
    await login(page, "admin");

    // admin / manager は園情報ハブへ飛ぶ（login-form.tsx の分岐）
    await expect(page).toHaveURL(/\/nursery$/);
    await expect(page.getByRole("heading", { name: "基本設定" })).toBeVisible();

    await captureScreen(page, "nursery-admin");
  });

  test("staff でログインすると /home に遷移する", async ({ page }) => {
    await login(page, "staff");

    // staff は /nursery の権限がないためダッシュボードへ
    await expect(page).toHaveURL(/\/home$/);

    await captureScreen(page, "home-staff");
  });

  test("誤ったパスワードではエラーが表示され遷移しない", async ({ page }) => {
    await login(page, { email: "admin@example.com", password: "wrong-password" });

    // getByRole("alert") は Next.js のルートアナウンサー
    // (__next-route-announcer__) も拾うため、文言で特定する
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません。"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
