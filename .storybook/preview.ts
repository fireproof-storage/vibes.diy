import type { Preview } from '@storybook/react-vite';
import '../app/app.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      
      // Apply theme to document for Tailwind dark mode
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.dataset.theme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.dataset.theme = 'light';
        }
      }

      return Story();
    },
  ],
};

export default preview;
