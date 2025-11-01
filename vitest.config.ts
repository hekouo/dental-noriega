import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
    exclude: ["tests/**", "e2e/**", "node_modules/**", "dist/**"],
    environment: "node",
  },
  resolve: { preserveSymlinks: true },
});
