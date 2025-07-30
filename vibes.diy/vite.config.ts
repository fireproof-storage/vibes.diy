import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from '@improvements/vite-plugin-devtools-json';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  // Disable React Router plugin for tests or when explicitly disabled
  const disableReactRouter = mode === 'test' || process.env.DISABLE_REACT_ROUTER === 'true';

  return {
    plugins: [
      tailwindcss(),
      // Only include React Router plugin when not disabled
      ...(!disableReactRouter ? [reactRouter()] : []),
      tsconfigPaths(),
      devtoolsJson(),
    ],
    // Define global constants
    // define: {
    //   IFRAME__CALLAI_API_KEY: JSON.stringify(env.VITE_OPENROUTER_API_KEY),
    // },
    // Server configuration for local development
    server: {
      host: '0.0.0.0', // Listen on all local IPs
      allowedHosts: ['.ngrok-free.app'], // Specific ngrok hostname
      cors: true, // Enable CORS for all origins
      hmr: true, // Use default HMR settings for local development
      // Ignore test directory changes to prevent unnecessary reloads during development
      watch: {
        ignored: ['**/tests/**'],
      },
    },
    // Ensure JSON imports are properly handled
    json: {
      stringify: true,
    },
    test: {
      environment: 'jsdom',
      browser: {
        enabled: false, // Enable only for specific tests
        name: 'chromium',
        provider: 'playwright',
        headless: true,
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: [
          'RegexParser.ts',
          'app/hooks/useChat.ts',
          'app/ChatInterface.tsx',
          'app/ResultPreview.tsx',
          'app/prompts.ts',
          'app/root.tsx',
          'app/routes.ts',
          'app/components/**/*.tsx',
        ],
        enabled: true,
      },
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      exclude: [
        'node_modules',
        'dist',
        '.idea',
        '.git',
        '.cache',
        // Exclude tests that have been migrated to Chromium
        'tests/authUtils.test.ts',
        'tests/MessageList-very-early-streaming.test.tsx',
        // Utility tests migrated to Chromium for baby steps approach
        'tests/prompts.test.ts',
        'tests/publishUtils.test.ts',
        'tests/settings-prompt.test.ts',
        'tests/normalizeComponentExports.test.tsx',
        'tests/useSegmentParser.test.tsx',
        // Simple hook tests migrated to Chromium - next phase
        'tests/useRuntimeErrors.test.ts',
        'tests/useMessageSelection.test.ts',
        'tests/ViewState.coverage.test.tsx',
        // Simple component tests migrated to Chromium
        'tests/ViewControls.test.tsx',
        // Hook tests with managed dependencies - continued migration
        'tests/useSession.test.ts',
        'tests/useViewState.test.tsx',
        'tests/usePublish.test.tsx',
        'tests/useVibes.test.tsx',
      ],
      deps: {
        inline: ['react-router', '@react-router/dev'],
      },
    },
  };
});
