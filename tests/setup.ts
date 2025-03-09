import { vi, afterAll } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

// Mock the makeBaseSystemPrompt function
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

// Mock React Router modules globally
vi.mock('@react-router/dev/vite', () => ({
  reactRouter: () => ({
    name: 'mocked-react-router',
  }),
}));

// Mock React Router modules
vi.mock('react-router', () => ({
  Links: () => React.createElement('div', { 'data-testid': 'links' }, 'Links'),
  Meta: () => React.createElement('div', { 'data-testid': 'meta' }, 'Meta'),
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet Content'),
  Scripts: () => React.createElement('div', { 'data-testid': 'scripts' }, 'Scripts'),
  ScrollRestoration: () =>
    React.createElement('div', { 'data-testid': 'scroll-restoration' }, 'Scroll Restoration'),
  isRouteErrorResponse: vi.fn().mockReturnValue(false),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  NavLink: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet Content'),
  MemoryRouter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'memory-router' }, children),
}));

// Mock console.debug to avoid cluttering test output
const originalConsoleDebug = console.debug;
console.debug = vi.fn();

// Restore console.debug after tests
afterAll(() => {
  console.debug = originalConsoleDebug;
});

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock TextEncoder if needed
if (typeof TextEncoder === 'undefined') {
  // @ts-ignore - We're mocking TextEncoder for the test environment
  global.TextEncoder = class TextEncoder {
    encoding = 'utf-8';
    encode(text: string): Uint8Array {
      const encoded = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        encoded[i] = text.charCodeAt(i);
      }
      return encoded;
    }
    encodeInto(text: string, dest: Uint8Array): { read: number; written: number } {
      const encoded = this.encode(text);
      dest.set(encoded);
      return { read: text.length, written: encoded.length };
    }
  };
}
