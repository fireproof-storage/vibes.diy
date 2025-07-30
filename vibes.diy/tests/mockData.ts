export const mockResultPreviewProps = {
  displayView: 'code' as const, // Changed from activeView
  // setActiveView: () => { /* no-op */ }, // Removed
  onPreviewLoaded: () => {
    /* no-op */
  },
  setMobilePreviewShown: () => {
    /* no-op */
  },
};

export const mockChatStateProps = {
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {
    /* no-op */
  },
  setNeedsNewKey: () => {
    /* no-op */
  },
  // Error tracking properties
  immediateErrors: [],
  advisoryErrors: [],
  addError: () => Promise.resolve(),
};

export const mockSessionSidebarProps = {
  sessionId: 'test-session-id',
  isVisible: true,
  onClose: () => {
    /* no-op */
  },
};

export const createMockChatState = (overrides = {}) => ({
  docs: [],
  input: '',
  setInput: () => {
    /* no-op */
  },
  inputRef: { current: null },
  sendMessage: () => Promise.resolve(),
  isStreaming: false,
  title: 'Test Session',
  sessionId: 'test-session-id',
  selectedSegments: [],
  selectedCode: {
    type: 'code',
    content: 'console.log("Hello world")',
  },
  selectedResponseDoc: undefined,
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {
    /* no-op */
  },
  setNeedsNewKey: () => {
    /* no-op */
  },
  // Error tracking properties
  immediateErrors: [],
  advisoryErrors: [],
  addError: () => Promise.resolve(),
  ...overrides,
});
