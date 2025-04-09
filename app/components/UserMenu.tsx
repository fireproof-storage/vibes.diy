import { createPortal } from 'react-dom';

interface UserMenuProps {
  isOpen: boolean;
  onLogout: () => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export function UserMenu({ isOpen, onLogout, onClose, buttonRef }: UserMenuProps) {
  if (!isOpen || !buttonRef.current) return null;

  // Get the button's position to position the menu relative to it
  const buttonRect = buttonRef.current.getBoundingClientRect();

  const menuStyle = {
    position: 'fixed' as const,
    top: `${buttonRect.bottom + 8}px`, // 8px gap
    right: `${window.innerWidth - buttonRect.right}px`,
  };

  const handleBackdropClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <dialog 
      open
      className="fixed inset-0 z-[9999] bg-transparent m-0 p-0"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      aria-label="User menu"
    >
      <div 
        style={menuStyle}
        className="w-48 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5"
      >
        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
          <button
            type="button"
            onClick={onLogout}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  );
} 