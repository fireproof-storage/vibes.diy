import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ModelOption = { id: string; name: string; description: string };

interface ModelPickerProps {
  currentModel?: string;
  onModelChange: (modelId: string) => void | Promise<void>;
  models: ModelOption[];
}

/**
 * Compact, accessible model picker for per‑chat runtime selection.
 * Renders an icon‑only trigger (✨) that opens a dropdown list of models.
 */
export default function ModelPicker({ currentModel, onModelChange, models }: ModelPickerProps) {
  const buttonId = useId();
  const menuId = `model-menu-${buttonId}`;
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Find current model for tooltip text
  const current = models.find((m) => m.id === currentModel);

  // Manage outside clicks
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current?.contains(target!) || buttonRef.current?.contains(target!)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Focus the selected item when the menu opens
  useEffect(() => {
    if (!open) return;
    const selected = menuRef.current?.querySelector(
      '[aria-checked="true"]'
    ) as HTMLButtonElement | null;
    selected?.focus();
  }, [open, currentModel]);

  // Compute floating menu position relative to trigger
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 8, left: rect.left });
    }
  }, [open]);

  // Handle selection
  async function handleSelect(id: string) {
    try {
      setUpdating(true);
      setOpen(false);
      await Promise.resolve(onModelChange(id));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="relative flex min-w-0 items-center">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-01 dark:bg-dark-background-01 hover:bg-light-decorative-01/40 dark:hover:bg-dark-decorative-01/40 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-busy={updating || undefined}
        disabled={updating}
        title={current?.description || 'Switch AI model'}
        aria-label={current?.name ? `AI model: ${current.name}` : 'Change AI model'}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true">✨</span>
        <span aria-hidden="true" className="text-light-secondary dark:text-dark-secondary">
          {updating ? '⟳' : '▾'}
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)}>
            <div
              ref={menuRef}
              role="menu"
              id={menuId}
              aria-labelledby={buttonId}
              className="ring-opacity-5 dark:bg-dark-background-01 absolute z-[9999] w-64 rounded-md bg-white p-1 shadow-lg ring-1 ring-black/10 dark:ring-white/10"
              style={{
                top: menuStyle?.top ?? 0,
                left: menuStyle?.left ?? 0,
                position: 'fixed',
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const items = Array.from(
                  (menuRef.current?.querySelectorAll('[role="menuitemradio"]') ||
                    []) as NodeListOf<HTMLButtonElement>
                );
                const idx = items.findIndex((el) => el === document.activeElement);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = items[idx + 1] || items[0];
                  next?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = items[idx - 1] || items[items.length - 1];
                  prev?.focus();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                  buttonRef.current?.focus();
                }
              }}
            >
              <div className="max-h-80 overflow-auto py-1">
                {models.map((m) => {
                  const selected = m.id === currentModel;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={
                        'hover:bg-light-background-01 dark:hover:bg-dark-decorative-00 flex w-full items-start gap-2 rounded px-2 py-2 text-left text-sm'
                      }
                      onClick={() => handleSelect(m.id)}
                    >
                      <span aria-hidden="true" className="w-4 text-center">
                        {selected ? '✓' : ''}
                      </span>
                      <span className="flex-1">
                        <span className="block font-medium">{m.name}</span>
                        <span className="text-light-secondary dark:text-dark-secondary block text-xs">
                          {m.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
