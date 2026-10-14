import type { Page } from "@playwright/test";

/**
 * スクリーンショットを撮る。
 *
 * dev サーバで動かすため、Next.js の開発ツール（<nextjs-portal> で描画される
 * 左下の丸いボタン）が写り込んでしまう。アプリ本体の UI ではないので
 * 撮影時のみ CSS で隠す。next.config.ts で devIndicators を切ると
 * 開発中も消えてしまうため、テスト側で対処している。
 */
export async function captureScreen(page: Page, name: string) {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });

  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}
