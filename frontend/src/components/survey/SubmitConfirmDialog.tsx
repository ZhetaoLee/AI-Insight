import { useEffect, useRef } from "react";

interface SubmitConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitConfirmDialog({ onCancel, onConfirm }: SubmitConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm-overlay">
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        aria-describedby="submit-confirm-body"
      >
        <div id="submit-confirm-title" className="confirm-dialog-title">
          Are you ready to submit?
        </div>
        <div id="submit-confirm-body" className="confirm-dialog-body">
          Your answer cannot be changed after you submit your survey.
        </div>
        <div className="confirm-dialog-actions">
          <button ref={cancelRef} type="button" className="confirm-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="confirm-dialog-submit" onClick={onConfirm}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
