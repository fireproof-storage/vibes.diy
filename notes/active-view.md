# Simplifying Routing and State Management for ResultPreviewHeaderContent

## Current Implementation Analysis

The current ResultPreviewHeaderContent component has several challenges:

1. **Overlapping Concerns**: URL routing, view state, loading states, and UI control are tightly coupled
2. **Redundant State**: activeView state exists alongside URL paths that also determine the view
3. **Complex Conditionals**: Multiple conditional checks for disabled states and view switching
4. **Manual URL Manipulation**: Direct path construction instead of using router capabilities

## Lean Solution: State Consolidation

A minimal approach focusing on reducing state redundancy and complexity:

```tsx
// ViewState.ts - Create a dedicated hook
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { encodeTitle } from '../utils';

export type ViewType = 'preview' | 'code' | 'data';

export function useViewState(props: {
  sessionId?: string;
  title?: string;
  code: string;
  isStreaming: boolean;
  previewReady: boolean;
}) {
  const { sessionId: paramSessionId, title: paramTitle } = useParams();
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

  // Access control data
  const viewControls = {
    preview: {
      enabled: props.previewReady,
      icon: 'app-icon',
      label: 'App',
      loading: !props.previewReady,
    },
    code: {
      enabled: true,
      icon: 'code-icon',
      label: 'Code',
      loading: props.isStreaming && !props.previewReady,
    },
    data: {
      enabled: !props.isStreaming,
      icon: 'data-icon',
      label: 'Data',
      loading: false,
    },
  };

  // Navigate to a view
  const navigateToView = (view: ViewType) => {
    if (!viewControls[view].enabled) return;

    if (sessionId && encodedTitle) {
      const suffix = view === 'preview' ? 'app' : view;
      navigate(`/chat/${sessionId}/${encodedTitle}/${suffix}`);
    }
  };

  // Whether to show view controls at all
  const showViewControls = props.code.length > 0;

  return {
    currentView,
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
  };
}
```

### Implementation:

```tsx
// ResultPreviewHeaderContent.tsx
const { currentView, navigateToView, viewControls, showViewControls, sessionId, encodedTitle } =
  useViewState({
    sessionId: propSessionId,
    title: propTitle,
    code,
    isStreaming,
    previewReady,
  });

// Then in JSX:
{
  showViewControls && (
    <div className="...">
      {Object.entries(viewControls).map(([view, control]) => (
        <button
          key={view}
          onClick={() => navigateToView(view as ViewType)}
          disabled={!control.enabled}
          className={classNames({
            'active-class': currentView === view,
            'disabled-class': !control.enabled,
            'base-class': true,
          })}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}
```

## Best Practice Solution: React Router + Context API

This solution separates concerns more thoroughly using established React patterns:

```tsx
// ViewStateContext.tsx
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { encodeTitle } from '../utils';

export type ViewType = 'preview' | 'code' | 'data';

interface ViewContextType {
  currentView: ViewType;
  navigateToView: (view: ViewType) => void;
  isViewEnabled: (view: ViewType) => boolean;
  isViewLoading: (view: ViewType) => boolean;
  showViewControls: boolean;
  sessionPath: string;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({
  children,
  code = '',
  isStreaming = false,
  previewReady = false,
  isIframeFetching = false,
}: {
  children: ReactNode;
  code?: string;
  isStreaming?: boolean;
  previewReady?: boolean;
  isIframeFetching?: boolean;
}) {
  const { sessionId, title } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const encodedTitle = title ? encodeTitle(title) : '';
  const sessionPath = sessionId && encodedTitle ? `/chat/${sessionId}/${encodedTitle}` : '';

  // Map path to view type
  const getViewFromPath = (): ViewType => {
    if (location.pathname.endsWith('/app')) return 'preview';
    if (location.pathname.endsWith('/code')) return 'code';
    if (location.pathname.endsWith('/data')) return 'data';
    return 'preview'; // Default fallback
  };

  const [currentView, setCurrentView] = useState<ViewType>(getViewFromPath());

  // Update view when URL changes
  useEffect(() => {
    setCurrentView(getViewFromPath());
  }, [location.pathname]);

  // Navigation logic
  const navigateToView = (view: ViewType) => {
    if (!isViewEnabled(view)) return;

    const suffix = view === 'preview' ? 'app' : view;
    if (sessionPath) {
      navigate(`${sessionPath}/${suffix}`);
    }
  };

  // Determine if a view is enabled
  const isViewEnabled = (view: ViewType): boolean => {
    if (view === 'preview') return previewReady;
    if (view === 'data') return !isStreaming;
    return true; // 'code' is always enabled
  };

  // Determine if a view is in loading state
  const isViewLoading = (view: ViewType): boolean => {
    if (view === 'preview') return isIframeFetching;
    if (view === 'code') return isStreaming && !previewReady;
    return false;
  };

  // Whether to show view controls at all
  const showViewControls = code.length > 0;

  return (
    <ViewContext.Provider
      value={{
        currentView,
        navigateToView,
        isViewEnabled,
        isViewLoading,
        showViewControls,
        sessionPath,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
}

// Custom hook to use the view context
export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
```

### Implementation:

```tsx
// In App.tsx or a parent component
<Router>
  <Route
    path="/chat/:sessionId/:title/:view?"
    element={
      <ViewProvider
        code={code}
        isStreaming={isStreaming}
        previewReady={previewReady}
        isIframeFetching={isIframeFetching}
      >
        <AppLayout />
      </ViewProvider>
    }
  />
</Router>;

// ResultPreviewHeaderContent.tsx - Now much simpler
function ResultPreviewHeaderContent() {
  const { currentView, navigateToView, isViewEnabled, isViewLoading, showViewControls } = useView();

  const viewButtons = [
    { view: 'preview' as ViewType, label: 'App', icon: 'eye-icon' },
    { view: 'code' as ViewType, label: 'Code', icon: 'code-icon' },
    { view: 'data' as ViewType, label: 'Data', icon: 'data-icon' },
  ];

  return (
    <div className="header-content">
      {/* Back button and other UI... */}

      {showViewControls && (
        <div className="view-switcher">
          {viewButtons.map(({ view, label, icon }) => (
            <button
              key={view}
              onClick={() => navigateToView(view)}
              disabled={!isViewEnabled(view)}
              className={classNames({
                active: currentView === view,
                disabled: !isViewEnabled(view),
                loading: isViewLoading(view),
              })}
            >
              <span className={`icon ${icon} ${isViewLoading(view) ? 'animate-spin-slow' : ''}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Additional UI elements... */}
    </div>
  );
}
```

## Benefits of These Approaches

### Lean Solution Benefits:

- Minimal additional code - just a custom hook
- No external dependencies beyond React Router
- Easier testing with consolidated logic
- Derived state instead of duplicated state

### Context Solution Benefits:

- Clear separation of concerns
- Single source of truth for view state
- Components only consume what they need
- State changes automatically propagate
- Easier to extend with new functionality

## Recommendations

1. **Start with the Lean Solution** if you need a quick improvement
2. **Adopt the Context Solution** for long-term maintainability as the app grows
3. **Keep URL as the source of truth** for current view rather than duplicating in state
4. **Derive disabled states** from core application state instead of passing them separately
