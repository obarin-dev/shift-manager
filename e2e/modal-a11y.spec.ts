import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("完了モーダルのキーボード操作", () => {
  test("Escape で閉じられる", async ({ page }) => {
    await login(page, "admin");

    const modal = page.getByRole("dialog", { name: "初期設定が完了しました！" });
    await expect(modal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("Tab でフォーカスがモーダル外へ出ない", async ({ page }) => {
    await login(page, "admin");

    const modal = page.getByRole("dialog", { name: "初期設定が完了しました！" });
    await expect(modal).toBeVisible();

    // モーダル内の要素数より多く Tab を押しても、外に出ないことを確認する
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      const insideModal = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(insideModal, `Tab ${i + 1}回目でフォーカスが外に出た`).toBe(true);
    }
  });

  test("開いた直後、フォーカスがモーダル内にある", async ({ page }) => {
    await login(page, "admin");

    await expect(
      page.getByRole("dialog", { name: "初期設定が完了しました！" }),
    ).toBeVisible();

    const insideModal = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(insideModal).toBe(true);
  });
});
