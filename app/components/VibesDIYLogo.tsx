import React from 'react';
import DIYLogo from './diyLogo-svg';
import { dark } from './colorways';
import { useTheme } from '../contexts/ThemeContext';

type ColorwayName = keyof typeof dark;

interface VibesDIYLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: number;
  width?: number;
  maxHeight?: number;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  colorway?: ColorwayName;
}
const names = Object.keys(dark);

let _randomColor: ColorwayName | undefined;

export const randomColorway = (): ColorwayName => {
  if (!_randomColor) {
    _randomColor = names[Math.floor(Date.now() / 10000) % names.length] as ColorwayName;
  }
  return _randomColor;
};

// SVG-based logo using the imported SVG component
const VibesDIYLogo: React.FC<VibesDIYLogoProps> = ({
  className,
  width,
  height,
  colorway,
  ...props
}) => {
  // Use theme context instead of maintaining local state
  const { isDarkMode } = useTheme();

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
        <DIYLogo isDarkMode={isDarkMode} colorway={colorway || randomColorway()} />
      </div>
    </div>
  );
};

export default VibesDIYLogo;
