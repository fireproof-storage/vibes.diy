import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { encodeTitle } from '../components/SessionSidebar/utils';

// Helper to detect mobile viewport
export const isMobileViewport = () => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

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

      // If current path has a view suffix, remove it for auto-navigation to work
      if (path !== basePath) {
        navigate(`/chat/${sessionId}/${encodedTitle}`);
      }
    }

    // As soon as previewReady becomes true, jump to preview view (app), UNLESS user is explicitly in data or code view
    // Remove mobile check to allow consistent behavior across all devices
    if (props.previewReady && !wasPreviewReadyRef.current) {
      console.log('[ViewState] 🚀 previewReady triggered! Checking if we should navigate to /app');
      const isInDataView = location.pathname.endsWith('/data');
      const isInCodeView = location.pathname.endsWith('/code');
      if (!isInDataView && !isInCodeView) {
        console.log('[ViewState] ✅ Navigating to /app view');
        navigate(`/chat/${sessionId}/${encodedTitle}/app`);
      } else {
        console.log('[ViewState] ⏸️ Not navigating - user already in specific view:', { isInDataView, isInCodeView });
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
  // If preview is ready, we prioritize showing it, even during streaming
  // Otherwise, during streaming on desktop, we show code view
  const displayView = 
    props.previewReady ? 'preview' :
    (props.isStreaming && !isMobileViewport()) ? 'code' : 
    currentView;

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
