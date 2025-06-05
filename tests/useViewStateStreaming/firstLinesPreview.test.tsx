import './setup';
import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation, useParams } from 'react-router-dom';
import { mockNavigate } from './setup';

describe('useViewState streaming', () => {
  test('EXPECTED BEHAVIOR: should stay on code view when first code lines arrive during streaming', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/' } as any);
    vi.mocked(useParams).mockReturnValue({});
    let hookResult: any;
    const { unmount } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          code: '',
          isStreaming: false,
          previewReady: false,
        },
      }
    );
    expect(hookResult.currentView).toBe('preview');
    expect(mockNavigate).not.toHaveBeenCalled();
    unmount();
    const { rerender } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          code: '',
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    expect(hookResult.currentView).toBe('preview');
    expect(mockNavigate).not.toHaveBeenCalled();
    rerender({
      code: 'console.log("Hello World")',
      isStreaming: true,
      previewReady: false,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(hookResult.viewControls.code.loading).toBe(true);
  });
});
