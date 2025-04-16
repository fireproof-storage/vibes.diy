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

// We'll generate the animation styles dynamically with the random initial hue

// Image-based logo using the provided PNG file
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ className, animateHue = true, ...props }) => {
  // Control light/dark mode detection with a hook if we need to
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Generate a random starting hue value (0-360)
  const [initialHue, setInitialHue] = React.useState(0);

  // Generate random initial hue and check dark mode on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set a random initial hue value
      setInitialHue(Math.floor(Math.random() * 360));

      // Initial dark mode check
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

  // Generate the animation styles with the random initial hue
  const animationStyles = `
    @keyframes rotateHue {
      0% { filter: hue-rotate(${initialHue}deg); }
      100% { filter: hue-rotate(${initialHue + 360}deg); }
    }

    @keyframes rotateHueDark {
      0% { filter: invert(100%) hue-rotate(${initialHue}deg); }
      100% { filter: invert(100%) hue-rotate(${initialHue + 360}deg); }
    }
  `;

  return (
    <>
      {animateHue && <style dangerouslySetInnerHTML={{ __html: animationStyles }} />}
      <div className={`inline-block ${className || ''}`} {...props}>
        <img
          src="/vibes-diy-alpha.png"
          alt="Vibes DIY Logo"
          width="1272"
          height="666"
          className={animateHue ? undefined : 'dark:invert'}
          style={{
            animation: animateHue
              ? isDarkMode
                ? 'rotateHueDark 300s linear infinite'
                : 'rotateHue 300s linear infinite'
              : 'none',
            transition: 'filter 0.3s ease',
          }}
        />
      </div>
    </>
  );
};

export { VibesDIYLogoTXT };
export default VibesDIYLogo;
