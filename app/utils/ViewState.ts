import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { encodeTitle } from '../components/SessionSidebar/utils';
import { CALLAI_API_KEY } from '../config/env';

// Helper to detect mobile viewport
export const isMobileViewport = () => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

export type ViewType = 'preview' | 'code' | 'data';

// Define the shape of the state returned by the hook
export type ViewState = {
  currentView: ViewType;
  displayView: ViewType;
  navigateToView: (view: ViewType) => void;
  viewControls: {
    preview: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
    code: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
    data: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
  };
  showViewControls: boolean;
  sessionId: string | undefined;
  encodedTitle: string;
  mobilePreviewShown: boolean;
  setMobilePreviewShown: (mobilePreviewShown: boolean) => void;
  userClickedBack: boolean;
  setUserClickedBack: (userClickedBack: boolean) => void;
  handleBackAction: () => void;
  isDarkMode: boolean;
  isIframeFetching: boolean;
  setIsIframeFetching: (isIframeFetching: boolean) => void;
  filesContent: {
    '/App.jsx': {
      code: string;
      active: boolean;
    };
  };
  showWelcome: boolean;
};

// Props for the ViewState hook
export type ViewStateProps = {
  sessionId?: string;
  title?: string;
  code: string;
  isStreaming: boolean;
  previewReady: boolean;
  isIframeFetching?: boolean;
  initialLoad?: boolean;
  // Mobile support
  isMobileView?: boolean;
  onBackClicked?: () => void;
  // Preview-related callbacks
  onPreviewLoaded?: () => void;
  onScreenshotCaptured?: (data: string | null) => void;
  // Code-related props
  codeReady?: boolean;
  dependencies?: Record<string, string>;
};

// Rename the hook internally to avoid naming conflicts
function useViewStateInternal(props: ViewStateProps): ViewState {
  const { sessionId: paramSessionId, title: paramTitle } = useParams<{
    sessionId: string;
    title: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Default values for conditional logic
  const initialViewBehavior = props.initialLoad !== false; // Default to true if not explicitly false

  // Consolidate session and title from props or params
  const sessionId = props.sessionId || paramSessionId;
  const title = props.title || paramTitle;
  const encodedTitle = title ? encodeTitle(title) : '';

  // Derive view from URL path
  const getViewFromPath = (): ViewType => {
    if (location.pathname.endsWith('/app')) return 'preview';
    if (location.pathname.endsWith('/code')) return 'code';
    if (location.pathname.endsWith('/data')) return 'data';
    return 'preview'; // Default
  };

  const currentView = getViewFromPath();

  // Track previous states to determine transitions
  const wasStreamingRef = useRef(props.isStreaming);
  const hadCodeRef = useRef(props.code && props.code.length > 0);
  const wasPreviewReadyRef = useRef(props.previewReady);
  const initialNavigationDoneRef = useRef(false);

  // Mobile-specific state
  const [mobilePreviewShown, setMobilePreviewShown] = useState(true);
  const [userClickedBack, setUserClickedBack] = useState(false);

  // Auto-navigate based on app state changes
  useEffect(() => {
    // Don't auto-navigate if we don't have session and title info for URLs
    if (!sessionId || !encodedTitle) return;

    // First message (no previous code), show code view when code starts streaming
    // We don't change the URL path so it can later auto-navigate to app view
    if (
      props.isStreaming &&
      !wasStreamingRef.current &&
      (!hadCodeRef.current || props.code.length === 0) &&
      // Don't auto-switch on mobile
      !isMobileViewport()
    ) {
      // For the initial code streaming, we want to display code without changing URL
      // This is handled by the component that uses this hook
      initialNavigationDoneRef.current = true;

      // Only if we're already at a specific view (app, code, data), should we navigate
      const path = location.pathname;
      const basePath = path.replace(/\/(app|code|data)$/, '');
      if (path !== basePath) {
        navigate(`/chat/${sessionId}/${encodedTitle}`);
      }
    }

    // When preview becomes ready, auto jump to preview view, but respect explicit navigation
    // AND don't redirect to app during active streaming
    if (props.previewReady && !wasPreviewReadyRef.current) {
      // Don't redirect to app if user is explicitly in data or code view OR if still streaming
      // Also don't redirect on mobile devices
      const isInDataView = location.pathname.endsWith('/data');
      const isInCodeView = location.pathname.endsWith('/code');
      if (!isInDataView && !isInCodeView && !props.isStreaming && !isMobileViewport()) {
        navigate(`/chat/${sessionId}/${encodedTitle}/app`);
      }
    }

    // Handle the state when streaming ENDS and preview is ready
    // This ensures we navigate to the app view after streaming completes
    if (!props.isStreaming && wasStreamingRef.current && props.previewReady) {
      // Don't redirect to app if user is explicitly in data or code view
      // Also don't redirect on mobile devices
      const isInDataView = location.pathname.endsWith('/data');
      const isInCodeView = location.pathname.endsWith('/code');
      const isInSpecificView = isInDataView || isInCodeView;

      // Check if streaming has just ended
      const streamingJustEnded = !props.isStreaming && wasStreamingRef.current;

      // Navigate if: not in specific view AND (not streaming OR streaming just ended)
      if (!isInSpecificView && (!props.isStreaming || streamingJustEnded)) {
        // Navigate to app view
        if (!isInDataView && !isInCodeView && !isMobileViewport()) {
          navigate(`/chat/${sessionId}/${encodedTitle}/app`);
          // Also set previewShown to true on mobile
          setMobilePreviewShown(true);
        }
      }
    }

    // Update refs for next comparison
    wasStreamingRef.current = props.isStreaming;
    hadCodeRef.current = props.code && props.code.length > 0;
    wasPreviewReadyRef.current = props.previewReady;
  }, [
    props.isStreaming,
    props.previewReady,
    props.code,
    sessionId,
    encodedTitle,
    navigate,
    setMobilePreviewShown,
  ]);

  // We handle the initial view display without changing the URL
  // This allows for proper auto-navigation to app view when preview is ready
  const viewControls = {
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
  };

  // Handle back action
  const handleBackAction = useCallback(() => {
    if (props.isStreaming) {
      setUserClickedBack(true);
    }
    setMobilePreviewShown(false);
    if (props.onBackClicked) {
      props.onBackClicked();
    }
  }, [props.isStreaming, props.onBackClicked]);

  // Navigate to a view (explicit user action)
  const navigateToView = useCallback(
    (view: ViewType) => {
      if (!viewControls[view].enabled) return;

      // Always show mobile preview when changing views
      setMobilePreviewShown(true);

      // Reset userClickedBack when manually selecting a view
      if (props.isStreaming) {
        setUserClickedBack(false);
      }

      if (sessionId && encodedTitle) {
        const suffix = view === 'preview' ? 'app' : view;
        navigate(`/chat/${sessionId}/${encodedTitle}/${suffix}`);
      }
    },
    [viewControls, sessionId, encodedTitle, props.isStreaming, navigate, setMobilePreviewShown]
  );

  // Only show view controls when we have content or a valid session
  const showViewControls: boolean = !!(
    (props.code && props.code.length > 0) ||
    (sessionId && sessionId.length > 0)
  );

  // Determine what view should be displayed (may differ from URL-based currentView)
  // During streaming, we always show code view regardless of the URL
  // On mobile, don't force code view during streaming
  const displayView = props.isStreaming && !isMobileViewport() ? 'code' : currentView;

  // State for iframe functionality
  const [isIframeFetching, setIsIframeFetching] = useState(!!props.isIframeFetching);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Initial code loading - show code view
  useEffect(() => {
    if (props.code && props.code.length > 0 && initialViewBehavior) {
      // Check if we're currently on the base path (no specific view)
      const path = location.pathname;
      const basePath = path.replace(/\/(app|code|data)$/, '');
      if (path === basePath && !path.endsWith('/code') && !path.endsWith('/data')) {
        navigateToView('code');
      }
    }
  }, [props.code, location.pathname, initialViewBehavior, navigateToView]); // Depend only on code for initial check

  // Theme detection effect
  useEffect(() => {
    // Add a small delay to ensure the app's theme detection has run first
    const timeoutId = setTimeout(() => {
      // Check if document has the dark class
      const hasDarkClass = document.documentElement.classList.contains('dark');
      // Set the theme state
      setIsDarkMode(hasDarkClass);

      // Set up observer to watch for class changes on document.documentElement
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const hasDarkClass = document.documentElement.classList.contains('dark');
            setIsDarkMode(hasDarkClass);
          }
        });
      });

      // Start observing
      observer.observe(document.documentElement, { attributes: true });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  // Iframe message handler
  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
          // respond with the API key
          const iframe = document.querySelector('iframe') as HTMLIFrameElement;
          iframe?.contentWindow?.postMessage({ type: 'callai-api-key', key: CALLAI_API_KEY }, '*');

          setMobilePreviewShown(true);

          // Add a small delay before navigation to ensure the iframe is fully ready
          // This helps prevent race conditions that might cause button click issues
          setTimeout(() => {
            // Navigate to the preview view when iframe is ready
            navigateToView('preview');

            // Notify parent component that preview is loaded
            if (props.onPreviewLoaded) {
              props.onPreviewLoaded();
            }
          }, 50); // Small delay to ensure state updates properly
        } else if (data.type === 'streaming' && data.state !== undefined) {
          setIsIframeFetching(data.state);
        } else if (data.type === 'screenshot' && data.data) {
          if (props.onScreenshotCaptured) {
            props.onScreenshotCaptured(data.data);
          }
        } else if (data.type === 'screenshot-error' && data.error) {
          console.warn('Screenshot capture error:', data.error);
          // Still call onScreenshotCaptured with null to signal that the screenshot failed
          if (props.onScreenshotCaptured) {
            props.onScreenshotCaptured(null);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [props.onPreviewLoaded, props.onScreenshotCaptured, navigateToView]);

  // Compute whether we should show welcome screen
  const showWelcome = !props.isStreaming && (!props.code || props.code.length === 0);

  // Calculate filesContent for iframe
  const filesContent = useMemo(() => {
    return {
      '/App.jsx': {
        code: props.code && !showWelcome ? props.code : '', // Use code if available, else empty string
        active: true,
      },
    };
  }, [props.code, showWelcome]);

  return {
    currentView,
    displayView,
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
    mobilePreviewShown,
    setMobilePreviewShown,
    userClickedBack,
    setUserClickedBack,
    handleBackAction,
    isDarkMode,
    isIframeFetching,
    setIsIframeFetching,
    filesContent,
    showWelcome,
  };
}

// Export the hook with the original name
export const useViewState = useViewStateInternal;
