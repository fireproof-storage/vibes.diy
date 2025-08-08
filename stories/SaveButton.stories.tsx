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

// Responsive demonstration
export const ResponsiveDemo: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'On mobile viewports, only the icon is shown. Switch between desktop and mobile viewports to see the responsive behavior.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <p className="mb-4 text-sm text-gray-600">
          Toggle between desktop and mobile viewports in the toolbar to see responsive behavior.
        </p>
        <Story />
      </div>
    ),
  ],
};

// Interactive playground
export const InteractivePlayground: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  render: (args) => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 font-semibold">Desktop View</h3>
          <div className="flex items-center">
            <SaveButton {...args} />
          </div>
        </div>
        
        <div>
          <h3 className="mb-2 font-semibold">Mobile View (forced)</h3>
          <div className="flex items-center">
            <div style={{ 
              /* Force mobile button to show by hiding desktop version and showing mobile */
            }} className="[&>*>button:first-child]:!hidden [&>*>button:last-child]:!flex">
              <SaveButton {...args} />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="mb-2 font-semibold">440px Width Simulation</h3>
          <div className="border-2 border-dashed border-gray-300 p-4" style={{width: '440px'}}>
            <div className="mb-2 text-xs text-gray-500">Desktop version (forced):</div>
            <div className="flex items-center [&>*>button:first-child]:!flex [&>*>button:last-child]:!hidden">
              <SaveButton {...args} />
            </div>
            <div className="mt-4 mb-2 text-xs text-gray-500">Mobile version (forced - smallest render):</div>
            <div className="flex items-center [&>*>button:first-child]:!hidden [&>*>button:last-child]:!flex">
              <SaveButton {...args} />
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Usage Notes:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Button only appears when hasChanges is true</li>
            <li>When syntaxErrorCount &gt; 0, button becomes red and disabled</li>
            <li>On desktop: shows icon + text</li>
            <li>On mobile: shows icon only with tooltip</li>
          </ul>
        </div>
      </div>
    );
  },
};