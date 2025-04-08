import { vi } from 'vitest';

// Default mock values
const mockNavigateToView = vi.fn();
const mockSetMobilePreviewShown = vi.fn();
const mockSetUserClickedBack = vi.fn();
const mockHandleBackAction = vi.fn();

// Create mock functions for all context methods
export const createMockViewState = (overrides = {}) => ({
  displayView: 'preview',
  isDarkMode: false,
  filesContent: {
    '/App.jsx': {
      code: '<p>Hello World</p>',
      active: true,
    },
  },
  showWelcome: false,
  navigateToView: mockNavigateToView,
  setMobilePreviewShown: mockSetMobilePreviewShown,
  setUserClickedBack: mockSetUserClickedBack,
  handleBackAction: mockHandleBackAction,
  encodedTitle: 'test-session',
  ...overrides,
});

// Reset all mocks
export const resetMocks = () => {
  mockNavigateToView.mockReset();
  mockSetMobilePreviewShown.mockReset();
  mockSetUserClickedBack.mockReset();
  mockHandleBackAction.mockReset();
};

// Export the individual mocks for test assertions
export {
  mockNavigateToView,
  mockSetMobilePreviewShown,
  mockSetUserClickedBack,
  mockHandleBackAction,
};
