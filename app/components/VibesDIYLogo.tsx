import React from 'react';
import DIYLogo from './diyLogo-svg';
import { dark } from './colorways';

type ColorwayName = keyof typeof dark;

interface VibesDIYLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: number;
  width?: number;
  maxHeight?: number;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  colorway?: ColorwayName;
}

// SVG-based logo using the imported SVG component
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({
  className,
  width,
  height,
  colorway,
  ...props
}) => {
  // Use a simplified approach to detect dark mode based on the existing system
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Check dark mode on mount and observe changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Function to check dark mode
      const checkDarkMode = () => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      };

      // Initial check
      checkDarkMode();

      // Create observer for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            checkDarkMode();
          }
        });
      });

      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  const aspectRatio = 372 / 123; // Matches SVG viewBox dimensions

  return (
    <div
      className={className}
      style={{
        width: width ? `${width}px` : '372px',
        height: height ? `${height}px` : width ? `${width / aspectRatio}px` : '123px',
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}
    >
      <div
        style={{
          transition: 'filter 0.3s ease',
          display: 'flex',
          width: '100%',
          transformOrigin: 'center center',
          minHeight: 0,
        }}
      >
        <DIYLogo isDarkMode={isDarkMode} colorway={colorway} />
      </div>
    </div>
  );
};

export default VibesDIYLogo;
