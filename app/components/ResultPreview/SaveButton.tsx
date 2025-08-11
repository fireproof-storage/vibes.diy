import React from 'react';
import { MinidiscIcon } from '../HeaderContent/SvgIcons';
import { cn } from '../../lib/utils';

interface SaveButtonProps {
  onClick: () => void;
  hasChanges: boolean;
  syntaxErrorCount?: number;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  onClick,
  hasChanges,
  syntaxErrorCount = 0,
}) => {
  if (!hasChanges) return null;

  const hasErrors = syntaxErrorCount > 0;

  // Neobrutalism styling with classes
  const baseClasses =
    'inline-flex items-center justify-center whitespace-nowrap rounded-[5px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-black';

  const shadowClasses = 'shadow-[4px_4px_0px_0px_black]';
  const activeClasses = 'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none';

  const variantClasses = hasErrors
    ? 'bg-red-500 text-white hover:bg-red-600 cursor-not-allowed opacity-75'
    : 'bg-blue-500 text-white hover:bg-blue-600';

  const buttonText = hasErrors
    ? `${syntaxErrorCount} Error${syntaxErrorCount !== 1 ? 's' : ''}`
    : 'Save';

  return (
    <>
      {/* Desktop version */}
      <button
        onClick={onClick}
        disabled={hasErrors}
        className={cn(
          baseClasses,
          shadowClasses,
          activeClasses,
          variantClasses,
          'hidden gap-2 px-4 py-2 sm:flex'
        )}
      >
        <MinidiscIcon className="h-4 w-4" />
        {buttonText}
      </button>

      {/* Mobile version - icon only */}
      <button
        onClick={onClick}
        disabled={hasErrors}
        className={cn(
          baseClasses,
          shadowClasses,
          activeClasses,
          variantClasses,
          'flex h-10 w-10 sm:hidden'
        )}
        title={
          hasErrors
            ? `${syntaxErrorCount} syntax error${syntaxErrorCount !== 1 ? 's' : ''}`
            : 'Save changes'
        }
      >
        <MinidiscIcon className="h-4 w-4" />
      </button>
    </>
  );
};
