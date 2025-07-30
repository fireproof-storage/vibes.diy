import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
    globals: true,
    // Minimal setup for Chromium tests - no heavy mocking
    setupFiles: ['./tests/chromium-setup.ts'],
    include: [
      // Only include specific tests that benefit from real browser
      'tests/vibeUtils.test.ts',
      'tests/encodeTitle.test.ts',
      'tests/routes.test.ts',
      'tests/mock-check.test.ts',
      'tests/chatWithLegends.test.tsx',
      'tests/vibe-route.test.tsx',
      // Migrated failing tests from jsdom
      'tests/authUtils.test.ts',
      'tests/MessageList-very-early-streaming.test.tsx',
      // Add more tests as needed
    ],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
    },
  },
});
