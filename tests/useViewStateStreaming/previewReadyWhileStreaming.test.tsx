import './setup';
import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation } from 'react-router-dom';
import { mockNavigate, mockSessionId, mockTitle } from './setup';

describe('useViewState streaming', () => {
  test('should NOT navigate to /app when preview becomes ready during active streaming', () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: `/chat/${mockSessionId}/${mockTitle}`,
    } as any);
    let hookResult: any;
    const { unmount } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          sessionId: mockSessionId,
          title: mockTitle,
          code: 'console.log("test")',
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    unmount();
    const { rerender } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          sessionId: mockSessionId,
          title: mockTitle,
          code: 'console.log("test")',
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: true,
      previewReady: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
    expect(hookResult.displayView).toBe('preview');
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: false,
      previewReady: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
  });
});
