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
    // Validate title
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    // Convert maxScore to number
    const payload = {
      ...form,
      maxScore: parseFloat(form.maxScore),
      dueDate: form.dueDate || null,
    };
    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
          {initialData ? 'Edit Assignment' : 'New Assignment'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text-primary)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text-primary)]"
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
            </select>
          </div>

          {/* Max Score */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Max Score *
            </label>
            <input
              type="number"
              step="any"
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text-primary)]"
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)]"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}