# grasp-auth

JWT セッションによる認証・認可の仕組みと、ページ・API route での使い分け。

## 全体像

パスワード認証でログインし、JWT を HttpOnly クッキーに保存するステートレスセッション方式。セッション検証はミドルウェアとサーバーコードの両方で行う二段構え。ロールは `admin` / `manager` / `staff` の3種で、ページの表示制御と機能制限に使う。

## 責務の分担

| ファイル | 責務 |
|---------|------|
| `auth-session.ts` | JWT の生成・検証・クッキー操作。認証の中核 |
| `user-db.ts` | ユーザーのDB検索とパスワード検証（bcrypt）。`AuthAccount` 型の組み立て |
| `page-auth.ts` | Server Component から呼ぶ `requireAuth()`。未認証なら `/login` へリダイレクト |
| `middleware.ts` | 全ルートを保護。未認証リクエストを `/login`（ページ）または 401（API）へ振り分け |
| `mock-auth.ts` | `UserRole` 型の定義とデモアカウント定数。ロール判定ロジックはここを起点にする |
| `/api/auth/login` | メール・パスワード検証 → JWT 発行 → クッキーセット |
| `/api/auth/logout` | クッキーを空文字・maxAge=0 で上書きして無効化 |

## 依存方向

```
ページ/API route
  → page-auth.ts または auth-session.ts（直接）
    → jose（JWT）
  → user-db.ts
    → bcryptjs
    → prisma
middleware.ts
  → auth-session.ts
```

## 重要な設計判断

**ミドルウェアとサーバーコードの二段構え**
ミドルウェアは Edge Runtime で動くため、DB アクセスができない。そのため「トークンが存在して有効か」だけをチェックする。実際のユーザーの存在確認（`is_active` チェックなど）は `requireAuth()` や API route 内で `getAuthAccountByUserId()` を呼ぶことで行う。ミドルウェアだけに頼ると無効化されたユーザーのトークンを通してしまう。

**`AuthAccount` 型でセッションデータを拡張する**
JWT ペイロード（`SessionData`）には `userId` / `nurseryId` / `role` / `email` の最小限しか入れない。表示名やスタッフIDなど追加情報が必要なときは `getAuthAccountByUserId()` でDBから取得し、`AuthAccount` 型として使う。

**`mock-auth.ts` はデモ用定数の置き場**
`UserRole` 型の定義がここにあるが、実際の認証ロジックとは無関係。デモアカウント（`MOCK_ACCOUNTS`）とホーム画面のコンテンツ定義（`HOME_CONTENT`）が同居している歴史的な理由による。新しいロール制御を書くときは `UserRole` 型だけ参照し、`MOCK_ACCOUNTS` には依存しない。

## 用語定義

| 用語 | 意味 |
|------|------|
| `SessionData` | JWT ペイロードの型。`userId` / `nurseryId` / `role` / `email` の4フィールド |
| `AuthAccount` | DB から引いたユーザー情報の型。`displayName` や `staffId` を含む |
| `shift_session` | セッション JWT を格納するクッキー名 |
| `requireAuth()` | Server Component 用の認証ガード。セッションとDBの両方を確認する |
| `getSession()` | API route 用。クッキーから JWT を検証するだけでDB照会しない |

## 注意点

- API route で認証チェックするときは `getSession()` だけでなく、必要に応じて `getAuthAccountByUserId()` も呼んで `is_active` を確認する。`getSession()` は JWT が有効なら通過してしまう。
- `runtime = "nodejs"` を login/logout route に指定しているのは、bcrypt と cookie API が Edge Runtime で動かないため。認証系 API route を新たに作る場合も同様に指定が必要。
- ロールによるページアクセス制限はミドルウェアでは行っていない。Server Component 側で `session.role` を確認するか、`requireAuth()` の戻り値を使って判定する。
