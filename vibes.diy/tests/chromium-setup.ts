import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

// Minimal setup for Chromium browser tests
// No heavy mocking - let real browser APIs work

// Set up environment variables globally before any tests run
import.meta.env.VITE_CLOUD_SESSION_TOKEN_PUBLIC = 'z2VbCuXVUi2VZRpXcSMgMhYzT1tLvV7JQ6PY1pHYoRGVGSKEfb4Gp9w6P8d8eEQrQV';
import.meta.env.VITE_CONNECT_API_URL = 'https://dev.connect.fireproof.direct/api';
import.meta.env.VITE_CONNECT_URL = 'https://dev.connect.fireproof.direct/token';

// Setup per-test cleanup
beforeEach(() => {
  // Clear storage before each test
  window.localStorage.clear();
  window.sessionStorage.clear();
});

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

// Mock the entire config/env module to ensure environment variables are properly set
vi.mock('../app/config/env', () => ({
  CLOUD_SESSION_TOKEN_PUBLIC_KEY: 'z2VbCuXVUi2VZRpXcSMgMhYzT1tLvV7JQ6PY1pHYoRGVGSKEfb4Gp9w6P8d8eEQrQV',
  CONNECT_API_URL: 'https://dev.connect.fireproof.direct/api',
  CONNECT_URL: 'https://dev.connect.fireproof.direct/token',
  IS_DEV_MODE: true,
  APP_MODE: 'test',
  GA_TRACKING_ID: '',
  POSTHOG_KEY: '',
  POSTHOG_HOST: '',
  API_BASE_URL: 'https://vibesdiy.app', 
  SETTINGS_DBNAME: 'vibes-chats',
  getDatabaseVersion: vi.fn().mockReturnValue(0),
  incrementDatabaseVersion: vi.fn().mockReturnValue(1),
}));

// Mock jose for auth tests - keep this controlled
vi.mock('jose', () => ({
  importJWK: vi.fn().mockResolvedValue({} as CryptoKey),
  jwtVerify: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
}));

// Mock Message component for MessageList tests
vi.mock('../app/components/Message', () => ({
  default: ({ message }: any) => 
    React.createElement('div', { 'data-testid': `message-${message._id}` }, [
      message.segments && message.segments.map((segment: any, i: number) => 
        React.createElement('div', { key: `segment-${i}`, 'data-testid': segment.type }, segment.content)
      ),
      message.text && !message.segments?.length && React.createElement('div', { key: 'text' }, message.text)
    ].filter(Boolean)),
  WelcomeScreen: () => React.createElement('div', { 'data-testid': 'welcome-screen' }, 'Welcome Screen'),
}));

// Mock console.debug to avoid cluttering test output
const originalConsoleDebug = console.debug;
console.debug = vi.fn();

// Restore console.debug after tests
afterAll(() => {
  console.debug = originalConsoleDebug;
});
