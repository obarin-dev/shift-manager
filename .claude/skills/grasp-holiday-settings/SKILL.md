# grasp-holiday-settings

休園日判定の3つのソースとその合成ロジック。

## 全体像

ある日付が「休園日かどうか」は3つのソースを組み合わせて判定する。この複合ロジックが `isClosedDate()` に集約されており、シフト生成・カレンダー表示・体制表など複数箇所から参照される。

## 責務の分担

| ファイル | 責務 |
|---------|------|
| `holiday-settings.ts` | `isClosedDate()` の実装。3ソースを合成して休園日を判定 |
| `nursery-holiday-settings-db.ts` | `NurseryRestSettings` の取得・更新。`Nursery` テーブルと `CalendarEntry(closure)` を合わせて1つの設定オブジェクトとして返す |
| `japanese-public-holidays.ts` | 年ごとの祝日データをハードコードで保持。`getJapanesePublicHolidays(year)` で取得 |
| `mock-nursery-info.ts` | `NurseryRestSettings` / `NurseryClosedDay` の型定義 |

## 依存方向

```
shift-schedule-ai.ts（sanitizeAssignments）
calendar-entry-db.ts / カレンダー表示
  → holiday-settings.ts（isClosedDate）
    → japanese-public-holidays.ts（祝日データ）
nursery-holiday-settings-db.ts（getHolidaySettings）
  → Nursery テーブル + CalendarEntry(closure) テーブル
  → NurseryRestSettings（isClosedDate に渡す集約型）
```

## 3つの休園ソース

```
isClosedDate(dateKey, settings)
  ├── 1. 定休曜日: settings.weekly_closed_days に weekday が含まれるか
  ├── 2. 祝日休園: settings.close_on_public_holidays が true かつ japanese-public-holidays にある日
  └── 3. 個別休園日: settings.closed_days（CalendarEntry の closure 種別）に dateKey が含まれるか
          ├── repeats_annually: true → 月日が一致すれば毎年休園
          └── repeats_annually: false → その年月日だけ休園
```

いずれか1つでも該当すれば休園日。AND条件ではない。

## 重要な設計判断

**`NurseryRestSettings` は複数テーブルをまとめた集約型**
`Nursery.weekly_closed_weekdays` と `Nursery.close_on_public_holidays` は `Nursery` テーブルに、個別休園日は `CalendarEntry(entry_type="closure")` テーブルに保存されている。`getHolidaySettings()` がこれを1つの `NurseryRestSettings` オブジェクトに統合して返すため、呼び出し側は保存場所を意識しない。

**更新はトランザクションで closure 全件置き換え**
`updateHolidaySettings()` は closure 種別の `CalendarEntry` を全件削除してから再作成する。差分更新ではなく全置き換えのため、ID が変わることに注意。

**祝日データはハードコード（API 非依存）**
`japanese-public-holidays.ts` に 2025〜2027 年分の祝日が静的に定義されている。外部 API に依存しない代わりに、新年度の祝日は手動でファイルを更新する必要がある。`PUBLIC_HOLIDAY_YEARS` に対応年が列挙されており、範囲外の年は空配列が返る（= 祝日休園しない扱いになる）。

**シフト生成では `isClosedDate()` が最優先**
`shift-schedule-ai.ts` の `sanitizeAssignments()` が `isClosedDate()` を呼び、休園日は全職員強制的に `"off"` にする。AI の出力よりも休園日判定が優先される。

## 用語定義

| 用語 | 意味 |
|------|------|
| `NurseryRestSettings` | 3ソースをまとめた休園設定の集約型 |
| `NurseryClosedDay` | 個別休園日1件。`date`・`title`・`repeats_annually` を持つ |
| `weekly_closed_days` | 定休曜日の数値配列（0=日〜6=土） |
| `close_on_public_holidays` | 国民の祝日を休園とするフラグ |
| `repeats_annually` | true なら月日が一致する毎年、false ならその日付のみ |

## 注意点

- 対応年（現在 2025〜2027）以外の年は祝日データが空になり、祝日休園フラグが true でも休園にならない。新年度対応時は `japanese-public-holidays.ts` へのデータ追加が必要。
- `CalendarEntry` には `closure`（休園）以外に `special_hours`（特別時間）と `event`（行事）もある。`getHolidaySettings()` は `closure` 種別のみ取得する。`isClosedDate()` への影響は `closure` だけで、`event` は影響しない。
- `isClosedDate()` に渡す `settings` が `null` の場合は常に `false` を返す（休園なし扱い）。DB 取得失敗時の挙動に注意。
