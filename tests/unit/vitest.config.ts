import { defineConfig } from "vitest/config";
// import react from '@vitejs/plugin-react';

export default defineConfig({
  // plugins: [react()],
  test: {
    name: 'call-ai-test-unit',
    //   environment: 'jsdom',
    globals: true,
    // setupFiles: ['./setup.ts'],
  },
});
