import { useState, useEffect } from 'react';
import { getAssignmentSubmissions, submitAssignmentGrades } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { Save, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';

export default function SubmissionsTable({ classId, assignmentId, maxScore }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAssignmentSubmissions(classId, assignmentId);
      const data = res.data;
      setSubmissions(data);
      const initialGrades = {};
      data.forEach(sub => {
        initialGrades[sub.student_id] = {
          score: sub.score ?? '',
          feedback: sub.feedback ?? '',
        };
      });
      setGrades(initialGrades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId, assignmentId]);

  const handleGradeChange = (studentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: field === 'score' ? parseFloat(value) : value,
      }
    }));
  };

  const saveGrades = async () => {
    setSaving(true);
    const gradesArray = submissions.map(sub => ({
      studentId: sub.student_id,
      score: grades[sub.student_id]?.score ?? null,
      feedback: grades[sub.student_id]?.feedback ?? null,
    }));
    try {
      await submitAssignmentGrades(classId, assignmentId, { grades: gradesArray });
      alert('Grades saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-4"><SpinnerIcon /></div>;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-[var(--color-text-primary)]">Submissions</h3>
        <button onClick={saveGrades} disabled={saving} className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {saving ? <SpinnerIcon /> : <Save size={14} />} Save Grades
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
          <thead className="bg-[var(--color-border)]/30">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Student</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Submission</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Score</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {submissions.map(sub => (
              <tr key={sub.student_id}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {sub.profile_pic ? (
                      <img src={sub.profile_pic} alt={sub.username} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-xs">
                        {sub.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm">{sub.username}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {sub.submission_content ? (
                    sub.submission_type === 'file' ? (
                      <button onClick={() => setViewingFile({ url: getFileViewUrl(sub.submission_content), title: `${sub.username} submission` })} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <FileText size={12} /> View File
                      </button>
                    ) : (
                      <a href={sub.submission_content} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <LinkIcon size={12} /> Link
                        <ExternalLink size={10} />
                      </a>
                    )
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Not submitted</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={grades[sub.student_id]?.score ?? ''}
                    onChange={e => handleGradeChange(sub.student_id, 'score', e.target.value)}
                    className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm"
                    placeholder={maxScore}
                  />
                </td>
                <td className="px-3 py-2">
                  <textarea
                    value={grades[sub.student_id]?.feedback ?? ''}
                    onChange={e => handleGradeChange(sub.student_id, 'feedback', e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm"
                    rows="1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewingFile && <FileViewerModal fileUrl={viewingFile.url} title={viewingFile.title} isOpen={!!viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
}