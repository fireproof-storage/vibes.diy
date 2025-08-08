import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  useEffect,
  memo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import VibesDIYLogo from '../app/components/VibesDIYLogo';

interface ChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showLogo?: boolean;
  className?: string;
}

export interface ChatInputRef {
  clickSubmit: () => void;
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      value: controlledValue,
      onChange,
      onSubmit,
      placeholder = 'I want to build...',
      disabled = false,
      isLoading = false,
      showLogo = true,
      className = '',
    },
    ref
  ) => {
    // Internal state for uncontrolled usage
    const [internalValue, setInternalValue] = useState('');

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      clickSubmit: () => {
        if (submitButtonRef.current) {
          submitButtonRef.current.click();
        }
      },
      focus: () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      },
    }));

    // Auto-resize textarea function
    const autoResizeTextarea = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const maxHeight = 200;
        const minHeight = 90;
        textarea.style.height = `${Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))}px`;
      }
    }, []);

    // Handle input changes
    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;

        if (controlledValue !== undefined) {
          // Controlled component
          onChange?.(newValue);
        } else {
          // Uncontrolled component
          setInternalValue(newValue);
        }
      },
      [controlledValue, onChange]
    );

    // Handle submit
    const handleSubmit = useCallback(() => {
      if (!disabled && !isLoading && value.trim()) {
        onSubmit?.(value);

        // Clear input for uncontrolled components
        if (controlledValue === undefined) {
          setInternalValue('');
        }
      }
    }, [disabled, isLoading, value, onSubmit, controlledValue]);

    // Auto-resize when value changes
    useEffect(() => {
      autoResizeTextarea();
    }, [value, autoResizeTextarea]);

    return (
      <div className={`px-4 py-2 ${className}`}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={disabled}
            className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-01 dark:bg-dark-background-01 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-lg border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            rows={2}
          />

          {showLogo && (
            <button
              ref={submitButtonRef}
              type="button"
              onClick={handleSubmit}
              disabled={disabled || isLoading || !value.trim()}
              className={`light-gradient border-glimmer hover:border-light-decorative-01 dark:hover:border-dark-decorative-01 absolute flex items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 ${
                isLoading
                  ? 'border-light-decorative-01 dark:border-dark-decorative-01'
                  : 'border-light-decorative-01 dark:border-dark-decorative-00'
              } right-0 -bottom-1 -mr-0 w-[96px] py-1`}
              style={{
                backdropFilter: 'blur(1px)',
              }}
              aria-label={isLoading ? 'Processing...' : 'Send message'}
            >
              <div className="relative z-10">
                <VibesDIYLogo
                  className="mr-2 mb-0.5 ml-5 pt-6 pb-2 pl-1.5"
                  width={100}
                  height={12}
                />
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default memo(ChatInput);
