import React from 'react';
import { MinidiscIcon } from '../HeaderContent/SvgIcons';

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
  const buttonClass = hasErrors ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600';

  const buttonText = hasErrors
    ? `${syntaxErrorCount} Error${syntaxErrorCount !== 1 ? 's' : ''}`
    : 'Save';

  return (
    <>
      {/* Desktop version */}
      <button
        onClick={onClick}
        disabled={hasErrors}
        className={`hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white transition-colors sm:flex ${buttonClass} ${hasErrors ? 'cursor-not-allowed opacity-75' : ''}`}
      >
        <MinidiscIcon className="h-4 w-4" />
        {buttonText}
      </button>

      {/* Mobile version - icon only */}
      <button
        onClick={onClick}
        disabled={hasErrors}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors sm:hidden ${buttonClass} ${hasErrors ? 'cursor-not-allowed opacity-75' : ''}`}
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
