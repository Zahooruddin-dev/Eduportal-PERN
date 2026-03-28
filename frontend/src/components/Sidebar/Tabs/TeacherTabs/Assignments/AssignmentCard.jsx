// src/components/AssignmentCard.jsx
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit2, Trash2, Paperclip } from 'lucide-react';
import { getAssignmentAttachments, deleteAssignmentAttachment, getAssignmentSubmissions, addAssignmentAttachment } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import AttachmentManager from './AttachmentManager';
import GradeTable from './GradeTable';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';

export default function AssignmentCard({ assignment, classId, students, grades, onGradeChange, onSaveGrades, savingGrades, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  // Fetch attachments when expanded
  useEffect(() => {
    if (expanded) {
      fetchAttachments();
      fetchSubmissions();
    }
  }, [expanded]);

  const fetchAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const res = await getAssignmentAttachments(classId, assignment.id);
      setAttachments(res.data);
    } catch (err) {
      console.error('Failed to load attachments', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await getAssignmentSubmissions(classId, assignment.id);
      // Map submissions to students
      const submissionMap = {};
      res.data.forEach(sub => {
        submissionMap[sub.student_id] = sub;
      });
      // Add submission info to students array (for GradeTable)
      const studentsWithSubmissions = students.map(s => ({
        ...s,
        submission: submissionMap[s.student_id]
      }));
      setSubmissions(studentsWithSubmissions);
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleAddAttachment = async (formData) => {
    setUploadingAttachment(true);
    try {
      await addAssignmentAttachment(classId, assignment.id, formData);
      await fetchAttachments(); // refresh
    } catch (err) {
      console.error('Failed to add attachment', err);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await deleteAssignmentAttachment(classId, assignment.id, attachmentId);
      await fetchAttachments();
    } catch (err) {
      console.error('Failed to delete attachment', err);
    }
  };

  const handleViewFile = (url, title) => {
    setViewingFile({ url: getFileViewUrl(url), title });
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{assignment.title}</h3>
              <span className="text-xs text-[var(--color-text-muted)]">
                ({assignment.type}) • Max: {assignment.max_score}
              </span>
              {assignment.due_date && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
            {assignment.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{assignment.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(assignment)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <Edit2 size={16} />
            </button>
            <button onClick={() => onDelete(assignment.id)} className="p-1 text-red-500 hover:text-red-700">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-border)] p-4 space-y-4">
          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">Attachments</h4>
              <button
                onClick={() => setShowAttachmentModal(true)}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                <Paperclip size={12} />
                Add Attachment
              </button>
            </div>
            {loadingAttachments ? (
              <div className="flex justify-center py-2"><SpinnerIcon size={16} /></div>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">No attachments</p>
            ) : (
              <ul className="space-y-1">
                {attachments.map(att => (
                  <li key={att.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewFile(att.content, att.title || 'Attachment')}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {att.title || (att.type === 'file' ? 'File' : 'Link')}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submissions and grades */}
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Student Submissions & Grades</h4>
            {loadingSubmissions ? (
              <div className="flex justify-center py-4"><SpinnerIcon /></div>
            ) : (
              <GradeTable
                assignment={assignment}
                students={submissions}
                grades={grades}
                onGradeChange={onGradeChange}
                onSave={() => onSaveGrades(assignment.id)}
                savingGrades={savingGrades}
                classId={classId}
              />
            )}
          </div>
        </div>
      )}

      <AttachmentManager
        isOpen={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        onAdd={handleAddAttachment}
        uploading={uploadingAttachment}
      />

      {viewingFile && (
        <FileViewerModal
          fileUrl={viewingFile.url}
          title={viewingFile.title}
          isOpen={!!viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}