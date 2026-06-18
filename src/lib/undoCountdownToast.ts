import { toast } from 'sonner';
import { createElement } from 'react';

interface UndoCountdownOptions {
  message: string;
  onUndo: () => void;
  durationMs?: number;
  undoLabel?: string;
  description?: string;
}

export function showUndoCountdownToast(options: UndoCountdownOptions) {
  const {
    message,
    onUndo,
    durationMs = 4000,
    undoLabel = 'Չեղարկել',
    description,
  } = options;

  let undone = false;
  const toastId = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const undo = () => {
    if (undone) return;
    undone = true;
    onUndo();
    toast.dismiss(toastId);
  };

  toast.custom(
    () =>
      createElement(
        'div',
        {
          className: 'relative w-full overflow-hidden rounded-xl border bg-card p-4 shadow-xl',
        },
        // Progress bar (animated)
        createElement('div', {
          className: 'absolute bottom-0 left-0 h-[3px] bg-primary/80 rounded-full',
          style: {
            animation: `undo-shrink ${durationMs}ms linear forwards`,
          },
        }),
        // Content
        createElement(
          'div',
          { className: 'flex flex-col gap-2' },
          createElement('p', { className: 'text-sm font-semibold' }, message),
          description &&
            createElement(
              'p',
              { className: 'text-xs text-muted-foreground' },
              description
            ),
          createElement(
            'button',
            {
              onClick: undo,
              className:
                'self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95',
            },
            undoLabel
          )
        )
      ),
    {
      id: toastId,
      duration: durationMs,
    }
  );
}
