import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { encodeTitle } from '../components/SessionSidebar/utils';

export type ViewType = 'preview' | 'code' | 'data';

export function useViewState(props: {
  sessionId?: string;
  title?: string;
  code: string;
  isStreaming: boolean;
  previewReady: boolean;
  isIframeFetching?: boolean;
  initialLoad?: boolean;
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

  // Navigate to a view (explicit user action)
  const navigateToView = (view: ViewType) => {
    if (!viewControls[view].enabled) return;

    if (sessionId && encodedTitle) {
      const suffix = view === 'preview' ? 'app' : view;
      navigate(`/chat/${sessionId}/${encodedTitle}/${suffix}`);
    }
  };

  // Only show view controls when we have content or a valid session
  const showViewControls =
    (props.code && props.code.length > 0) || (sessionId && sessionId.length > 0);

  // Determine what view should be displayed (may differ from URL-based currentView)
  // During streaming, we always show code view regardless of the URL
  const displayView = props.isStreaming ? 'code' : currentView;

  return {
    currentView, // The view based on URL (for navigation)
    displayView, // The view that should actually be displayed
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
  };
}
