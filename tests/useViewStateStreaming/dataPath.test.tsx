import './setup';
import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation } from 'react-router-dom';
import { mockNavigate, mockSessionId, mockTitle } from './setup';


describe('useViewState streaming', () => {
  test('should not navigate when on data path and preview becomes ready', () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: `/chat/${mockSessionId}/${mockTitle}/data`,
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
          isStreaming: false,
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
          isStreaming: false,
          previewReady: false,
        },
      }
    );
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: false,
      previewReady: true,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
