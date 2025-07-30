import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Minimal setup for Chromium browser tests
// No heavy mocking - let real browser APIs work

// Only mock external services that we can't control
vi.mock('../app/prompts', () => ({
  makeBaseSystemPrompt: vi.fn().mockReturnValue('mocked system prompt'),
  RESPONSE_FORMAT: {
    dependencies: {
      format: '{dependencies: { "package-name": "version" }}',
      note: 'use-fireproof is already provided, do not include it',
    },
    structure: [
      'Brief explanation',
      'Component code with proper Fireproof integration',
      'Real-time updates',
      'Data persistence',
    ],
  },
}));

// Mock console.debug to avoid cluttering test output
const originalConsoleDebug = console.debug;
console.debug = vi.fn();

// Restore console.debug after tests
afterAll(() => {
  console.debug = originalConsoleDebug;
});