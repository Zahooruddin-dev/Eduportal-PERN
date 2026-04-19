// src/components/ConfirmModal.jsx
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  confirmLoadingText = 'Working...',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' or 'warning'
  children,
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const titleId = 'confirm-modal-title';
  const messageId = 'confirm-modal-message';

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      const result = await onConfirm?.();
      if (result !== false) {
        onClose();
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const iconColor = type === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
  const confirmBtnClass = type === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="max-w-md w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl"
      >
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
            <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
          </div>
          <button
            onClick={onClose}
              disabled={isConfirming}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <p id={messageId} className="text-[var(--color-text-secondary)]">{message}</p>
          {children}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isConfirming}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]/50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnClass}`}
            >
              {isConfirming ? confirmLoadingText : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}