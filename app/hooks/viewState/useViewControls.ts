import { useMemo } from 'react';
import type { ViewStateProps } from './types';

// Hook to manage view controls state
export function useViewControls(props: Pick<ViewStateProps, 'isStreaming' | 'previewReady' | 'isIframeFetching' | 'code'>) {
  // Define view controls configuration
  const viewControls = useMemo(() => ({
    preview: {
      enabled: props.previewReady,
      icon: 'preview-icon',
      label: 'App',
      loading: props.isIframeFetching,
    },
    code: {
      enabled: true,
      icon: 'code-icon',
      label: 'Code',
      loading: props.isStreaming && !props.previewReady && props.code.length > 0,
    },
    data: {
      enabled: !props.isStreaming,
      icon: 'data-icon',
      label: 'Data',
      loading: false,
    },
  }), [props.previewReady, props.isIframeFetching, props.isStreaming, props.code]);

  // Determine if we should show view controls
  const showViewControls = useMemo(() => {
    return !!(props.code && props.code.length > 0);
  }, [props.code]);

  return {
    viewControls,
    showViewControls
  };
}
