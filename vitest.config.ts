import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "vibes.diy/tests/vitest.config.ts",
      "use-vibes/tests/vitest.config.ts",
      "tests/unit/vitest.config.ts",
      "tests/integration/vitest.config.ts",
    ],
  },
});
