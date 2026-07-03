# 保育園向け勤務表管理システム

Next.js (App Router) + Prisma + PostgreSQL 構成の保育園向けシフト管理アプリケーション。

## 開発環境のセットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# DATABASE_URL, AUTH_SECRET を設定

# DB マイグレーション
npx prisma migrate dev

# 開発用サンプルデータの投入（開発・デモ環境のみ）
npm run db:seed:demo

# 開発サーバー起動
npm run dev
```

## 本番環境のセットアップ

> **⚠️ 本番環境では `npm run db:seed` を実行しないでください。**
> サンプルデータ（テストアカウント・ダミーシフトなど）が投入されます。

本番初期セットアップは **`/setup` ページ** から行います。

1. アプリをデプロイする
2. ブラウザで `/setup` にアクセスする
3. 園名・管理者アカウント情報を入力して登録する
4. ログイン後、ホーム画面のオンボーディングガイドに従って初期設定を完了する

```
/setup → 管理者アカウント作成
/home  → オンボーディング（保育時間・勤務区分・休日設定・職員・クラス登録）
```

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run typecheck    # TypeScript 型チェック
npm test             # テスト実行
npm run db:seed:demo # 開発・デモ用サンプルデータ投入（本番禁止）
npx prisma migrate dev   # マイグレーション作成・適用
npx prisma studio        # DB GUI
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 | 必須 |
| `AUTH_SECRET` | JWT 署名シークレット | 本番のみ必須 |
| `GEMINI_API_KEY` | Google Gemini API キー | 任意 |
