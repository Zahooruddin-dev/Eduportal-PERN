import { useState, useEffect } from 'react';
import { Upload, Link as LinkIcon, X, FileText, CheckCircle, PenLine, ExternalLink } from 'lucide-react';
import { getMyAssignmentSubmission, submitAssignment } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import AssignmentWriteEditor from './AssignmentWriteEditor';

const MODES = [
  { id: 'write', label: 'Write',       icon: PenLine  },
  { id: 'file',  label: 'Upload File', icon: Upload   },
  { id: 'link',  label: 'Link',        icon: LinkIcon },
];

export default function StudentSubmissionModal({ isOpen, onClose, classId, assignment, onSubmitted }) {
  const [mode, setMode] = useState('write');
  const [file, setFile] = useState(null);
  const [link, setLink] = useState('');
  const [writtenContent, setWrittenContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!classId || !assignment?.id) return;
    setError('');
    setFile(null);
    setLink('');
    setWrittenContent('');
    setMode('write');

    const fetchExisting = async () => {
      setLoadingExisting(true);
      try {
        const res = await getMyAssignmentSubmission(classId, assignment.id);
        setExisting(res.data);
        if (res.data?.submission_type === 'text' && res.data?.submission_content) {
          setWrittenContent(res.data.submission_content);
          setMode('write');
        } else if (res.data?.submission_type === 'link') {
          setMode('link');
          setLink(res.data.submission_content || '');
        } else if (res.data?.submission_type === 'file') {
          setMode('file');
        }
      } catch {
        setExisting(null);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [isOpen, classId, assignment?.id]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const validate = () => {
    if (mode === 'write') {
      const stripped = writtenContent.replace(/<[^>]*>/g, '').trim();
      if (!stripped) return 'Please write something before submitting.';
    }
    if (mode === 'file' && !file) return 'Please select a file.';
    if (mode === 'link' && !link.trim()) return 'Please enter a URL.';
    return null;
  };

  const handleSubmit = async () => {
    if (!classId || !assignment?.id) {
      setError('Invalid assignment context. Please close and reopen.');
      return;
    }

    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (mode === 'write') {
        formData.append('type', 'text');
        formData.append('content', writtenContent);
      } else if (mode === 'file') {
        formData.append('type', 'file');
        formData.append('file', file);
      } else {
        formData.append('type', 'link');
        formData.append('content', link.trim());
      }
      await submitAssignment(classId, assignment.id, formData);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const dueDateLabel = assignment?.due_date
    ? new Date(assignment.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const alreadySubmitted = !!existing?.submission_content;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh] transform transition-all duration-200 scale-100 opacity-100">
          <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)] shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                {assignment?.title}
              </h2>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                <span className="capitalize">{assignment?.type}</span>
                <span>Max: {assignment?.max_score} pts</span>
                {dueDateLabel && <span>Due {dueDateLabel}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {assignment?.description && (
              <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-input-bg)] rounded-xl p-3 border border-[var(--color-border)]">
                {assignment.description}
              </p>
            )}

            {loadingExisting ? (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <SpinnerIcon /> Checking previous submission…
              </div>
            ) : alreadySubmitted ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Already submitted</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Submitting again will replace your current work.</p>
                  {existing.submission_type === 'file' && (
                    <button
                      onClick={() => setViewingFile({ url: getFileViewUrl(existing.submission_content), title: 'My submission' })}
                      className="mt-1 text-xs flex items-center gap-1 text-green-600 dark:text-green-400 underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <FileText size={11} /> View current file
                    </button>
                  )}
                  {existing.submission_type === 'link' && (
                    <a
                      href={existing.submission_content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs flex items-center gap-1 text-green-600 dark:text-green-400 underline"
                    >
                      <LinkIcon size={11} /> View current link <ExternalLink size={9} />
                    </a>
                  )}
                  {existing.submission_type === 'text' && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Written submission — pre-filled in editor below.</p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex gap-1 p-1 bg-[var(--color-input-bg)] rounded-xl border border-[var(--color-border)]">
              {MODES.map((modeItem) => {
                const ModeIcon = modeItem.icon;
                return (
                <button
                  key={modeItem.id}
                  onClick={() => setMode(modeItem.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    mode === modeItem.id
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <ModeIcon size={13} /> {modeItem.label}
                </button>
                );
              })}
            </div>

            {mode === 'write' && (
              <AssignmentWriteEditor
                value={writtenContent}
                onChange={setWrittenContent}
                placeholder="Start writing your assignment here… Use the toolbar to format headings, lists, and more."
                minHeight={260}
              />
            )}

            {mode === 'file' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('sub-file-input').click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-input-bg)]'
                }`}
              >
                <input id="sub-file-input" type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-[var(--color-primary)]">
                    <FileText size={20} />
                    <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-[var(--color-text-muted)] hover:text-red-500 p-0.5 rounded-md"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto mb-2.5 text-[var(--color-text-muted)] opacity-60" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Drag & drop or <span className="text-[var(--color-primary)] font-medium">browse</span></p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">PDF, Word, images, ZIP…</p>
                  </>
                )}
              </div>
            )}

            {mode === 'link' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                  URL <span className="text-[var(--color-text-muted)] font-normal">(Google Docs, Drive, GitHub, etc.)</span>
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/…"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                />
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-1"
                  >
                    <ExternalLink size={11} /> Preview link
                  </a>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-[var(--color-border)] shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)] border border-[var(--color-border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              {submitting ? <SpinnerIcon /> : <Upload size={14} />}
              {alreadySubmitted ? 'Resubmit' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {viewingFile && (
        <FileViewerModal
          fileUrl={viewingFile.url}
          title={viewingFile.title}
          isOpen={!!viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </>
  );
}