import { beforeEach, afterEach, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useLocation: vi.fn(),
}));

import { useNavigate, useParams, useLocation } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSessionId = 'test-session-id';
const mockTitle = 'test-title';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  vi.mocked(useParams).mockReturnValue({ sessionId: mockSessionId, title: mockTitle });
  vi.mocked(useLocation).mockReturnValue({
    pathname: `/chat/${mockSessionId}/${mockTitle}`,
  } as any);
});

afterEach(() => {
  vi.resetAllMocks();
});

export { mockNavigate, mockSessionId, mockTitle, useLocation };
