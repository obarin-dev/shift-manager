import { defineConfig, devices } from "@playwright/test";

// 開発中の dev サーバ (3000) と衝突しないよう E2E 専用ポートを使う。
// 同じポートだと reuseExistingServer によって古いコードに繋がりうる。
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  // vitest と住み分けるため e2e/ 配下のみを対象にする
  testDir: "./e2e",
  // 落ちたテストが他に影響しないよう各ファイルを並列実行
  fullyParallel: true,
  // CI では test.only の混入をエラーにする
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // 失敗時のみ証跡を残す（成功時に貯めてもノイズになる）
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // dev サーバを Playwright 側で起動する。手動起動前提にすると再現できない
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
