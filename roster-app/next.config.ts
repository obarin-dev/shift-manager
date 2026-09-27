import type { NextConfig } from "next";

const MAIN_APP_URL = process.env.MAIN_APP_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // 開発時のみ: ブラウザから見て同一オリジンになるよう、
    // 園マスタ系の読み取り専用エンドポイントを本体アプリへ転送する。
    // 本番はCaddy(リバースプロキシ)がパス単位で振り分ける想定。
    return [
      { source: "/api/classrooms", destination: `${MAIN_APP_URL}/api/classrooms` },
      { source: "/api/classrooms/:path*", destination: `${MAIN_APP_URL}/api/classrooms/:path*` },
      { source: "/api/staff", destination: `${MAIN_APP_URL}/api/staff` },
      { source: "/api/staff/:path*", destination: `${MAIN_APP_URL}/api/staff/:path*` },
      { source: "/api/calendar-entries", destination: `${MAIN_APP_URL}/api/calendar-entries` },
      { source: "/api/calendar-entries/:path*", destination: `${MAIN_APP_URL}/api/calendar-entries/:path*` },
      { source: "/api/auth/:path*", destination: `${MAIN_APP_URL}/api/auth/:path*` },
      // ページ遷移(/login, /home など)は本番ではCaddyが振り分けるが、
      // 開発時にこのアプリ単独で立ち上げた場合は本体アプリへフォールバックする。
      { source: "/login", destination: `${MAIN_APP_URL}/login` },
      { source: "/home", destination: `${MAIN_APP_URL}/home` },
      { source: "/nursery/:path*", destination: `${MAIN_APP_URL}/nursery/:path*` },
      { source: "/requests", destination: `${MAIN_APP_URL}/requests` },
      { source: "/shifts", destination: `${MAIN_APP_URL}/shifts` },
    ];
  },
};

export default nextConfig;
