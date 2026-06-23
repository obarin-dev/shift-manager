# grasp-roster

日次体制表（RosterSheet）の構造と ShiftSchedule との関係。

## 全体像

体制表は「特定の1日におけるクラス別・時間帯別の職員配置」を管理するもの。月次シフト表（ShiftSchedule）とは独立した別エンティティで、7時〜19時の縦軸×クラスの横軸のグリッドに職員を配置する。体制表は日ごとに1件保存され、保存形式は JSON ペイロードで柔軟なレイアウト変更に対応している。

## 責務の分担

| ファイル | 責務 |
|---------|------|
| `roster-db.ts` | RosterSheet の取得・保存（upsert）。JSON ペイロードの読み書きと `migrateRosterAssignments()` の適用 |
| `mock-roster.ts` | RosterSheet の型定義・ペイロード操作ユーティリティ・旧データのマイグレーション関数群 |
| `shift-schedule-class-sections.ts` | 月次シフト表の縦軸をクラス別にグループ化する構造を構築。体制表とは別の表示用ロジック |
| `/app/roster` | 管理者向け体制表作成ページ |
| `/app/api/roster` | 体制表の取得・保存 API |

## 依存方向

```
roster-db.ts
  → mock-roster.ts（型・マイグレーション）
  → classroom-db.ts（クラス一覧取得）
  → prisma.ts
```

ShiftSchedule と RosterSheet は DB レベルで独立しており、相互参照はない。体制表ページがシフト表データを参照することはあるが、永続化のフローは別。

## 重要な設計判断

**RosterSheet は ShiftSchedule と独立した別エンティティ**
月次シフト表は「誰がいつ出勤するか」を管理する。体制表は「その日の各時間帯にどのクラスに誰がいるか」を管理する。役割が異なるため別テーブルに分離している。体制表はシフト表の内容を自動反映するのではなく、管理者が手動で作成・編集する。

**ペイロードを JSON として丸ごと保存する**
`RosterSheetPayload` 全体を `RosterSheet.payload` カラムに JSON で保存する。行のレイアウト（`rows`）・配置データ（`assignments`）・列幅・行高など表示状態ごと保持する設計で、スキーマ変更なしにレイアウト拡張に対応できる。

**`migrateRosterAssignments()` で旧データ互換を維持**
ペイロードの `assignments` 形式が変更された際に、旧形式（`time_slot` フィールドを持つ）を新形式（`row_id` を持つ）に変換する。`getRosterSheetByDate()` と `normalizeRosterSheetPayload()` の両方で呼ばれ、読み込み時に常にマイグレーションが走る。

**`RosterCellAssignment` のキーは `row_id` + `classroom_id`**
セルの一意性は「行ID × クラスID」で決まる。行IDは `RosterSheetRow` の `id`（UUID）であり、時刻文字列ではない。`buildRosterAssignmentMap()` で `"classroomId:rowId"` 形式の文字列キーにしてマップ化して参照する。

## 用語定義

| 用語 | 意味 |
|------|------|
| `RosterSheetRow` | 体制表の1行。`kind: "schedule"`（時間帯行）または `kind: "note"`（メモ行）の判別型 |
| `RosterCellAssignment` | 1セル（行 × クラス）に配置された職員IDのリスト |
| `RosterSheetPayload` | DB に保存される体制表全体のデータ構造（行定義・配置・列幅・行高・当日園児数を含む） |
| `todayChildCounts` | 当日の実際の登園児数。キーは `"YYYY-MM-DD:classroomId"` 形式 |
| `slotCountsByRowAndClass` | 行×クラスごとのスロット数キャッシュ（表示最適化用） |
| `migrateRosterAssignments()` | 旧形式（`time_slot`）→ 新形式（`row_id`）への変換関数 |

## 注意点

- 体制表はシフト表から自動生成されない。管理者が毎日手動で作成する運用を想定している。
- `rows` の構造（時間帯の刻み・行数）は保存ペイロードに含まれるため、保存後に設定を変更しても既存データの行構造は変わらない。
- `migrateRosterAssignments()` は読み込み時に毎回実行されるが、新形式データは早期リターンするため通常は軽い処理。
- `shift-schedule-class-sections.ts` は体制表ではなく月次シフト表の表示用（クラス別縦グループ）なので混同しないこと。
