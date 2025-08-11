import React from 'react';
import { Button } from '../ui/button';
import { MinidiscIcon } from '../HeaderContent/SvgIcons';

interface NeobrutalistSaveButtonProps {
  onClick: () => void;
  hasChanges: boolean;
  syntaxErrorCount?: number;
}

export const NeobrutalistSaveButton: React.FC<NeobrutalistSaveButtonProps> = ({
  onClick,
  hasChanges,
  syntaxErrorCount = 0,
}) => {
  if (!hasChanges) return null;

  const hasErrors = syntaxErrorCount > 0;
  const variant = hasErrors ? 'destructive' : 'default';

  const buttonText = hasErrors
    ? `${syntaxErrorCount} Error${syntaxErrorCount !== 1 ? 's' : ''}`
    : 'Save';

  return (
    <>
      {/* Desktop version */}
      <Button
        onClick={onClick}
        disabled={hasErrors}
        variant={variant}
        size="default"
        className="hidden items-center gap-2 text-sm sm:flex"
      >
        <MinidiscIcon className="h-4 w-4" />
        {buttonText}
      </Button>

      {/* Mobile version - icon only */}
      <Button
        onClick={onClick}
        disabled={hasErrors}
        variant={variant}
        size="icon"
        className="flex sm:hidden"
        title={
          hasErrors
            ? `${syntaxErrorCount} syntax error${syntaxErrorCount !== 1 ? 's' : ''}`
            : 'Save changes'
        }
      >
        <MinidiscIcon className="h-4 w-4" />
      </Button>
    </>
  );
};
