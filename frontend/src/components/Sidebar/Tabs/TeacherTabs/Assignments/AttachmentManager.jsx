// src/components/AttachmentManager.jsx
import { useState } from 'react';
import { SpinnerIcon } from '../Icons/Icon';
import { X, Link as LinkIcon, FileText } from 'lucide-react';

export default function AttachmentManager({ isOpen, onClose, onAdd, uploading }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('file'); // 'file' or 'link'
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', type);
    if (type === 'file' && file) {
      formData.append('file', file);
    } else if (type === 'link' && content) {
      formData.append('content', content);
    } else {
      return;
    }
    await onAdd(formData);
    // reset form
    setTitle('');
    setType('file');
    setContent('');
    setFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Add Attachment</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="file" checked={type === 'file'} onChange={() => setType('file')} />
                <span>Upload File</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="link" checked={type === 'link'} onChange={() => setType('link')} />
                <span>External Link</span>
              </label>
            </div>
          </div>
          {type === 'file' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                required
                className="w-full text-sm text-[var(--color-text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">URL</label>
              <input
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="https://..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl">
              {uploading ? <SpinnerIcon /> : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}