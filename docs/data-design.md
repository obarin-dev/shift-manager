# データ設計

## 概要

このドキュメントは、保育園向け勤務表管理システムで扱う主要データを整理したものです。
画面構成で定義した「職員」「クラス」「勤務区分」「園カレンダー」「体制表」を中心に、必要な項目と関係を整理します。
（このリポジトリの現状では、DB に永続化されているのは `nursery / classroom / staff / user / shift_type / calendar_entry` のみです。）

**DB全体の俯瞰（ER図・実装順・用語整理）:** [db-structure.md](./db-structure.md)

## 主要データ

| データ名 | 役割 |
| --- | --- |
| 園 | 保育園の基本情報を管理する |
| ユーザー | ログイン認証と利用者の権限を管理する |
| 職員 | 保育士、看護師、調理員、事務などの職員情報を管理する |
| クラス | 0歳児、1歳児、2歳児などのクラス情報を管理する |
| 勤務区分（勤務区分マスタ） | 早番/日勤/遅番/延長などの勤務区分（`shift_type`） |
| 園カレンダー（休園・行事） | 休園日・行事・臨時開園（`calendar_entry`） |
| 体制表（日次） | `/api/roster` の JSON として日付単位に永続化（現状） |
| 配置基準 | モック（将来DB化） |
| 希望休 | モック（将来DB化） |
| 勤務表/勤務枠 | モック（当面は `mock-shift-schedule`） |
| 出力履歴 | 未実装（将来DB化） |

## データ関連図

```mermaid
erDiagram
    NURSERY ||--o{ USER : has
    NURSERY ||--o{ STAFF : has
    NURSERY ||--o{ CLASSROOM : has
    NURSERY ||--o{ SHIFT_TYPE : has
    NURSERY ||--o{ CALENDAR_ENTRY : has

    USER |o--o| STAFF : optional_link
    CLASSROOM |o--o| STAFF : main_staff (optional)
```

## テーブル設計

### 園

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 園ID |
| name | string | yes | 園名 |
| address | string | no | 所在地 |
| phone_number | string | no | 電話番号 |
| open_time | time | yes | 開園時間 |
| close_time | time | yes | 閉園時間 |
| extended_close_time | time | no | 延長保育の終了時間 |
| weekly_closed_weekdays | int[] | yes | 毎週休園の曜日（0=日 … 6=土）。default `[]` |
| close_on_public_holidays | boolean | yes | 国民の祝日を休園とする |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

勤務区分マスタは下記。休日・行事カレンダーは [holiday-and-calendar-data.md](./details/nursery/holiday-and-calendar-data.md) を参照（**`nursery_closed_day` は使わない**）。

### 勤務区分マスタ（園ごと）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | ID |
| nursery_id | string | yes | 園ID |
| code | enum | yes | `early`, `day`, `late`, `extended`, `other` |
| name | string | yes | 表示名（早番など） |
| start_time | time | yes | 区分の開始時刻 |
| end_time | time | yes | 区分の終了時刻 |
| sort_order | number | yes | 表示順 |
| color | string | yes | 表示色（デフォルト: #FEF08A） |
| is_active | boolean | yes | 有効か |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 園カレンダー予定（`calendar_entry`）

休日設定の休園日・行事カレンダーの全予定を**同一テーブル**で保持する。詳細は [holiday-and-calendar-data.md](./details/nursery/holiday-and-calendar-data.md)。

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | ID |
| nursery_id | string | yes | 園ID |
| entry_date | date | yes | 対象日 |
| entry_type | enum | yes | `closure`, `special_hours`, `event` |
| title | string | yes | 表示タイトル |
| repeats_annually | boolean | yes | 毎年同じ月日（`closure` 用。例: 元日）。default false |
| start_time | time | no | 行事の開始（event） |
| end_time | time | no | 行事の終了（event） |
| open_time | time | no | 臨時開園（special_hours） |
| close_time | time | no | 臨時閉園（special_hours） |
| extended_close_time | time | no | 臨時延長終了 |
| note | string | no | メモ |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### ユーザー

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | ユーザーID |
| nursery_id | string | yes | 園ID |
| staff_id | string | no | 紐づく職員ID |
| email | string | yes | ログイン用メールアドレス（職員は `staff_login_id` を使用する方針。詳細は `docs/details/nursery/staff-management.md`） |
| password_hash | string | yes | ハッシュ化したパスワード |
| role | enum | yes | `admin`, `manager`, `staff` |
| is_active | boolean | yes | 利用中かどうか |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 職員

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 職員ID |
| nursery_id | string | yes | 園ID |
| name | string | yes | 氏名 |
| name_kana | string | no | ふりがな |
| phone_number | string | no | 連絡先 |
| employment_type | enum | yes | `seikin`, `jokin`, `hijokin` |
| job_type | enum | yes | `nursery_teacher`, `nurse`, `cook`, `office`, `other` |
| has_nursery_teacher_license | boolean | yes | 保育士資格の有無 |
| staff_login_id | string | no | ログイン用職員ID（園内一意・6桁数字など） |
| work_availability_start | time | no | 働ける時間の開始（例: 07:00） |
| work_availability_end | time | no | 働ける時間の終了（例: 19:00）。この帯内なら早番・遅番などに配置可能 |
| can_work_early_shift | boolean | yes | （旧）早番対応可否 — UIは `work_availability_*` に統合予定 |
| can_work_late_shift | boolean | yes | （旧）遅番対応可否 |
| can_work_extended_care | boolean | yes | （旧）延長保育対応可否 |
| is_active | boolean | yes | 在籍中かどうか |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 職員が担当可能なクラス（staff.capable_class_ids）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| staff.capable_class_ids | string[] | yes | 職員が担当できるクラスIDの一覧 |

### クラス

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | クラスID |
| nursery_id | string | yes | 園ID |
| name | string | yes | クラス名 |
| age_group | enum | yes | `age_0`, `age_1`, `age_2`, `age_3`, `age_4`, `age_5`, `mixed` |
| child_count | number | yes | 園児数 |
| auxiliary_slots | Json | yes | 補助枠情報（UI/モック用） |
| other_staff_ids | string[] | yes | 主担当以外に割り当て可能な職員ID一覧（UI用） |
| main_staff_id | string | no | 主担当職員ID |
| note | string | no | 補足メモ |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 配置基準（未実装/将来）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 配置基準ID |
| nursery_id | string | yes | 園ID |
| age_group | enum | yes | 年齢区分 |
| children_per_staff | number | yes | 職員1人あたりの園児数 |
| requires_license | boolean | yes | 保育士資格者として数える必要があるか |
| minimum_staff_count | number | yes | 最低配置人数 |
| effective_from | date | yes | 適用開始日 |
| effective_to | date | no | 適用終了日 |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 希望休（未実装/将来）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 希望休ID |
| staff_id | string | yes | 職員ID |
| target_month | string | yes | 対象年月。例: `2026-06` |
| request_date | date | yes | 希望日 |
| request_type | enum | yes | `day_off`, `available`, `preferred_shift`, `unavailable_time` |
| start_time | time | no | 希望開始時刻 |
| end_time | time | no | 希望終了時刻 |
| shift_type | enum | no | `early`, `day`, `late`, `extended` |
| reason | string | no | 理由、メモ |
| status | enum | yes | `draft`, `submitted`, `approved`, `rejected` |
| submitted_at | datetime | no | 提出日時 |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 勤務表（未実装/モック）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 勤務表ID |
| nursery_id | string | yes | 園ID |
| target_month | string | yes | 対象年月。例: `2026-06` |
| status | enum | yes | `draft`, `checking`, `confirmed`, `published` |
| created_by_user_id | string | yes | 作成者ユーザーID |
| confirmed_at | datetime | no | 確定日時 |
| published_at | datetime | no | 公開日時 |
| note | string | no | 補足メモ |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 勤務枠（未実装/モック）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 勤務枠ID |
| shift_schedule_id | string | yes | 勤務表ID |
| staff_id | string | yes | 職員ID |
| classroom_id | string | no | 担当クラスID |
| work_date | date | yes | 勤務日 |
| start_time | time | yes | 開始時刻 |
| end_time | time | yes | 終了時刻 |
| break_minutes | number | yes | 休憩時間 |
| shift_type | enum | yes | `early`, `day`, `late`, `extended`, `off` |
| position | string | no | 担当ポジション |
| note | string | no | 日別メモ |
| created_at | datetime | yes | 作成日時 |
| updated_at | datetime | yes | 更新日時 |

### 配置チェック結果（未実装/将来）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | チェック結果ID |
| shift_schedule_id | string | yes | 勤務表ID |
| check_date | date | yes | チェック対象日 |
| classroom_id | string | no | クラスID |
| required_staff_count | number | yes | 必要職員数 |
| assigned_staff_count | number | yes | 配置済み職員数 |
| required_licensed_staff_count | number | no | 必要な保育士資格者数 |
| assigned_licensed_staff_count | number | no | 配置済み保育士資格者数 |
| status | enum | yes | `ok`, `warning`, `error` |
| message | string | no | チェック内容 |
| created_at | datetime | yes | 作成日時 |

### 出力履歴（未実装/将来）

| 項目名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string | yes | 出力履歴ID |
| shift_schedule_id | string | yes | 勤務表ID |
| output_type | enum | yes | `csv_import`, `csv_export`, `print` |
| layout_type | enum | no | `staff`, `manager`, `notice` |
| created_by_user_id | string | yes | 実行ユーザーID |
| file_name | string | no | ファイル名 |
| created_at | datetime | yes | 作成日時 |

## 主な制約

- 1つの園は複数の職員、クラス、配置基準、勤務表を持つ。
- 1人の職員は複数のクラスを担当可能にできる。
- 希望休は職員ごと、対象年月ごとに登録する。
- 勤務表は園ごと、対象年月ごとに作成する。
- 勤務枠は勤務表に紐づき、職員、勤務日、勤務時間を持つ。
- 配置チェックでは、クラス別の園児数と配置基準から必要職員数を算出する。
- 保育士資格が必要な配置では、`has_nursery_teacher_license` が `true` の職員のみを資格者として数える。

## ステータス定義

### 希望休ステータス

| ステータス | 意味 |
| --- | --- |
| draft | 下書き |
| submitted | 提出済み |
| approved | 承認済み |
| rejected | 却下 |

### 勤務表ステータス

| ステータス | 意味 |
| --- | --- |
| draft | 作成中 |
| checking | 配置チェック中 |
| confirmed | 確定済み |
| published | 職員へ公開済み |

### 配置チェックステータス

| ステータス | 意味 |
| --- | --- |
| ok | 問題なし |
| warning | 注意が必要 |
| error | 配置不足など修正が必要 |

## 今後検討する項目

- 年度途中で園児数が変わる場合の履歴管理
- 複数園を1アカウントで管理する場合のデータ構造
- 職員の有給休暇、欠勤、代休の管理
- 勤務表の自動作成に必要な条件データ
- CSV インポート、エクスポートの具体的な項目名
- 印刷レイアウトごとの表示項目
