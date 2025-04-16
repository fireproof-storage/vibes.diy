import React from 'react';

interface VibesDIYLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: number;
  width?: number;
  animateHue?: boolean;
}

// Regular text-based logo
const VibesDIYLogoTXT: React.FC<VibesDIYLogoProps> = ({ className, ...props }) => {
  return (
    <span className={`inline-block ${className || ''}`} {...props}>
      Vibes{' '}
      <sub style={{ display: 'inline-block', transform: 'rotate(-8deg)' }}>
        <strong>DIY</strong>
      </sub>
    </span>
  );
};

// Define the keyframe animations for both light and dark modes
const animationStyles = `
@keyframes rotateHue {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

@keyframes rotateHueDark {
  0% { filter: invert(100%) hue-rotate(0deg); }
  100% { filter: invert(100%) hue-rotate(360deg); }
}
`;

// Image-based logo using the provided PNG file
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ 
  className,  
  animateHue = true,
  ...props 
}) => {
  // Control light/dark mode detection with a hook if we need to
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  // Check for dark mode on mount and when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initial check
      setIsDarkMode(document.documentElement.classList.contains('dark'));
      
      // Create an observer to detect dark mode changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
          }
        });
      });
      
      // Start observing
      observer.observe(document.documentElement, { attributes: true });
      
      // Cleanup
      return () => observer.disconnect();
    }
  }, []);
  
  return (
    <>
      {animateHue && (
        <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      )}
      <div 
        className={`inline-block ${className || ''}`} 
        {...props}
      >
        <img
          src="/vibes-diy-alpha.png"
          alt="Vibes DIY Logo"
          width="1272" 
          height="666"
          className={animateHue ? undefined : 'dark:invert'}
          style={{
            animation: animateHue 
              ? isDarkMode 
                ? 'rotateHueDark 30s linear infinite' 
                : 'rotateHue 30s linear infinite'
              : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
      </div>
    </>
  );
};

export { VibesDIYLogoTXT };
export default VibesDIYLogo;
