import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Upload, CheckCircle, Clock,
  AlertCircle, FileText, Link as LinkIcon, ExternalLink, BookOpen
} from 'lucide-react';
import {
  getClassAssignments,
  getAssignmentAttachments,
  getStudentGradesForClass,
  getMyAssignmentSubmission,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import StudentSubmissionModal from './StudentSubmissionModal';
import Toast from '../../../../Toast';

function StatusBadge({ assignment, submission }) {
  const now = new Date();
  const due = assignment.due_date ? new Date(assignment.due_date) : null;
  const isOverdue = due && due < now && !submission?.submission_content;

  if (submission?.submission_content) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        <CheckCircle size={10} /> Submitted
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
        <AlertCircle size={10} /> Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
      <Clock size={10} /> Pending
    </span>
  );
}

function AttachmentsList({ classId, assignmentId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    getAssignmentAttachments(classId, assignmentId)
      .then((res) => setAttachments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId, assignmentId]);

  if (loading) return <div className="flex items-center gap-1 py-1"><SpinnerIcon /><span className="text-xs text-[var(--color-text-muted)]">Loading resources…</span></div>;
  if (!attachments.length) return <p className="text-xs text-[var(--color-text-muted)]">No resources attached.</p>;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          att.type === 'file' ? (
            <button
              key={att.id}
              onClick={() => setViewingFile({ url: getFileViewUrl(att.content), title: att.title })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <FileText size={12} /> {att.title}
            </button>
          ) : (
            <a
              key={att.id}
              href={att.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <LinkIcon size={12} /> {att.title} <ExternalLink size={10} />
            </a>
          )
        ))}
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

export default function StudentAssignmentView({ cls, onBack }) {
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [activeTab, setActiveTab] = useState('assignments');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, gradeRes] = await Promise.all([
        getClassAssignments(cls.id),
        getStudentGradesForClass(cls.id),
      ]);
      setAssignments(assignRes.data);
      setGrades(gradeRes.data);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [cls.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!assignments.length) return;
    const fetchAll = async () => {
      const map = {};
      await Promise.all(
        assignments.map(async (a) => {
          try {
            const res = await getMyAssignmentSubmission(cls.id, a.id);
            map[a.id] = res.data;
          } catch {
            map[a.id] = null;
          }
        })
      );
      setSubmissions(map);
    };
    fetchAll();
  }, [assignments, cls.id]);

  const handleSubmitted = async () => {
    setToast({ isOpen: true, type: 'success', message: 'Assignment submitted successfully!' });
    if (submitting) {
      try {
        const res = await getMyAssignmentSubmission(cls.id, submitting.id);
        setSubmissions((prev) => ({ ...prev, [submitting.id]: res.data }));
      } catch {}
    }
  };

  const gradeMap = {};
  grades.forEach((g) => { gradeMap[g.assignment_id] = g; });

  const AssignmentSkeleton = () => (
    <div className="animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="h-5 bg-[var(--color-border)] rounded w-3/4 mb-2" />
      <div className="h-3 bg-[var(--color-border)] rounded w-1/2 mb-1" />
      <div className="h-3 bg-[var(--color-border)] rounded w-2/3 mb-2" />
      <div className="flex justify-between mt-3">
        <div className="h-8 bg-[var(--color-border)] rounded w-20" />
        <div className="h-8 bg-[var(--color-border)] rounded w-8" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-lg px-2 py-1"
      >
        <span aria-hidden="true">←</span> Back to Classes
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{cls.class_name}</h1>
        {cls.subject && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{cls.subject}</p>}
      </div>

      <div className="flex gap-1 p-1 bg-[var(--color-input-bg)] rounded-xl border border-[var(--color-border)] w-fit mb-6">
        {['assignments', 'grades'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
              activeTab === tab
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <AssignmentSkeleton key={i} />
          ))}
        </div>
      ) : activeTab === 'assignments' ? (
        assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
            <BookOpen size={40} className="text-[var(--color-text-muted)] mb-3 opacity-40" />
            <p className="text-[var(--color-text-muted)]">No assignments yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const sub = submissions[assignment.id];
              const isExpanded = expanded === assignment.id;

              return (
                <div
                  key={assignment.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{assignment.title}</h3>
                        <StatusBadge assignment={assignment} submission={sub} />
                        {gradeMap[assignment.id]?.score != null && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                            {gradeMap[assignment.id].score} / {assignment.max_score}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                        <span className="capitalize">{assignment.type}</span>
                        {assignment.due_date && (
                          <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">{assignment.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSubmitting(assignment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                      >
                        <Upload size={12} />
                        {sub?.submission_content ? 'Resubmit' : 'Submit'}
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : assignment.id)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-input-bg)]/40 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Resources</p>
                        <AttachmentsList classId={cls.id} assignmentId={assignment.id} />
                      </div>

                      {gradeMap[assignment.id]?.feedback && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">Teacher Feedback</p>
                          <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
                            {gradeMap[assignment.id].feedback}
                          </p>
                        </div>
                      )}

                      {sub?.submission_content && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">Your Submission</p>
                          {sub.submission_type === 'file' ? (
                            <button
                              onClick={() => {
                                // handled in modal, but we can also view here
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            >
                              <FileText size={12} /> View submitted file
                            </button>
                          ) : (
                            <a
                              href={sub.submission_content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
                            >
                              <LinkIcon size={12} /> {sub.submission_content} <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        grades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
            <BookOpen size={40} className="text-[var(--color-text-muted)] mb-3 opacity-40" />
            <p className="text-[var(--color-text-muted)]">No grades recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="min-w-full bg-[var(--color-surface)]">
              <thead className="bg-[var(--color-border)]/30">
                <tr>
                  {['Assignment', 'Type', 'Due Date', 'Score', 'Feedback'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {grades.map((g) => (
                  <tr key={g.assignment_id} className="hover:bg-[var(--color-input-bg)]/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{g.title}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)] capitalize">{g.type}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {g.due_date ? new Date(g.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {g.score != null ? (
                        <span className="text-sm font-semibold text-[var(--color-primary)]">
                          {g.score} <span className="text-[var(--color-text-muted)] font-normal">/ {g.max_score}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">Not graded</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-xs">
                      {g.feedback || <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {submitting && (
        <StudentSubmissionModal
          isOpen={!!submitting}
          onClose={() => setSubmitting(null)}
          classId={cls.id}
          assignment={submitting}
          onSubmitted={handleSubmitted}
        />
      )}

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast({ isOpen: false, type: 'success', message: '' })}
      />
    </div>
  );
}