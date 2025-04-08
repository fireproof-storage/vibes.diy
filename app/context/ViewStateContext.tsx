import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useViewState } from '../hooks/viewState';
import type { ViewState, ViewStateProps } from '../hooks/viewState';

// Define the props that the Provider will need to initialize the hook
interface ViewStateProviderProps {
  children: ReactNode;
  initialProps: ViewStateProps;
}

// Create the context with a default value (can be null or a default state object)
// Using null and checking for it in the consumer hook is a common pattern
const ViewStateContext = createContext<ViewState | null>(null);

// Create the Provider component
export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({ children, initialProps }) => {
  const viewState = useViewState(initialProps);

  return <ViewStateContext.Provider value={viewState}>{children}</ViewStateContext.Provider>;
};

// Create a custom hook to consume the context easily and safely
export const useSharedViewState = (): ViewState => {
  const context = useContext(ViewStateContext);
  if (context === null) {
    throw new Error('useSharedViewState must be used within a ViewStateProvider');
  }
  return context;
};
