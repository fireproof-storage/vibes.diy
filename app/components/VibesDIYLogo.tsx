import React from 'react';

interface VibesDIYLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: number;
  width?: number;
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

// Image-based logo using the provided PNG file
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({ 
  className,  
  ...props 
}) => {
  return (
    <div 
      className={`inline-block ${className || ''}`} 
      {...props}
    >
      <img
        src="/vibes-diy-alpha.png"
        alt="Vibes DIY Logo"
        width="1272" 
        height="666"
      />
    </div>
  );
};

export { VibesDIYLogoTXT };
export default VibesDIYLogo;
