import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NeobrutalistSaveButton } from '../app/components/ResultPreview/NeobrutalistSaveButton';

const meta = {
  title: 'Components/NeobrutalistSaveButton',
  component: NeobrutalistSaveButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `The NeobrutalistSaveButton component with brutal design aesthetics from the production codebase. This button shows when there are unsaved changes and provides visual feedback for syntax errors. It features the signature neobrutalism style with thick borders, bold shadows, and strong visual impact.

**Key features:**
- Only renders when \`hasChanges\` is true
- Shows error count and disables when there are syntax errors
- Responsive design (text + icon on desktop, icon-only on mobile)
- Neobrutalism styling with thick borders and dramatic shadows
- Custom minidisc icon for retro aesthetic
- Active state with shadow animation (button "presses" into the page)
- Proper accessibility with titles and disabled states

**Neobrutalism Design Elements:**
- Bold, black borders (2px thick)
- Dramatic drop shadows (4px offset)
- High contrast colors
- Strong, blocky typography
- Active state animations that simulate physical button press

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
      description:
        'Number of syntax errors. When > 0, button shows error count and becomes disabled.',
      control: { type: 'number', min: 0, max: 10 },
    },
  },
  args: {
    onClick: () => console.log('Save clicked'),
  },
} satisfies Meta<typeof NeobrutalistSaveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The default neobrutalist save button state when there are changes to save and no syntax errors.',
      },
    },
  },
};

export const WithErrors: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The error state showing syntax error count. The button is disabled and uses destructive styling.',
      },
    },
  },
};

export const SingleError: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state with singular grammar (shows "1 Error" instead of "1 Errors").',
      },
    },
  },
};

export const NoChanges: Story = {
  args: {
    hasChanges: false,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'When there are no changes, the button does not render at all.',
      },
    },
  },
};

export const NeobrutalistShowcase: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: `This story showcases the neobrutalism design elements:
        
- **Bold Borders**: 2px black borders create strong definition
- **Dramatic Shadows**: 4px offset shadows add depth and impact  
- **Active Animation**: Click to see the button "press" into the page
- **High Contrast**: Strong color combinations for maximum visual impact
        
Try clicking the button to see the characteristic neobrutalism active state animation where the button appears to be pressed into the page surface.`,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background p-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Neobrutalism Design Elements</h3>
          <div className="border-border bg-secondary-background rounded-[--radius-base] border-2 p-4">
            <p className="mb-4 text-sm">
              Click the button to see the signature neobrutalism "press" animation!
            </p>
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
};

export const ColorSystem: Story = {
  args: {
    hasChanges: true,
    syntaxErrorCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: `Complete neobrutalism color system from neobrutalism.dev. Each color maintains the signature style with thick borders, bold shadows, and the button press animation. This supports the project goal of building a themeable component system.`,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background p-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold">Neobrutalism Color System</h3>
          <p className="max-w-2xl text-sm text-gray-600">
            This demonstrates the foundation for the themeable component system: "neobrutalism →
            rainbow mode → other themes later". All colors are from the official neobrutalism.dev
            palette with proper React component integration.
          </p>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Default Blue</h4>
              <Story />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Electric Yellow</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-yellow-300"></div>
                <p className="text-xs">#FFE500</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Hot Pink</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-pink-400"></div>
                <p className="text-xs">#fa7fee</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Cyber Lime</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-lime-400"></div>
                <p className="text-xs">#7df752</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Retro Orange</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-orange-400"></div>
                <p className="text-xs">#fa8543</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Cool Cyan</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-cyan-400"></div>
                <p className="text-xs">#53f2fc</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Violet Dream</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-violet-400"></div>
                <p className="text-xs">#807dfa</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Danger Red</h4>
              <div className="space-y-2">
                <div className="h-8 w-full rounded border-2 border-black bg-red-400"></div>
                <p className="text-xs">#f76363</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
};
