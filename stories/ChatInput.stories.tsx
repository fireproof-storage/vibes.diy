import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import ChatInput from './ChatInput';
import type { ChatInputRef } from './ChatInput';

const meta = {
  title: 'Components/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A chat input component with auto-resizing textarea and submit functionality. Supports both controlled and uncontrolled usage.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      description: 'Controlled value for the input',
      control: 'text',
    },
    placeholder: {
      description: 'Placeholder text for the input',
      control: 'text',
    },
    disabled: {
      description: 'Whether the input is disabled',
      control: 'boolean',
    },
    isLoading: {
      description: 'Whether the component is in loading state',
      control: 'boolean',
    },
    showLogo: {
      description: 'Whether to show the submit button with logo',
      control: 'boolean',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
  args: {
    onChange: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof ChatInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    placeholder: 'I want to build...',
  },
};

// With initial value
export const WithValue: Story = {
  args: {
    value: 'Create a todo app with React',
    placeholder: 'I want to build...',
  },
};

// Loading state
export const Loading: Story = {
  args: {
    value: 'Building your app...',
    isLoading: true,
    placeholder: 'I want to build...',
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    value: 'This input is disabled',
    disabled: true,
    placeholder: 'I want to build...',
  },
};

// Without logo/submit button
export const WithoutLogo: Story = {
  args: {
    placeholder: 'Type your message...',
    showLogo: false,
  },
};

// Continue coding placeholder
export const ContinueCoding: Story = {
  args: {
    placeholder: 'Continue coding...',
  },
};

// Long text example
export const LongText: Story = {
  args: {
    value: `Create a comprehensive todo application with the following features:
- Add new tasks with categories
- Mark tasks as complete/incomplete  
- Filter tasks by status and category
- Search functionality
- Drag and drop reordering
- Local storage persistence
- Dark/light theme toggle
- Export tasks to JSON`,
    placeholder: 'I want to build...',
  },
};

// Interactive example with ref
export const WithRefActions: Story = {
  render: (args) => {
    const inputRef = useRef<ChatInputRef>(null);

    const handleFocus = () => {
      inputRef.current?.focus();
    };

    const handleClickSubmit = () => {
      inputRef.current?.clickSubmit();
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleFocus}
            className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
          >
            Focus Input
          </button>
          <button
            onClick={handleClickSubmit}
            className="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600"
          >
            Click Submit
          </button>
        </div>
        <ChatInput {...args} ref={inputRef} />
      </div>
    );
  },
  args: {
    placeholder: 'Try the action buttons above...',
  },
};
