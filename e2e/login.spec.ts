import { test, expect } from "@playwright/test";

test.describe("ログイン画面", () => {
  test("ログインフォームが表示される", async ({ page }) => {
    await page.goto("/login");

    // 見出し・入力欄・送信ボタンが揃っていることを確認
    await expect(page.getByRole("heading", { name: "Shift Manager" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();

    // Claude がレビューするためのスクリーンショットを固定パスに保存
    await page.screenshot({
      path: "e2e/screenshots/login.png",
      fullPage: true,
    });
  });
});
