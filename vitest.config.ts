import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "vibes.diy/tests/vitest.config.ts",
      "call-ai/tests/unit/vitest.config.ts",
      "call-ai/tests/integration/vitest.config.ts",
      "use-vibes/tests/vitest.config.ts",
    ],
  },
});
