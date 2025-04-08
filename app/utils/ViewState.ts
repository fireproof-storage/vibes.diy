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
  
  // State for iframe functionality
  const [isIframeFetching, setIsIframeFetching] = useState(!!props.isIframeFetching);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  
  // Define viewControls before navigateToView to avoid the "used before declaration" error
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
  
  // Navigate to a view (explicit user action) - define this before it's used in useEffect
  const navigateToView = useCallback(
    (view: ViewType) => {
      // Always allow navigation to code view
      // For data view, only block during streaming
      // For preview, ensure preview is ready
      const shouldBlock = 
        (view === 'preview' && !viewControls[view].enabled) || 
        (view === 'data' && props.isStreaming);
      
      if (shouldBlock) return;

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
  
  // Auto-navigate based on app state changes
  useEffect(() => {
    // Don't auto-navigate if we don't have session and title info for URLs
    if (!sessionId || !encodedTitle) return;

    // Get current path information for determining navigation behavior
    const path = location.pathname;
    const basePath = path.replace(/\/(app|code|data)$/, '');
    const isInDataView = path.endsWith('/data');
    const isInCodeView = path.endsWith('/code');
    const isInExplicitView = isInDataView || isInCodeView;
    const isMobile = isMobileViewport();

    // RULE: First Message Behavior
    // When code starts streaming for the first time:
    // - Show code view (but don't change URL path)
    // - On mobile, stay on chat (no URL change)
    if (
      props.isStreaming &&
      !wasStreamingRef.current &&
      (!hadCodeRef.current || props.code.length === 0)
    ) {
      // Mark that we've handled the initial navigation
      initialNavigationDoneRef.current = true;

      // If we're already at a specific view path (shouldn't happen normally),
      // reset to base path to allow later auto-navigation to work
      if (path !== basePath) {
        navigate(`/chat/${sessionId}/${encodedTitle}`);
      }

      // No need to set displayView, this is handled in the computed displayView logic
    }

    // RULE: When Preview Becomes Ready
    // - Auto-navigate to App view (/app) only if:
    //   1. Preview is now ready (and wasn't before)
    //   2. URL doesn't have explicit /code or /data paths
    //   3. Not currently streaming
    if (props.previewReady && !wasPreviewReadyRef.current && !props.isStreaming) {
      // Only auto-navigate if not in explicit code/data view
      if (!isInExplicitView) {
        // For desktop: Navigate to app view
        if (!isMobile) {
          navigateToView('preview');
        }
        // For mobile: Show preview
        setMobilePreviewShown(true);
      }
    }

    // RULE: Streaming Ends with Preview Ready
    // When streaming ends and preview is ready, auto-navigate to app view
    // but only if URL doesn't have explicit /code or /data paths
    if (!props.isStreaming && wasStreamingRef.current && props.previewReady) {
      // We are in this branch, so streaming has just ended

      // Only auto-navigate when not in explicit code/data view
      if (!isInExplicitView) {
        // For desktop: Navigate to app view
        if (!isMobile) {
          navigateToView('preview');
        }
        // For mobile: Show preview
        setMobilePreviewShown(true);
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
    navigateToView,
    location.pathname,
    setMobilePreviewShown,
  ]);

  // We handle the initial view display without changing the URL
  // This allows for proper auto-navigation to app view when preview is ready

  // Only show view controls when we have content or a valid session
  const showViewControls: boolean = !!(
    (props.code && props.code.length > 0) ||
    (sessionId && sessionId.length > 0)
  );

  // Determine what view should be displayed (may differ from URL-based currentView)
  let displayView: ViewType;

  if (isMobileViewport()) {
    // MOBILE BEHAVIOR:
    // - Default to showing chat/code view when streaming
    // - Show app preview when mobilePreviewShown is true (after ready)
    displayView = mobilePreviewShown ? 'preview' : 'code';
  } else {
    // DESKTOP BEHAVIOR:
    // - Default to the view determined by the URL (currentView)
    // - Override during first message streaming to show code without changing URL
    if (props.isStreaming && !initialNavigationDoneRef.current) {
      // First message, code is streaming - show code view
      displayView = 'code';
    } else if (
      initialNavigationDoneRef.current &&
      !props.previewReady &&
      !location.pathname.endsWith('/app') &&
      !location.pathname.endsWith('/code') &&
      !location.pathname.endsWith('/data')
    ) {
      // Show code preview until preview is ready and URL doesn't specify a view
      displayView = 'code';
    } else {
      // Otherwise use the URL-based current view
      displayView = currentView;
    }
  }

  // Compute whether we should show welcome screen
  const showWelcome = !props.isStreaming && (!props.code || props.code.length === 0);

  // Initial code loading - default to code view without changing URL
  useEffect(() => {
    // Only execute if we have code to display and initialViewBehavior is true
    if (props.code && props.code.length > 0 && initialViewBehavior) {
      // Check if we're currently on the base path (no specific view)
      const path = location.pathname;
      const basePath = path.replace(/\/(app|code|data)$/, '');

      // RULE: Initial state should show code preview without altering URL path
      // Only if we're at the base path and have not done initial navigation yet
      if (path === basePath && !initialNavigationDoneRef.current && !isMobileViewport()) {
        // We no longer navigate to /code here - we just set a flag
        // This ensures the base path is preserved for later auto-navigation to /app
        initialNavigationDoneRef.current = true;
        // The display of code view is handled by the computed displayView logic
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

          // Get current path information
          const path = location.pathname;
          const isInDataView = path.endsWith('/data');
          const isInCodeView = path.endsWith('/code');
          const isInSpecificView = isInDataView || isInCodeView;
          const isMobile = isMobileViewport();

          // Add a small delay before navigation to ensure the iframe is fully ready
          // This helps prevent race conditions that might cause button click issues
          setTimeout(() => {
            // Only auto-navigate to preview if:
            // 1. Not in a specific view (code or data)
            // 2. Not on mobile device
            // 3. Not currently streaming
            if (!isInSpecificView && !isMobile && !props.isStreaming) {
              navigateToView('preview');
            }

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
