import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../app/routes/settings';
import { AuthContext } from '../app/contexts/AuthContext';

// Mocks
const mockMerge = vi.fn();
const mockSave = vi.fn().mockResolvedValue({ ok: true });
const mockUseDocument = vi.fn().mockReturnValue({
  doc: { _id: 'user_settings', stylePrompt: '', userPrompt: '', model: '' },
  merge: mockMerge,
  save: mockSave,
});

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({ useDocument: mockUseDocument }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../app/components/SimpleAppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../app/components/SessionSidebar/HomeIcon', () => ({
  HomeIcon: () => <div />,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider
    value={{
      token: null,
      isAuthenticated: false,
      isLoading: false,
      userPayload: null,
      checkAuthStatus: vi.fn(),
      processToken: vi.fn(),
      needsLogin: false,
      setNeedsLogin: vi.fn(),
    }}
  >
    {children}
  </AuthContext.Provider>
);

describe('Settings dependencies chooser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders library checkboxes and allows toggling', async () => {
    render(<Settings />, { wrapper });

    // Labels from llms catalog
    const callAICheck = await screen.findByLabelText(/callAI/i, { selector: 'input[type="checkbox"]' });
    const fireproofCheck = await screen.findByLabelText(/useFireproof/i, { selector: 'input[type="checkbox"]' });

    // Toggle one off
    await act(async () => {
      fireEvent.click(fireproofCheck);
    });
    expect(mockMerge).toHaveBeenCalledWith(expect.objectContaining({ dependencies: expect.any(Array) }));

    // Toggle one on
    await act(async () => {
      fireEvent.click(callAICheck);
    });
    expect(mockMerge).toHaveBeenCalledWith(expect.objectContaining({ dependencies: expect.any(Array) }));
  });

  it('validates and saves dependencies on Save', async () => {
    render(<Settings />, { wrapper });
    const saveBtn = screen.getByRole('button', { name: /save/i });

    // Enable save by changing a dep
    const callAICheck = await screen.findByLabelText(/callAI/i, { selector: 'input[type="checkbox"]' });
    await act(async () => fireEvent.click(callAICheck));

    await act(async () => fireEvent.click(saveBtn));
    expect(mockSave).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
