import { useEffect } from 'react';

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
  // Close modal on ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayUrl = getInlineUrl(fileUrl);
  const isImage = displayUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
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