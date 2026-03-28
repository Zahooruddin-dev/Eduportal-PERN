import { useState } from 'react';
import { FileText, Link as LinkIcon, Trash2, Plus, X } from 'lucide-react';

export default function AssignmentFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    type: initialData?.type || 'assignment',
    maxScore: initialData?.max_score || 100,
    dueDate: initialData?.due_date ? initialData.due_date.split('T')[0] : '',
  });

  // Attachment state
  const [attachments, setAttachments] = useState([]);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [addType, setAddType] = useState('file');
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addFile, setAddFile] = useState(null);

  const addAttachment = () => {
    if (!addTitle) return;
    if (addType === 'file' && !addFile) return;
    if (addType === 'link' && !addUrl) return;

    const newAttachment = {
      id: Date.now(), // temporary id
      title: addTitle,
      type: addType,
      content: addType === 'file' ? addFile : addUrl,
      isFile: addType === 'file',
    };
    setAttachments([...attachments, newAttachment]);
    // reset form
    setAddTitle('');
    setAddUrl('');
    setAddFile(null);
    setShowAddAttachment(false);
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    const assignmentData = {
      title: form.title,
      description: form.description,
      type: form.type,
      maxScore: parseFloat(form.maxScore),
      dueDate: form.dueDate || null,
    };
    onSubmit({ assignmentData, attachments });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                Attachments (optional)
              </label>
              <button
                type="button"
                onClick={() => setShowAddAttachment(!showAddAttachment)}
                className="text-xs text-[var(--color-primary)] flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {/* Existing attachments list */}
            {attachments.length > 0 && (
              <ul className="space-y-1 mb-2">
                {attachments.map(att => (
                  <li key={att.id} className="flex items-center justify-between text-sm border border-[var(--color-border)] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      {att.type === 'file' ? <FileText size={14} /> : <LinkIcon size={14} />}
                      <span className="text-[var(--color-text-primary)]">{att.title}</span>
                      {att.type === 'link' && (
                        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">{att.content}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add attachment form */}
            {showAddAttachment && (
              <div className="mt-2 p-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-input-bg)]">
                <input
                  type="text"
                  placeholder="Title"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  className="w-full mb-2 p-1 text-sm border border-[var(--color-border)] rounded"
                />
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" value="file" checked={addType === 'file'} onChange={() => setAddType('file')} /> File
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" value="link" checked={addType === 'link'} onChange={() => setAddType('link')} /> Link
                  </label>
                </div>
                {addType === 'file' ? (
                  <input
                    type="file"
                    onChange={e => setAddFile(e.target.files[0])}
                    className="w-full text-sm"
                  />
                ) : (
                  <input
                    type="url"
                    placeholder="URL"
                    value={addUrl}
                    onChange={e => setAddUrl(e.target.value)}
                    className="w-full p-1 text-sm border border-[var(--color-border)] rounded"
                  />
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAttachment(false)}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addAttachment}
                    className="text-xs text-[var(--color-primary)]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
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