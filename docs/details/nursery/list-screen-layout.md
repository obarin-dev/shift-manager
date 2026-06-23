# 園管理：一覧画面レイアウト（共通）

園管理配下の**一覧系画面**（職員管理・クラス管理など）で共通する UI レイアウトを定義します。
新規画面もこの構成を基本とします。

## 原則

1. **画面タイトル（AppHeader）と一覧パネルは別カード**として分ける。くっつけて1枚にしない。
2. **パンくず・タイトル・説明はスクロールしない**（`scroll-panel-host` の外）。
3. **一覧テーブル部分だけ**が縦スクロールする（クラス・職員が増えても操作行は見える）。
4. 件数と主操作ボタンは**一覧パネル内の1行目**に置く（左：件数、右：追加/新規登録）。

## 画面構造（DOM）

```text
AdminShell（scrollPanelLayout）
└ home-content.home-content--scroll-panel
   ├ nav.breadcrumb                    … 固定
   ├ AppHeader                         … 固定（白カード・タイトル「○○管理」）
   └ div.scroll-panel-host             … 残り高さを占有
      └ section.classes-panel.classes-panel--scroll-body
         ├ div.classes-panel__fixed     … 固定
         │  ├ ツールバー（件数 ｜ 主ボタン）
         │  └ （任意）検索など
         └ div.classes-panel__scroll-region  … ここだけ overflow: auto
            └ table（大きめ表示・thead sticky）
```

## 実装の分担

| 層 | 配置 | 例 |
| --- | --- | --- |
| `src/app/nursery/*/page.tsx` | パンくず、`AppHeader`、`scrollPanelLayout`、`scroll-panel-host` | `staff/page.tsx`, `classes/page.tsx` |
| `src/components/*/*-settings.tsx` | 一覧パネル（`classes-panel--scroll-body`）とモーダルのみ | `staff-management-settings.tsx`, `classes-settings.tsx` |

**避けること**: `*-settings.tsx` 内に `AppHeader` やパンくずを置かない（一覧とタイトルが1ブロックに見える）。

## ツールバー（件数・主操作）

| 位置 | 内容 | 表示例 |
| --- | --- | --- |
| 左 | 件数ラベル | `職員数：6名` / `クラス数：4件` |
| 右 | 主操作ボタン | `職員新規登録` / `クラスを追加` |

- ボタンは `classes-panel__toolbar .primary-button`（`font-weight: 600`）。
- 件数は `classes-panel__count`（muted・太字控えめ）。

## 一覧テーブル

- クラス管理: `classes-table classes-table--large`（行高・文字サイズを拡大）。
- 職員管理: 同パネル内スクロール（必要に応じて `--large` を共通化可）。
- テーブルヘッダーはスクロール時 **sticky**（`.classes-panel--scroll-body .classes-table thead th`）。

## CSS クラス一覧

| クラス | 用途 |
| --- | --- |
| `home-content--scroll-panel` | メイン列の高さをビューポートに合わせ、全体スクロールを抑止 |
| `scroll-panel-host` | ヘッダー下の残り領域を flex で確保 |
| `classes-panel--scroll-body` | 一覧用白パネル（パディング分割・内部スクロール） |
| `classes-panel__fixed` | ツールバー・検索など固定領域 |
| `classes-panel__scroll-region` | テーブルのみスクロール |

## 参照実装

- 職員管理: `src/app/nursery/staff/page.tsx` + `src/components/staff/staff-management-settings.tsx`
- クラス管理: `src/app/nursery/classes/page.tsx` + `src/components/classes/classes-settings.tsx`

## 関連ドキュメント

- [management.md](./management.md) — 園管理全体
- [staff-management.md](./staff-management.md) — 職員管理の業務仕様
- [classes.md](./classes.md) — クラス管理の業務仕様
