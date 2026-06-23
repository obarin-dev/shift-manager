# grasp-api-patterns

Next.js App Router の API route で共通して使うパターンと設計上の判断。

## 全体像

全 API route は `src/app/api/` 以下に置く。認証・バリデーション・エラーレスポンスに共通パターンがあり、新しい route を追加するときはそのパターンに合わせる。

## 責務の分担

各 route ファイルの責務は3層に分かれる：

1. **リクエスト解析・バリデーション** — `parse*Body()` / `isValid*()` 関数でリクエストを検証。失敗したら即 400 を返す
2. **認証・認可チェック** — `getSession()` + `getAuthAccountByUserId()` でセッションとユーザーを確認
3. **DB 操作の委譲** — `*-db.ts` の関数を呼ぶだけ。route に直接 `prisma` を呼ぶコードは書かない

## 依存方向

```
ページ / クライアント
  → API route（src/app/api/）
    → auth-session.ts / user-db.ts（認証チェック）
    → *-db.ts（DB操作）
      → prisma.ts
middleware.ts
  → auth-session.ts（JWT検証のみ、DBなし）
```

## 重要な設計判断

**`runtime = "nodejs"` を全 route に指定する**
Next.js のデフォルト runtime は nodejs だが、Vercel 等の一部デプロイ環境では明示しないと Edge として扱われる場合がある。Prisma（`@prisma/adapter-pg`）と bcrypt は Edge Runtime で動かないため、全 API route に `export const runtime = "nodejs"` を明示する。これがないと特定の環境でデプロイ時に実行時エラーになる。

**認証チェックは `getSession()` + `getAuthAccountByUserId()` の2段**
`getSession()` は JWT 検証のみで DB を見ない。無効化されたユーザー（`is_active: false`）を弾くには続けて `getAuthAccountByUserId()` を呼ぶ必要がある。どちらか一方だけでは不十分。`/api/staff-requests` の `getRequestOwner()` ヘルパーがこのパターンの参考実装。

**ロール制御は route 内で行う**
ミドルウェアはロールチェックをしない。管理者専用操作（例: `scope=admin`）は route 内で `account.role` を確認し、権限不足なら 403 を返す。

**バリデーションは `parse*()` 関数に閉じ込める**
リクエストボディの検証は `parseWriteBody()` などの純粋関数に切り出す。戻り値が `null` なら 400、有効な型なら処理を続ける。型アサーションは `parse*()` 内に限定し、handler 関数内では型安全に扱う。

**エラーレスポンスは文字列コードで統一する**
```json
{ "error": "unauthorized" }      // 401
{ "error": "forbidden" }         // 403
{ "error": "invalid_payload" }   // 400
{ "error": "invalid_month" }     // 400（特定バリデーション）
{ "error": "internal_error" }    // 500
{ "error": "server_error" }      // 500（一部 route で混在）
```
成功レスポンスは `{ "data": ... }` または `{ "ok": true }`。作成成功は status 201。

**既知のエラーは個別に捕捉する**
`DuplicateStaffLoginIdError` のように `*-db.ts` が投げるカスタムエラーは catch で instanceof チェックして 409 などを返す。それ以外は `console.error` してから 500。エラーを握り潰さない。

## 用語定義

| 用語 | 意味 |
|------|------|
| `parse*Body()` | リクエストボディを検証して型付きオブジェクト or null を返す関数 |
| `isValid*()` | クエリパラメータなどの単一値を検証する boolean 関数 |
| `getRequestOwner()` | セッション + DB 照会で `StaffRequestOwner` を返すヘルパー。認証チェック2段のパターン |
| `scope=admin` | 同一エンドポイントで管理者/スタッフ向けデータを切り替えるクエリパラメータ |

## 注意点

- `runtime = "nodejs"` を忘れると Edge Runtime でデプロイされ Prisma が動かない。
- `server_error` と `internal_error` の2種が混在している。新しい route は `internal_error` に統一する。
- `request.json()` は body がない場合や不正な JSON の場合に例外を投げる。try/catch で囲むか、バリデーション前に別途 catch する。
- 認証が不要な route（`/api/auth/login` など）は明示的に public 扱いにしており、ミドルウェアの `PUBLIC_API_PATHS` に列挙されている。新しく公開 API を作る場合はここへの追加が必要。
