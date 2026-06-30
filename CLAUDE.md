# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

保育園向け勤務表管理システム。Next.js (App Router) + Prisma + PostgreSQL 構成。管理者（admin/manager）が月次シフト表を作成・管理し、スタッフが自分のシフト確認・希望申請を行う。Google Gemini AI でシフト表のたたき台を自動生成する機能あり。

## 開発コマンド

```bash
npm run dev          # devサーバー起動（prisma generate が先に走る）
npm run build        # ビルド（prisma generate が先に走る）
npm run typecheck    # TypeScript 型チェック
npm run db:seed      # DBシード（prisma/seed.ts）
npx prisma migrate dev   # マイグレーション作成・適用
npx prisma studio        # DB GUI
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 | 必須 |
| `AUTH_SECRET` | JWT 署名シークレット | 本番のみ必須（devはデフォルト値あり）|
| `GEMINI_API_KEY` | Google Gemini API キー | 任意（未設定時はルールベース生成） |

## アーキテクチャ

### ディレクトリ構成

- `src/app/` — Next.js App Router。pages と API routes。
- `src/lib/*-db.ts` — エンティティ別のDB操作関数（Prisma呼び出しはここに集約）
- `src/lib/` その他 — ビジネスロジック、認証、ユーティリティ
- `src/hooks/` — クライアント側データ取得用カスタムフック
- `src/generated/prisma/` — Prisma が生成するクライアントコード（編集不可）

### ページ構成とロール

| パス | 対象ロール | 説明 |
|------|-----------|------|
| `/login` | 全員 | ログイン（公開） |
| `/home` | 全員 | ダッシュボード |
| `/shifts` | admin/manager | 月次シフト表作成・管理 |
| `/roster` | admin/manager | 日次体制表作成 |
| `/requests` | admin/manager | スタッフの希望申請一覧 |
| `/nursery/*` | admin/manager | 園情報・スタッフ・クラス設定 |
| `/staff/shifts` | staff | 自分のシフト確認 |
| `/staff/requests` | staff | 希望申請 |

### 認証フロー

JWT セッションを `shift_session` クッキーに保存。`jose` で署名・検証。

- **Server Component（保護ページ）**: `requireAuth()` from `src/lib/page-auth.ts` を呼ぶ。未認証なら `/login` へリダイレクト。
- **API Route（保護）**: `getSession()` from `src/lib/auth-session.ts` でセッション取得、null なら 401。
- ミドルウェア (`src/middleware.ts`) が全ルートを保護し、未認証を `/login` へリダイレクト。

### DBパターン

`DEFAULT_NURSERY_ID = "nursery-hoshinoko"` で現在は単一テナント運用。全テーブルに `nursery_id` があり、マルチテナント対応設計だが API は常に first レコードの Nursery を使用。

DB操作は `src/lib/*-db.ts` の関数経由で行い、ページや API route から直接 `prisma` を呼ばない。

### シフト表ステータス遷移

`draft` → `checking` → `confirmed` → `published`

`published` 時に `published_payload` に JSON スナップショットを保存。スタッフの `/staff/shifts` はこのスナップショットを参照する。

### AI シフト自動生成

`src/lib/shift-schedule-ai.ts` の `generateShiftScheduleWithAi()` が中心ロジック。

1. 職員情報・シフト区分・休園日・行事を集約してプロンプト構築
2. Gemini API を呼び出し JSON を受け取る
3. `sanitizeAssignments()` で出力を検証・補完（不正な shift_type は `off` に置換）
4. 承認済みスタッフ希望を上書きマージ
5. `GEMINI_API_KEY` 未設定またはエラー時はルールベースのフォールバック

### ShiftSlot.shift_type の値

`"off"`（休み）または `ShiftType.id`（UUID）。`"early"` などの ShiftTypeCode ではない点に注意。

## 開発規約

### PR・コミット
- PR タイトルは日本語で書く
- コミットメッセージは英語でも日本語でも可

### PRレビューフロー

```
実装
 ↓
npm test / typecheck
 ↓
/code-review medium（PRマージ前に1回）
 ↓
🔴 高 → 修正する
🟡 中 → 判断（仕様次第でスキップOK）※認証・認可・データ漏洩に関わる中は高と同扱い
🟢 低 → スキップ（次のPRで対応）
 ↓
npm test / typecheck（修正後の確認）
 ↓
/code-review low（修正の副作用チェック）
 ↓
🔴 高のみ対応、それ以外はスキップ ※ここで low を再実行しない
 ↓
マージ ✅
```

### テスト方針
- API route を実装・修正する際は、同時に統合テストを追加・更新する
- テストは `src/app/api/<対象>/__tests__/` に配置する
- `vitest` を使用。モック構成は既存の `staff-requests/__tests__/` を参考にする
- `npm test` で全テストが通ることを確認してからコミットする
- カバレッジは `npm test -- --coverage` で確認できる
