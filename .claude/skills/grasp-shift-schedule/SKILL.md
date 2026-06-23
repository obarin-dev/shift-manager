# grasp-shift-schedule

月次シフト表の生成・管理・公開フローを担うコアドメイン。

## 全体像

ShiftSchedule は「ある保育園のある月のシフト表」を表すエンティティ。管理者が AI でたたき台を生成し、人が修正・確認した後に公開する。公開後はスナップショットをスタッフが閲覧する。ライブデータとスタッフ閲覧用データを分離することで、確定前の編集中データがスタッフに見えないようにしている。

## 責務の分担

| ファイル | 責務 |
|---------|------|
| `shift-schedule-db.ts` | ShiftSchedule・ShiftSlot の DB CRUD のみ。ビジネスロジックは持たない |
| `shift-schedule-ai.ts` | AI生成の全オーケストレーション。職員・シフト区分・休園日・行事を集約してプロンプトを構築し、Gemini を呼び出し、結果を検証・補完してスタッフ希望をマージする |
| `mock-shift-schedule.ts` | ルールベースのフォールバック生成ロジックと、`target_month` 文字列のパースや日付キー生成などのユーティリティ |
| `shift-schedule-options.ts` | shift_type 値の正規化（不正値を `"off"` に変換） |
| `shift-schedule-class-sections.ts` | 日次体制表（RosterSheet）向けのクラス別セクション構築 |

## 依存方向

`shift-schedule-ai.ts` がほぼすべてに依存する（スタッフ・シフト区分・カレンダー・休園設定・スタッフ希望）。逆に他のモジュールから shift-schedule-ai.ts を呼ぶのは API route `/api/shift-schedules/generate` のみ。

## 重要な設計判断

**ShiftSlot.shift_type には UUID を入れる**
`shift_type` カラムに入る値は `"off"`（休み）または `ShiftType` レコードの `id`（UUID）。`ShiftTypeCode` enum の文字列（`"early"`, `"day"` など）ではない。Gemini のレスポンスも同じ形式で返すようプロンプトで指示しており、`sanitizeAssignments()` で不正値は `"off"` に置換される。

**公開後はスナップショットで閲覧**
`published` 状態になると `published_payload` に ShiftSlot の JSON スナップショットを保存する。スタッフの `/staff/shifts` はこのスナップショットを参照するため、公開後に管理者が ShiftSlot を変更してもスタッフ画面には反映されない。再公開が必要。

**スタッフ希望は生成後にマージ**
承認済みのスタッフ希望申請（StaffRequest）は Gemini へのプロンプトには含めず、AI 生成結果の後処理として `mergeStaffRequestsIntoAssignments()` で上書きする。AI に渡すと出力が不安定になるリスクを避けるための判断。

**Gemini 失敗時はサイレントフォールバック**
`GEMINI_API_KEY` が未設定、または Gemini 呼び出しが失敗した場合、エラーを投げずにルールベース生成に切り替えて `source: "fallback"` を返す。UI 側で `warnings` フィールドを確認しないと AI が動いたかどうか区別できない。

## 用語定義

| 用語 | 意味 |
|------|------|
| `target_month` | `"YYYY-MM"` 形式の対象年月文字列 |
| ShiftSlot | スタッフ × 日付 の 1 エントリ。1 スケジュールに全スタッフ × 全日付分存在する |
| `shift_type` | `"off"` または `ShiftType.id`（UUID）。ShiftTypeCode ではない |
| `published_payload` | 公開時に保存する ShiftSlot の JSON スナップショット |
| `sanitizeAssignments()` | Gemini 出力の検証・補完関数。不正な shift_type を `"off"` に置換し、欠損スロットをフォールバックで補う |

## 注意点

- `ShiftSlot.shift_type` に `"early"` などの ShiftTypeCode を入れると表示が壊れる。必ず `ShiftType.id` を使う。
- `published_payload` を更新するには再度 `published` 状態にするフローが必要。確定後の修正は再公開を要求する。
- `GEMINI_API_KEY` を設定しても無料枠上限（429 エラー）でフォールバックすることがある。`warnings` 配列にメッセージが入る。
- `sanitizeAssignments()` は全スタッフ × 全日付のスロットを必ず生成するため、AI が一部の日付を返し忘れてもフォールバック値で補完される。
