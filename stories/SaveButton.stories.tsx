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
- Proper accessibility with titles and disabled states

**Testing responsive behavior:** Use the viewport selector in the Storybook toolbar to test different screen sizes. Try "Below SM (639px)" or "Small Mobile (440px)" to see the mobile icon-only version.`,
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

// No changes state
export const NoChanges: Story = {
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

