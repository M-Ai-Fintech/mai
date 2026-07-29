import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.ts",
      "scripts/**/*.test.mjs",
      "app/**/*.test.ts",
      "screens/**/*.test.ts",
      "tokens/**/*.test.mjs",
    ],
  },
});
