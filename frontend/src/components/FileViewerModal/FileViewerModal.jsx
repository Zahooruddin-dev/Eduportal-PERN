import { useEffect, useRef } from 'react';

/**
 * For Cloudinary raw files (PDFs, docs, etc.), add fl_attachment=0
 * to force inline display instead of download.
 */
const getInlineUrl = (url) => {
  if (!url) return url;
  // Only modify Cloudinary raw files
  if (url.includes('/raw/upload/')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}fl_attachment=0`;
  }
  return url;
};

export default function FileViewerModal({ fileUrl, title, isOpen, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const getFocusableElements = () => {
    if (!dialogRef.current) return [];
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(dialogRef.current.querySelectorAll(selector)).filter(
      (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
    );
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    if (isOpen) {
      lastFocusedElementRef.current = document.activeElement;
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
      const previous = lastFocusedElementRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayUrl = getInlineUrl(fileUrl);
  const isImage = displayUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
        className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
          <h2 id="file-viewer-title" className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close file viewer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto min-h-0">
          {isImage ? (
            <img
              src={displayUrl}
              alt={title}
              className="max-w-full max-h-full object-contain mx-auto"
            />
          ) : (
           <embed
  src={displayUrl}
  type="application/pdf"
  className="w-full h-full min-h-[70vh] border-none rounded"
/>
          )}
        </div>
      </div>
    </div>
  );
}