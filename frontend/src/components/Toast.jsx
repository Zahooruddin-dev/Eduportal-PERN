// src/components/Toast.jsx
import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({ type = 'success', message, isOpen, onClose, duration = 5000 }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  };

  const textColors = {
    success: 'text-green-700 dark:text-green-300',
    error: 'text-red-700 dark:text-red-300',
    info: 'text-blue-700 dark:text-blue-300',
    warning: 'text-amber-700 dark:text-amber-300',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`flex items-center gap-3 rounded-xl border p-4 shadow-lg ${bgColors[type]}`}>
        {icons[type]}
        <p className={`text-sm font-medium ${textColors[type]}`}>{message}</p>
        <button
          onClick={onClose}
          className="ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}