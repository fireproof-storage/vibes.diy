export const mockResultPreviewProps = {
  activeView: 'code' as const,
  setActiveView: () => {},
  onPreviewLoaded: () => {},
};

export const mockChatStateProps = {
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {},
};

export const mockSessionSidebarProps = {
  sessionId: 'test-session-id',
};

export const createMockChatState = (overrides = {}) => ({
  docs: [],
  input: '',
  setInput: () => {},
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
  selectedDependencies: {},
  selectedResponseDoc: undefined,
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: () => {},
  ...overrides,
});
