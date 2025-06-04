import { type ReactNode } from 'react';
import { ThemeContext } from '../../app/contexts/ThemeContext';

interface MockThemeProviderProps {
  isDarkMode?: boolean;
  children: ReactNode;
}

/**
 * A mock ThemeProvider for testing components that use the useTheme hook
 */
export function MockThemeProvider({ isDarkMode = false, children }: MockThemeProviderProps) {
  return <ThemeContext.Provider value={{ isDarkMode }}>{children}</ThemeContext.Provider>;
}
