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
      // Simple utility tests - baby steps migration
      'tests/prompts.test.ts',
      'tests/publishUtils.test.ts',
      'tests/settings-prompt.test.ts',
      'tests/normalizeComponentExports.test.tsx',
      // Note: normalizeComponentExports-named-app.test.tsx uses Node path/fs - keep in jsdom
      // Note: segmentParser.test.ts uses Node path/fs - keep in jsdom
      'tests/useSegmentParser.test.tsx',
      // Simple hook tests - next phase of migration
      'tests/useRuntimeErrors.test.ts',
      'tests/useMessageSelection.test.ts',
      'tests/ViewState.coverage.test.tsx',
      // Simple component tests with minimal dependencies
      'tests/ViewControls.test.tsx',
      // Hook tests with managed dependencies - continued migration
      'tests/useSession.test.ts',
      'tests/useViewState.test.tsx',
      'tests/usePublish.test.tsx',
      'tests/useVibes.test.tsx',
      // Simple component tests - Phase 1 migration (selective)
      'tests/ShareButton.test.tsx',
      'tests/NavigationFix.test.tsx',
      // Route/page tests - Phase 2 migration (selective)
      'tests/about-route.test.tsx',
      // Streaming/content utility tests - Phase 3 migration (selective)
      'tests/streaming-content.test.tsx',
      'tests/useViewStateStreaming.test.tsx',
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
