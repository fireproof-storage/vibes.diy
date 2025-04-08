import { useEffect, useState } from 'react';

// Hook to detect and track dark mode state
export function useThemeDetection() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Effect to detect dark mode
  useEffect(() => {
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

  return { isDarkMode };
}
