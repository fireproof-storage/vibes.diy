import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { encodeTitle } from '../components/SessionSidebar/utils';
import { CALLAI_API_KEY } from '../config/env';

export type ViewType = 'preview' | 'code' | 'data';

export function useViewState(props: {
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
}) {
  const { sessionId: paramSessionId, title: paramTitle } = useParams<{
    sessionId: string;
    title: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Auto-navigate based on app state changes
  useEffect(() => {
    // Don't auto-navigate if we don't have session and title info for URLs
    if (!sessionId || !encodedTitle) return;

    // First message (no previous code), show code view when code starts streaming
    // We don't change the URL path so it can later auto-navigate to app view
    if (
      props.isStreaming &&
      !wasStreamingRef.current &&
      (!hadCodeRef.current || props.code.length === 0)
    ) {
      // For the initial code streaming, we want to display code without changing URL
      // This is handled by the component that uses this hook
      initialNavigationDoneRef.current = true;

      // Only if we're already at a specific view (app, code, data), should we navigate
      const path = location.pathname;
      const basePath = path.replace(/\/(app|code|data)$/, '');

      // If current path has a view suffix, remove it for auto-navigation to work
      if (path !== basePath) {
        navigate(`/chat/${sessionId}/${encodedTitle}`);
      }
    }

    // When preview becomes ready, auto jump to preview view, but respect explicit navigation
    // AND don't redirect to app during active streaming
    if (props.previewReady && !wasPreviewReadyRef.current) {
      // Don't redirect to app if user is explicitly in data or code view OR if still streaming
      const isInDataView = location.pathname.endsWith('/data');
      const isInCodeView = location.pathname.endsWith('/code');
      if (!isInDataView && !isInCodeView && !props.isStreaming) {
        navigate(`/chat/${sessionId}/${encodedTitle}/app`);
      }
    }

    // Handle the state when streaming ENDS and preview is ready
    // This ensures we navigate to the app view after streaming completes
    if (!props.isStreaming && wasStreamingRef.current && props.previewReady) {
      // Don't redirect to app if user is explicitly in data or code view
      const isInDataView = location.pathname.endsWith('/data');
      const isInCodeView = location.pathname.endsWith('/code');
      if (!isInDataView && !isInCodeView) {
        navigate(`/chat/${sessionId}/${encodedTitle}/app`);
      }
    }

    // Update refs for next comparison
    wasStreamingRef.current = props.isStreaming;
    hadCodeRef.current = props.code && props.code.length > 0;
    wasPreviewReadyRef.current = props.previewReady;
  }, [props.isStreaming, props.previewReady, props.code, sessionId, encodedTitle, navigate]);

  // We handle the initial view display without changing the URL
  // This allows for proper auto-navigation to app view when preview is ready
  useEffect(() => {
    // The actual display of code view is handled by the component that uses this hook
    // We don't navigate to /code on initial load anymore
  }, []);

  // Access control data
  const viewControls = {
    preview: {
      enabled: props.previewReady,
      icon: 'app-icon',
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

  // Mobile-specific state
  const [mobilePreviewShown, setMobilePreviewShown] = useState(true);
  const [userClickedBack, setUserClickedBack] = useState(false);

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
    [viewControls, sessionId, encodedTitle, props.isStreaming]
  );

  // Only show view controls when we have content or a valid session
  const showViewControls =
    (props.code && props.code.length > 0) || (sessionId && sessionId.length > 0);

  // Determine what view should be displayed (may differ from URL-based currentView)
  // During streaming, we always show code view regardless of the URL
  const displayView = props.isStreaming ? 'code' : currentView;

  // State for iframe functionality
  const [isIframeFetching, setIsIframeFetching] = useState(!!props.isIframeFetching);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Sync with external isIframeFetching if provided
  useEffect(() => {
    if (props.isIframeFetching !== undefined) {
      setIsIframeFetching(props.isIframeFetching);
    }
  }, [props.isIframeFetching]);

  // Effect to set initial view to 'code' if there's no code yet
  useEffect(() => {
    if (!props.code || props.code.length === 0) {
      const path = location.pathname;
      // Only switch if we're not already on a specific route or the base chat route
      const basePath = path.replace(/\/(app|code|data)$/, '');
      // Check if current path is just the base path (no suffix)
      if (path === basePath && !path.endsWith('/code') && !path.endsWith('/data')) {
        navigateToView('code');
      }
    }
  }, [props.code, location.pathname]); // Depend only on code for initial check

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

          // Navigate to the preview view when iframe is ready
          navigateToView('preview');

          // Notify parent component that preview is loaded
          if (props.onPreviewLoaded) {
            props.onPreviewLoaded();
          }
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
    currentView, // The view based on URL (for navigation)
    displayView, // The view that should actually be displayed
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
    // Mobile-specific state
    mobilePreviewShown,
    setMobilePreviewShown,
    userClickedBack,
    setUserClickedBack,
    handleBackAction,
    // Iframe-related state
    isDarkMode,
    isIframeFetching,
    setIsIframeFetching,
    filesContent,
    showWelcome,
  };
}
