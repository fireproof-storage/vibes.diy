import React from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';

// Create a mock CookieConsentContext
type CookieConsentContextType = {
  messageHasBeenSent: boolean;
  setMessageHasBeenSent: (value: boolean) => void;
};

// Create a React Context with the same name as the app's context
export const CookieConsentContext = React.createContext<CookieConsentContextType | undefined>(
  undefined
);

// Create a provider component that matches the one in the app
export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [messageHasBeenSent, setMessageHasBeenSent] = React.useState(false);

  return (
    <CookieConsentContext.Provider value={{ messageHasBeenSent, setMessageHasBeenSent }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

// Create a wrapper component that includes all necessary providers for testing
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    return <CookieConsentProvider>{children}</CookieConsentProvider>;
  };

  return render(ui, { wrapper: AllProviders, ...options });
}
