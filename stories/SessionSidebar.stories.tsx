import type { Meta, StoryObj } from '@storybook/react';
import { MockSessionSidebar } from './SessionSidebar';

const meta = {
  title: 'Components/SessionSidebar',
  component: MockSessionSidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A navigation sidebar component with menu items, authentication status, and theme-aware styling. Features slide-in animation and click-outside-to-close behavior.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isVisible: {
      description: 'Whether the sidebar is visible',
      control: 'boolean',
    },
    isAuthenticated: {
      description: 'User authentication status',
      control: 'boolean',
    },
    isLoading: {
      description: 'Whether authentication is loading',
      control: 'boolean',
    },
    isPolling: {
      description: 'Whether login polling is active',
      control: 'boolean',
    },
    pollError: {
      description: 'Error message from login polling',
      control: 'text',
    },
    onClose: {
      description: 'Callback when sidebar should close',
      action: 'closed',
    },
  },
} satisfies Meta<typeof MockSessionSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Closed state (default)
export const Closed: Story = {
  args: {
    isVisible: false,
    isAuthenticated: false,
    isLoading: false,
  },
};

// Open state - basic
export const Open: Story = {
  args: {
    isVisible: true,
    isAuthenticated: false,
    isLoading: false,
  },
};

// Open with user authenticated
export const OpenAuthenticated: Story = {
  args: {
    isVisible: true,
    isAuthenticated: true,
    isLoading: false,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    isVisible: true,
    isAuthenticated: false,
    isLoading: true,
  },
};

// Login polling state
export const LoginPolling: Story = {
  args: {
    isVisible: true,
    isAuthenticated: false,
    isLoading: false,
    isPolling: true,
  },
};

// Login polling with error
export const LoginPollingWithError: Story = {
  args: {
    isVisible: true,
    isAuthenticated: false,
    isLoading: false,
    isPolling: false,
    pollError: 'Authentication flow could not be initiated.',
  },
};
