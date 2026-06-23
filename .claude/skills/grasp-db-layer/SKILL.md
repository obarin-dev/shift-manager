# grasp-db-layer

Prisma を使ったDBアクセスの構造・命名規則・型変換パターン。

## 全体像

DB操作は `src/lib/*-db.ts` に集約し、ページや API route から直接 `prisma` を呼ばない規則。各 `*-db.ts` はエンティティ単位に分かれており、Prisma の生レコード型とアプリ側のドメイン型の変換責務を持つ。

## 責務の分担

| ファイル | 担当エンティティ |
|---------|----------------|
| `staff-db.ts` | Staff の CRUD・staff_login_id の採番 |
| `shift-schedule-db.ts` | ShiftSchedule・ShiftSlot の CRUD |
| `roster-db.ts` | RosterSheet（日次体制表）の永続化 |
| `staff-request-db.ts` | StaffRequest の CRUD・月次グループ取得 |
| `calendar-entry-db.ts` | CalendarEntry（行事・特別営業日）の CRUD |
| `classroom-db.ts` | Classroom の CRUD |
| `shift-type-db.ts` | ShiftType の CRUD |
| `nursery-db.ts` | Nursery プロフィールの取得・更新。`DEFAULT_NURSERY_ID` と `getPrimaryNursery()` の起点 |
| `nursery-holiday-settings-db.ts` | 休園設定（定休曜日・祝日設定）の取得・更新 |
| `user-db.ts` | User の検索・パスワード検証（認証専用。一般 CRUD は不要） |
| `prisma.ts` | PrismaClient のシングルトン生成・キャッシュ |

## 依存方向

```
ページ / API route
  → *-db.ts
    → prisma.ts（PrismaClient）
    → nursery-db.ts（nurseryId 解決）
    → mock-*.ts（ドメイン型の定義元）
```

`*-db.ts` 同士の相互依存は最小限にする。`roster-db.ts` が `classroom-db.ts` を呼ぶケースはあるが、循環は発生していない。

## 重要な設計判断

**`resolveNurseryId()` パターン**
多くの `*-db.ts` に `async function resolveNurseryId(nurseryId?: string)` が存在する。引数省略時は `getPrimaryNursery()` でDBから最初の Nursery を取得し、それも失敗したら `DEFAULT_NURSERY_ID` にフォールバックする。現在は単一テナント運用のため、呼び出し側は基本的に `nurseryId` を省略して使う。

**Prisma レコード → ドメイン型の変換を `to*()` で行う**
`toStaffMember(record)`、`toShiftAssignment(slot)` のように `to` プレフィックスの関数で変換する。Prisma 型（`PrismaStaff` など）はファイル内に閉じ込め、外部には必ずドメイン型を返す。

**Prisma クライアントは `@prisma/adapter-pg` 経由で PostgreSQL に接続**
通常の `new PrismaClient()` ではなく `PrismaPg` アダプターを使う。`isPrismaClientReady()` でキャッシュ済みクライアントの型安全チェックを行い、hot reload 時の多重生成を防ぐ。

**時刻・日付は変換関数を通す**
DBの `DateTime @db.Time` は JavaScript の `Date` オブジェクトで返ってくる。`formatDbTime()` で `"HH:MM"` 文字列に、`formatDbDate()` で `"YYYY-MM-DD"` 文字列に変換して使う。逆方向は `parseTimeToDate()` / `parseDateToDb()`。直接 `.toISOString()` などを使うとタイムゾーンずれが起きる。

**カスタムエラークラスで一意制約違反を区別する**
`DuplicateStaffLoginIdError` のように Prisma の `P2002`（一意制約違反）を捕捉して意味のあるエラークラスに変換する。API route 側でエラーの種類に応じたレスポンスを返すため。

## 用語定義

| 用語 | 意味 |
|------|------|
| `DEFAULT_NURSERY_ID` | `"nursery-hoshinoko"`。DB に Nursery がない場合のフォールバック値 |
| `getPrimaryNursery()` | `created_at` 昇順で最初の Nursery を返す。単一テナント運用の前提 |
| `staff_login_id` | スタッフのログイン用 6 桁ゼロ埋め番号（`"000001"` など）。DB の `id`（UUID）とは別物 |
| `to*()` 関数 | Prisma レコード → アプリドメイン型への変換関数 |

## 注意点

- `*-db.ts` の関数は `nurseryId` を省略できるが、マルチテナント対応が必要になった場合は省略を廃止して明示的に渡す必要がある。
- 時刻・日付の変換は必ず `nursery-time.ts` の関数を使う。`Date` を直接文字列化するとタイムゾーンの影響を受ける。
- `prisma.ts` のシングルトンは `isPrismaClientReady()` でモデル存在チェックをしてからキャッシュを使う。マイグレーション後に新モデルを追加したら同関数のチェック条件も更新が必要。
