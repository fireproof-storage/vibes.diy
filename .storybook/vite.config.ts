import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Separate Vite config for Storybook that excludes React Router
export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
  ],
  define: {
    'process.env.DISABLE_REACT_ROUTER': '"true"',
  },
  json: {
    stringify: true,
  },
});