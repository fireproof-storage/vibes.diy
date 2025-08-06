import React from 'react';

interface SaveButtonProps {
  onClick: () => void;
  hasChanges: boolean;
}

const MinidiscIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Minidisc outline */}
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    {/* Inner ring */}
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
    {/* Label area */}
    <rect
      x="4"
      y="8"
      width="6"
      height="8"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    {/* Label lines */}
    <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="0.5" />
    <line x1="5" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="0.5" />
    <line x1="5" y1="14" x2="9" y2="14" stroke="currentColor" strokeWidth="0.5" />
  </svg>
);

export const SaveButton: React.FC<SaveButtonProps> = ({ onClick, hasChanges }) => {
  if (!hasChanges) return null;

  return (
    <>
      {/* Desktop version */}
      <button
        onClick={onClick}
        className="hidden items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 sm:flex"
      >
        <MinidiscIcon className="h-4 w-4" />
        Save
      </button>

      {/* Mobile version - icon only */}
      <button
        onClick={onClick}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 sm:hidden"
        title="Save changes"
      >
        <MinidiscIcon className="h-4 w-4" />
      </button>
    </>
  );
};
