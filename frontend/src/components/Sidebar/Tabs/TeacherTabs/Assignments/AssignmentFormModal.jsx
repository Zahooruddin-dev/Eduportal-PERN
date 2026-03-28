import { useState } from 'react';

export default function AssignmentFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    type: initialData?.type || 'assignment',
    maxScore: initialData?.max_score || 100,
    dueDate: initialData?.due_date ? initialData.due_date.split('T')[0] : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
          {initialData ? 'Edit Assignment' : 'New Assignment'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* form fields as before */}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl">{initialData ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}