import { BackArrowIcon } from '../HeaderContent/SvgIcons';

interface BackButtonProps {
  onBackClick: () => void;
  encodedTitle: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onBackClick, encodedTitle }) => {
  return (
    <button
      type="button"
      onClick={onBackClick}
      className="text-light-primary dark:text-dark-primary flex items-center justify-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-label="Back to chat"
    >
      <BackArrowIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden min-[480px]:inline">Back</span>
      {encodedTitle && (
        <span className="hidden max-w-32 truncate text-xs text-gray-500 2xl:inline dark:text-gray-400">
          {encodedTitle}
        </span>
      )}
    </button>
  );
};
