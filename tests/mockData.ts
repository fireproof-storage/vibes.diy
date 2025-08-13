export const mockResultPreviewProps = {
  displayView: 'code' as const, // Changed from activeView
  // setActiveView: () => {}, // Removed
  onPreviewLoaded: () => {},
  setMobilePreviewShown: () => {},
  sessionId: 'test-session-id',
  updateTitle: () => Promise.resolve(),
};

export const mockChatStateProps = {
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {},
  setNeedsNewKey: () => {},
  saveCodeAsAiMessage: () => Promise.resolve('test-message-id'),
  updateTitle: () => Promise.resolve(),
  // Error tracking properties
  immediateErrors: [],
  advisoryErrors: [],
  addError: () => Promise.resolve(),
};

export const mockSessionSidebarProps = {
  sessionId: 'test-session-id',
  isVisible: true,
  onClose: () => {},
};

export const createMockChatState = (overrides = {}) => ({
  docs: [],
  input: '',
  setInput: () => {},
  inputRef: { current: null },
  sendMessage: () => Promise.resolve(),
  saveCodeAsAiMessage: () => Promise.resolve('test-message-id'),
  isStreaming: false,
  title: 'Test Session',
  updateTitle: () => Promise.resolve(),
  sessionId: 'test-session-id',
  selectedSegments: [],
  selectedCode: {
    type: 'code',
    content: 'console.log("Hello world")',
  },
  selectedResponseDoc: undefined,
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {},
  setNeedsNewKey: () => {},
  // Error tracking properties
  immediateErrors: [],
  advisoryErrors: [],
  addError: () => Promise.resolve(),
  ...overrides,
});
