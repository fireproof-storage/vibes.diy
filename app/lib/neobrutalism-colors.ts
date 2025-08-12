// Neobrutalism.dev Official Color System
// Based on https://github.com/ekmas/neobrutalism-components

export const neobrutalismColors = {
  // Base colors for structure
  background: {
    light: 'oklch(100% 0 0)', // white
    dark: 'oklch(23.93% 0 0)', // very dark
  },

  foreground: {
    light: 'oklch(0% 0 0)', // black
    dark: 'oklch(92.49% 0 0)', // near white
  },

  border: 'oklch(0% 0 0)', // black borders (signature neobrutalism)

  // Neobrutalism Color Palette
  // Each color has multiple shades for different use cases
  colors: {
    // Red variants
    red: {
      100: '#FFCCCB', // very light red
      200: '#FF9F9F', // light red
      300: '#fa7a7a', // medium red
      400: '#f76363', // bold red
      500: '#e53e3e', // strong red
    },

    // Orange variants
    orange: {
      100: '#FFE4CC', // very light orange
      200: '#FFC29F', // light orange
      300: '#FF965B', // medium orange
      400: '#fa8543', // bold orange
      500: '#dd6b20', // strong orange
    },

    // Yellow variants
    yellow: {
      100: '#FFF5CC', // very light yellow
      200: '#FFF066', // light yellow
      300: '#FFE500', // medium yellow (signature neobrutalism)
      400: '#FFE500', // bold yellow
      500: '#d69e2e', // strong yellow
    },

    // Lime variants
    lime: {
      100: '#E6FFCC', // very light lime
      200: '#B8FF9F', // light lime
      300: '#9dfc7c', // medium lime
      400: '#7df752', // bold lime
      500: '#68d391', // strong lime
    },

    // Cyan variants
    cyan: {
      100: '#CCF7FF', // very light cyan
      200: '#A6FAFF', // light cyan
      300: '#79F7FF', // medium cyan
      400: '#53f2fc', // bold cyan
      500: '#4dd5e6', // strong cyan
    },

    // Blue variants (current theme)
    blue: {
      100: '#E6F3FF', // very light blue
      200: '#CCE7FF', // light blue
      300: '#5294FF', // medium blue
      400: 'oklch(67.47% 0.1726 259.49)', // bold blue (current main)
      500: '#2b77e6', // strong blue
    },

    // Violet variants
    violet: {
      100: '#F0CCFF', // very light violet
      200: '#A8A6FF', // light violet
      300: '#918efa', // medium violet
      400: '#807dfa', // bold violet
      500: '#7A83FF', // strong violet
    },

    // Pink variants
    pink: {
      100: '#FFCCF9', // very light pink
      200: '#FFA6F6', // light pink
      300: '#fa8cef', // medium pink
      400: '#fa7fee', // bold pink
      500: '#ed64a6', // strong pink
    },

    // Neutral grays for structure
    gray: {
      50: '#f9f9f9',
      100: '#ececec',
      200: '#e3e3e3',
      300: '#cdcdcd',
      400: '#b4b4b4',
      500: '#9b9b9b',
      600: '#676767',
      700: '#424242',
      800: '#2f2f2f',
      900: '#1a1a1a',
    },
  },
};

// Theme configurations for different neobrutalism styles
export const neobrutalismThemes = {
  // Classic blue theme (current)
  classic: {
    main: neobrutalismColors.colors.blue[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.blue[300],
  },

  // Electric yellow theme
  electric: {
    main: neobrutalismColors.colors.yellow[300],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.yellow[400],
  },

  // Hot pink theme
  hot: {
    main: neobrutalismColors.colors.pink[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.pink[300],
  },

  // Cyber lime theme
  cyber: {
    main: neobrutalismColors.colors.lime[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.lime[300],
  },

  // Retro orange theme
  retro: {
    main: neobrutalismColors.colors.orange[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.orange[300],
  },

  // Cool cyan theme
  cool: {
    main: neobrutalismColors.colors.cyan[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.cyan[300],
  },

  // Violet dream theme
  dream: {
    main: neobrutalismColors.colors.violet[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.violet[300],
  },

  // Danger red theme
  danger: {
    main: neobrutalismColors.colors.red[400],
    mainForeground: neobrutalismColors.foreground.light,
    accent: neobrutalismColors.colors.red[300],
  },
};

// Helper function to apply a theme
export function applyNeobrutalismTheme(themeName: keyof typeof neobrutalismThemes) {
  const theme = neobrutalismThemes[themeName];
  return {
    '--main': theme.main,
    '--main-foreground': theme.mainForeground,
    '--accent': theme.accent,
  };
}
