import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/__tests__/**",
        "src/lib/server/**",
        "src/lib/webpack/configs/mf-client.ts",
        "src/lib/webpack/configs/mf-server.ts",
        "src/lib/webpack/configs/preview.ts",
        "src/components/**",
        "src/app.tsx",
        "src/cli.tsx",
        "src/lib/types.ts",
      ],
    },
  },
});
