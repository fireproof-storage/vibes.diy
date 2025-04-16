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

// Keyframe animation for hue rotation
const hueRotateAnimation = `
  @keyframes rotateHue {
    0% {
      filter: hue-rotate(0deg);
    }
    100% {
      filter: hue-rotate(360deg);
    }
  }
`;

// Image-based logo using the provided PNG file
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ 
  className,  
  animateHue = true,
  ...props 
}) => {
  return (
    <>
      {animateHue && <style dangerouslySetInnerHTML={{ __html: hueRotateAnimation }} />}
      <div 
        className={`inline-block ${className || ''}`} 
        {...props}
      >
        <img
          src="/vibes-diy-alpha.png"
          alt="Vibes DIY Logo"
          width="1272" 
          height="666"
          className="dark:invert"
          style={{
            animation: animateHue ? 'rotateHue 30s linear infinite' : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
      </div>
    </>
  );
};

export { VibesDIYLogoTXT };
export default VibesDIYLogo;
