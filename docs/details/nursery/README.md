# 園管理 詳細設計（一覧）

園管理機能に関する画面詳細設計をまとめたディレクトリです。
全体の画面構成は `docs/screen-structure.md`、データ項目は `docs/data-design.md` を参照してください。

## ドキュメント一覧

| 画面 | ファイル | パス（アプリ） |
| --- | --- | --- |
| **一覧画面レイアウト（共通）** | [list-screen-layout.md](./list-screen-layout.md) | 職員・クラス管理で使用 |
| 園管理ハブ | [management.md](./management.md) | `/nursery` |
| クラス管理 | [classes.md](./classes.md) | `/nursery/classes` |
| 園情報・勤務区分（設定） | [nursery-settings.md](./nursery-settings.md) | `/nursery/settings` |
| 行事カレンダー | [nursery-calendar.md](./nursery-calendar.md) | `/nursery/calendar` |
| 職員管理 | [staff-management.md](./staff-management.md) | `/nursery/staff` |

## 関連ドキュメント

- `docs/details/home-screen-design.md` — 管理者 TOP からの導線
- `docs/details/login-screen-design.md` — 認証・招待
- `docs/business-flow.md` — 初期設定フロー
- `docs/permission-design.md` — 権限
