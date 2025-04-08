import { renderHook } from '@testing-library/react';
import { useViewState } from '../app/utils/ViewState';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock react-router-dom hooks
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(),
    useParams: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock encodeTitle from utils
vi.mock('../app/components/SessionSidebar/utils', () => {
  return {
    encodeTitle: vi.fn((title) => title), // Simple mock that returns the title unchanged
  };
});

// Import mocked modules
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { act } from '@testing-library/react';

describe('ViewState Mobile-specific Tests', () => {
  const mockNavigate = vi.fn();
  const mockSessionId = 'test-session-123';
  const mockTitle = 'test-title';
  const mockOnBackClicked = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default mocks
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useParams).mockReturnValue({
      sessionId: mockSessionId,
      title: mockTitle,
    });
    vi.mocked(useLocation).mockReturnValue({
      pathname: `/chat/${mockSessionId}/${mockTitle}/app`,
    } as any);
  });

  test('should initialize mobile state with correct defaults', () => {
    const props = {
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: false,
      previewReady: true,
      onBackClicked: mockOnBackClicked,
    };

    // Render the hook
    const { result } = renderHook(() => useViewState(props));

    // Check initial mobile state values
    expect(result.current.mobilePreviewShown).toBe(true);
    expect(result.current.userClickedBack).toBe(false);
  });

  test('should handle back action correctly', () => {
    const props = {
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: true, // Important: testing during streaming
      previewReady: true,
      onBackClicked: mockOnBackClicked,
    };

    // Render the hook
    const { result } = renderHook(() => useViewState(props));

    // Trigger back action
    act(() => {
      result.current.handleBackAction();
    });

    // Verify state changes
    expect(result.current.mobilePreviewShown).toBe(false);
    expect(result.current.userClickedBack).toBe(true);
    expect(mockOnBackClicked).toHaveBeenCalledTimes(1);
  });

  test('should reset mobile state when navigating to a view', () => {
    const props = {
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: true, // Important: testing during streaming
      previewReady: true,
      onBackClicked: mockOnBackClicked,
    };

    // Render the hook
    const { result } = renderHook(() => useViewState(props));

    // First trigger back action to set states
    act(() => {
      result.current.handleBackAction();
    });

    // Verify state changes from back action
    expect(result.current.mobilePreviewShown).toBe(false);
    expect(result.current.userClickedBack).toBe(true);

    // Reset mockNavigate for clean testing
    mockNavigate.mockClear();

    // Now navigate to a view which should reset the states
    act(() => {
      result.current.navigateToView('code');
    });

    // Verify states were reset
    expect(result.current.mobilePreviewShown).toBe(true);
    expect(result.current.userClickedBack).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/code`);
  });

  test('should not change userClickedBack when not streaming', () => {
    const props = {
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: false, // Not streaming
      previewReady: true,
      onBackClicked: mockOnBackClicked,
    };

    // Render the hook
    const { result } = renderHook(() => useViewState(props));

    // Trigger back action
    act(() => {
      result.current.handleBackAction();
    });

    // Verify state changes - userClickedBack should still be false since not streaming
    expect(result.current.mobilePreviewShown).toBe(false);
    expect(result.current.userClickedBack).toBe(false); // Remains false
    expect(mockOnBackClicked).toHaveBeenCalledTimes(1);

    // Reset mockNavigate
    mockNavigate.mockClear();

    // Navigate to a view, which should reset mobilePreviewShown
    act(() => {
      result.current.navigateToView('code');
    });

    // Verify states - mobilePreviewShown should be reset, userClickedBack unchanged
    expect(result.current.mobilePreviewShown).toBe(true);
    expect(result.current.userClickedBack).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/code`);
  });
});
