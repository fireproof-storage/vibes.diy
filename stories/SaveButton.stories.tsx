import type { Meta, StoryObj } from '@storybook/react';
import { SaveButton } from '../app/components/ResultPreview/SaveButton';

const meta = {
  title: 'Production Components/SaveButton',
  component: SaveButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `The SaveButton component from the production codebase. This button shows when there are unsaved changes and provides visual feedback for syntax errors. It has responsive design with full text on desktop and icon-only on mobile.

**Key features:**
- Only renders when \`hasChanges\` is true
- Shows error count and disables when there are syntax errors
- Responsive design (text + icon on desktop, icon-only on mobile)
- Custom minidisc icon for retro aesthetic
- Proper accessibility with titles and disabled states`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: {
      description: 'Callback function called when the save button is clicked',
      action: 'clicked',
    },
    hasChanges: {
      description: 'Whether there are unsaved changes. Button only renders when true.',
      control: 'boolean',
    },
    syntaxErrorCount: {
      description: 'Number of syntax errors. When > 0, button shows error count and becomes disabled.',
      control: { type: 'number', min: 0, max: 10 },
    },
  },
  args: {
    onClick: () => console.log('Save clicked'),
  },
} satisfies Meta<typeof SaveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Hidden state (no changes)
export const Hidden: Story = {
  args: {
    hasChanges: false,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'When `hasChanges` is false, the button does not render at all.',
      },
    },
  },
};

// Default state (has changes, no errors)
export const Default: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Normal save state with changes ready to save. Button is blue and enabled.',
      },
    },
  },
};

// Single syntax error
export const SingleError: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'When there is 1 syntax error, button shows "1 Error" and is disabled with red styling.',
      },
    },
  },
};

// Multiple syntax errors
export const MultipleErrors: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 5,
  },
  parameters: {
    docs: {
      description: {
        story: 'When there are multiple syntax errors, button shows "5 Errors" (plural) and is disabled.',
      },
    },
  },
};

// Edge case: Large error count
export const ManyErrors: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 12,
  },
  parameters: {
    docs: {
      description: {
        story: 'Testing with a larger number of errors to see how the UI handles it.',
      },
    },
  },
};

// Mobile viewport demonstration  
export const MobileViewport: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    viewport: {
      defaultViewport: 'belowSm',
    },
    docs: {
      description: {
        story: 'Shows the SaveButton at 639px viewport (below sm: breakpoint) to demonstrate the mobile icon-only version.',
      },
    },
  },
};

// Smallest render demonstration
export const SmallestRender: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,  
  },
  parameters: {
    viewport: {
      defaultViewport: 'small',
    },
    docs: {
      description: {
        story: 'Shows the SaveButton at 440px viewport - the smallest practical render showing the 32×32px icon-only button.',
      },
    },
  },
};

// Tiny viewport (iPhone SE size)
export const TinyViewport: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    viewport: {
      defaultViewport: 'tiny',
    },
    docs: {
      description: {
        story: 'Shows the SaveButton at 375px viewport (iPhone SE width) - ultra-compact mobile view.',
      },
    },
  },
};

// Viewport testing instructions
export const ViewportTesting: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  decorators: [
    (Story) => (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <h3 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">How to Test Responsive Behavior</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>Use the <strong>viewport selector</strong> in the Storybook toolbar</li>
            <li>Try: "Below SM (639px)" for mobile version</li>
            <li>Try: "Small Mobile (440px)" for smallest render</li>
            <li>Try: "Tiny (375px)" for iPhone SE size</li>
            <li>Desktop shows: icon + "Save" text</li>
            <li>Mobile shows: 32×32px icon only</li>
          </ol>
        </div>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Use the viewport toolbar to switch between different screen sizes and see the responsive behavior. The mobile version (below 640px) shows only a 32×32px icon.',
      },
    },
  },
};