# 基本設定 詳細設計

## 概要

園管理配下の **基本設定**（`/nursery/settings`）の詳細設計です。

園の基本情報、**保育時間**、**休日設定**、**勤務区分マスタ**を定義します。

**休日と行事のデータ設計（統合方針）:** [holiday-and-calendar-data.md](./holiday-and-calendar-data.md)

## 画面情報

| 項目 | 内容 |
| --- | --- |
| 画面名 | 基本設定 |
| パス | `/nursery/settings` |
| 親画面 | 園管理ハブ `/nursery` |
| 主な保存対象 | 園の基本情報、保育時間、定休曜日、休園日（`calendar_entry`）、勤務区分 |

## 含む（MVP）

- 園の基本情報：園名、所在地、電話番号
- 保育時間：開園・閉園・（延長がある場合）延長終了
- **休日設定**
  - **定休日（毎週）** → `nursery.weekly_closed_weekdays`
  - **休みの日リスト**（祝日・臨時休園など） → `calendar_entry`（`entry_type = closure`）
- 勤務区分マスタ：区分名、開始・終了、色、有効/無効

## 休日設定と行事カレンダー（データ）

**DBは1本（`calendar_entry`）+ 定休曜日（`nursery`）。画面は2つ。**

| 種類 | 保存先 | 休日設定 UI | 行事カレンダー UI |
| --- | --- | --- | --- |
| 毎週の定休日 | `nursery.weekly_closed_weekdays` | ○ | —（ルールとして自動反映） |
| 祝日・毎年の休園 | `calendar_entry`（`closure`, `repeats_annually`） | ○ | ○ 表示・編集可 |
| 臨時休園 | `calendar_entry`（`closure`） | ○ | ○ |
| 行事・臨時開園 | `calendar_entry`（`event` / `special_hours`） | — | ○ |

フロントの `NurseryRestSettings` / `NurseryClosedDay` は、上記をまとめた**表示用DTO**（モック: `src/lib/mock-nursery-info.ts`）。

## 含まない

- 行事・臨時開園の**月次UI**は `/nursery/calendar`（同一 `calendar_entry` を編集）

## API（実装状況）

| 機能 | 状態 |
| --- | --- |
| 園プロフィール・保育時間 | ○ `GET/PATCH /api/nursery/profile` |
| 勤務区分 | ○ `/api/shift-types` |
| 定休曜日・休園（`calendar_entry`） | ○ `/api/nursery/holiday-settings`（DB永続化） |

## 関連

- [holiday-and-calendar-data.md](./holiday-and-calendar-data.md)
- [nursery-calendar.md](./nursery-calendar.md)
- [staff-management.md](./staff-management.md)
