# grasp-staff-request

スタッフが提出する勤務希望申請の提出・承認・シフトマージまでのフロー。

## 全体像

スタッフが「休みたい日」「出勤したい日」「時間を相談したい日」を事前に申請し、管理者が承認した内容をシフト生成後に上書きマージする仕組み。AI へのプロンプトには含めず、生成結果の後処理として適用する設計。

## 責務の分担

| ファイル | 責務 |
|---------|------|
| `staff-request-db.ts` | StaffRequest の CRUD・スタッフ別グループ取得・月次絞り込み |
| `staff-request-shift-mapper.ts` | 申請内容を ShiftSlot の `shift_type` 値に変換し、assignments に上書きマージ |
| `/app/staff/requests` | スタッフが申請を提出・編集するページ |
| `/app/requests` | 管理者が申請一覧を確認するページ |
| `/app/api/staff-requests` | 申請の作成・更新・削除 API |

## 依存方向

```
shift-schedule-ai.ts（生成後処理）
  → staff-request-db.ts（月次グループ取得）
  → staff-request-shift-mapper.ts（assignments に上書きマージ）
    → shift-schedule-options.ts（ShiftCellValue 型）
```

## 重要な設計判断

**申請は AI プロンプトに渡さずに後処理でマージする**
承認済み申請を Gemini のプロンプトに含めると、AI が他の制約と矛盾した出力をするリスクがあるため、生成後に `mergeStaffRequestsIntoAssignments()` で確定的に上書きする方針を取っている。AI の出力より申請内容が常に優先される。

**ステータスは3値で管理するが、マージ対象はステータス問わず全件**
`status` は `submitted`（提出済み）/ `approved`（承認）/ `needs_review`（要確認）の3種。ただし `mergeStaffRequestsIntoAssignments()` はステータスでフィルタせず全申請をマージする。承認フローは管理者の確認UI用であり、マージの可否判断には使っていない。

**`staffId` の解決に2段階のフォールバックがある**
`StaffRequest.staff_id`（直接紐付け）が null の場合、`user.staff.id`（ユーザー経由）にフォールバックする。スタッフアカウントとユーザーアカウントが別途管理されているため。`resolveRequestStaffId()` がこの解決を担う。

**申請タイプの日本語ラベルを DB 値の変換キーに使う**
`StaffRequestTypeLabel`（`"休み希望"` / `"出勤希望"` / `"時間相談"`）がアプリ内の型であり、`TYPE_TO_DB` / `TYPE_FROM_DB` マップで DB の enum 値（`day_off` など）と相互変換する。UI と DB の間で日本語ラベルを型として使うパターン。

## 用語定義

| 用語 | 意味 |
|------|------|
| `StaffRequestTypeLabel` | `"休み希望"` / `"出勤希望"` / `"時間相談"` の日本語型 |
| `StaffRequestStatusLabel` | `"提出済み"` / `"承認"` / `"要確認"` の日本語型 |
| `AdminStaffRequestGroup` | スタッフ1人分の申請をまとめたグループ型。シフト生成時のマージ単位 |
| `time_preference` | 申請時間帯の自由記述（`"早番希望"` / `"午前のみ"` など）。`mapRequestToShiftType()` で shift_type に変換される |
| `mergeStaffRequestsIntoAssignments()` | AI 生成後の assignments に申請内容を上書きマージする関数 |

## 注意点

- `time_preference` の文字列（`"早番希望"` / `"午前のみ"` / `"遅番不可"` など）は `mapRequestToShiftType()` でハードコードのパターンマッチをしている。新しい時間帯表現を追加した場合は同関数の分岐も更新が必要。
- ステータスが `submitted` のままでも全申請がシフトにマージされる。「要確認」にしても自動的にマージ除外にはならない。
- `updateStaffRequest()` は更新時に `status` を `submitted` にリセットする。管理者が承認後にスタッフが編集すると承認が取り消される。
- 申請の削除は `owner`（`nurseryId` + `userId`）チェックを通すため、他のスタッフの申請は削除できない。
