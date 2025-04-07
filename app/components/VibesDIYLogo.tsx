import React from 'react';

interface VibesDIYLogoProps extends React.HTMLAttributes<HTMLSpanElement> {}

// Regular text-based logo
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ className, ...props }) => {
  return (
    <span className={`inline-block ${className || ''}`} {...props}>
      Vibes{' '}
      <sub style={{ display: 'inline-block', transform: 'rotate(-8deg)' }}>
        <strong>DIY</strong>
      </sub>
    </span>
  );
};

// SVG-based logo with solid colors
const AnimatedVibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ className, ...props }) => {
  return (
    <span className={`inline-block ${className || ''}`} {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 140 40"
        className="svg-logo"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <text
          x="20"
          y="26"
          fontFamily="Inter, sans-serif"
          fontSize="24"
          fontWeight="bold"
          fill="currentColor"
        >
          Vibes
        </text>
        <text
          x="90"
          y="28"
          fontFamily="Inter, sans-serif"
          fontSize="16"
          fontWeight="bold"
          fill="currentColor"
          transform="rotate(-8, 93, 28)"
        >
          DIY
        </text>
      </svg>
    </span>
  );
};

export { AnimatedVibesDIYLogo };
export default VibesDIYLogo;
