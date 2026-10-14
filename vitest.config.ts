import { defineConfig, defaultExclude } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // e2e は Playwright が実行する。vitest のデフォルト include が
    // *.spec.ts を拾ってしまうため除外する（デフォルト除外は維持）
    exclude: [...defaultExclude, "e2e/**"],
  },
});
