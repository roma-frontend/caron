import { toast } from 'sonner';

interface UndoCountdownOptions {
  message: string;
  onUndo: () => void;
  durationMs?: number;
  undoLabel?: string;
  description?: string | ((remainingSeconds: number) => string);
  countdownHint?: string | ((remainingSeconds: number) => string);
}

export function showUndoCountdownToast(options: UndoCountdownOptions) {
  const {
    message,
    onUndo,
    durationMs = 4000,
    undoLabel = 'Չեղարկել',
    description,
    countdownHint = (remainingSeconds: number) => `Չեղարկելու համար՝ ${remainingSeconds}վ`,
  } = options;

  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  let remaining = totalSeconds;
  let undone = false;
  const toastId = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const undo = () => {
    if (undone) return;
    undone = true;
    onUndo();
    toast.dismiss(toastId);
  };

  const render = () => {
    const descriptionText = typeof description === 'function' ? description(remaining) : description;
    const hintText = typeof countdownHint === 'function' ? countdownHint(remaining) : countdownHint;

    toast(message, {
      id: toastId,
      duration: 1200,
      className: 'flex flex-col items-start gap-2 [&_button]:mt-1 [&_button]:self-start',
      description: descriptionText ? `${descriptionText} · ${hintText}` : hintText,
      action: { label: undoLabel, onClick: undo },
    });
  };

  render();

  const interval = window.setInterval(() => {
    if (undone) {
      window.clearInterval(interval);
      return;
    }
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(interval);
      toast.dismiss(toastId);
      return;
    }
    render();
  }, 1000);
}
