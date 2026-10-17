import { expect, type Page } from "@playwright/test";

/**
 * スクリーンショットを撮る。
 *
 * dev サーバで動かすため、Next.js の開発ツール（<nextjs-portal> で描画される
 * 左下の丸いボタン）が写り込んでしまう。アプリ本体の UI ではないので
 * 撮影時のみ CSS で隠す。next.config.ts で devIndicators を切ると
 * 開発中も消えてしまうため、テスト側で対処している。
 *
 * またクライアント側で非同期取得する画面（体制表グリッドなど）は
 * 「読み込み中…」のまま撮れてしまい、レビューに使えない。
 * 撮影前にローディング表示が消えるのを待つ。
 */
export async function captureScreen(page: Page, name: string) {
  await expect(page.getByText("読み込み中…")).toBeHidden();

  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });

  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}
