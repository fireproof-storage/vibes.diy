import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation } from 'react-router-dom';
import { mockNavigate, mockSessionId, mockTitle } from './setup';

import './setup';

describe('useViewState streaming', () => {
  test('should not navigate to app view when on code path and preview becomes ready', () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: `/chat/${mockSessionId}/${mockTitle}/code`,
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
      isStreaming: false,
      previewReady: true,
    } as any);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
