// Theme system

export type Theme = 'neobrutalism' | 'rainbow' | 'cyberpunk' | 'minimal';

export const themes = {
  neobrutalism: {
    button: {
      border: 'border-2 border-black',
      shadow: 'shadow-[4px_4px_0px_0px_black]',
      radius: 'rounded-[5px]',
      active: 'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
      normal: 'bg-blue-500 text-white hover:bg-blue-600',
      error: 'bg-red-500 text-white hover:bg-red-600',
    },
  },
  rainbow: {
    button: {
      border: 'border-2 border-black',
      shadow: 'shadow-lg',
      radius: 'rounded-lg',
      active: 'active:scale-95',
      normal: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      error: 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
    },
  },
  // Placeholder
  cyberpunk: {
    button: {
      border: 'border border-cyan-400',
      shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.5)]',
      radius: 'rounded-none',
      active: 'active:brightness-110',
      normal: 'bg-black text-cyan-400 hover:bg-cyan-900',
      error: 'bg-black text-red-400 hover:bg-red-900',
    },
  },
  minimal: {
    button: {
      border: 'border border-gray-300',
      shadow: 'shadow-sm',
      radius: 'rounded-md',
      active: 'active:bg-gray-100',
      normal: 'bg-white text-gray-900 hover:bg-gray-50',
      error: 'bg-red-50 text-red-700 hover:bg-red-100',
    },
  },
};

// Helper function to get theme classes
export function getButtonClasses(
  theme: Theme = 'neobrutalism',
  variant: 'normal' | 'error' = 'normal'
) {
  const themeConfig = themes[theme].button;
  return {
    base: `inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${themeConfig.border} ${themeConfig.radius}`,
    shadow: themeConfig.shadow,
    active: themeConfig.active,
    variant: variant === 'error' ? themeConfig.error : themeConfig.normal,
  };
}
