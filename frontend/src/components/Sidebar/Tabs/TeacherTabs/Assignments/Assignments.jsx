import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getMyClasses, getClassAssignments, createAssignment, updateAssignment, deleteAssignment } from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';
import AssignmentFormModal from './AssignmentFormModal';
import AttachmentManager from './AttachmentManager';
import SubmissionsTable from './SubmissionsTable';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await getMyClasses();
      setClasses(res.data);
    } catch (err) {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchAssignments = async (classId) => {
    setLoadingAssignments(true);
    try {
      const res = await getClassAssignments(classId);
      setAssignments(res.data);
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments(selectedClass.id);
    }
  }, [selectedClass]);

  const handleCreateUpdate = async (formData) => {
    try {
      if (editingAssignment) {
        await updateAssignment(selectedClass.id, editingAssignment.id, formData);
        setToast({ isOpen: true, type: 'success', message: 'Assignment updated' });
      } else {
        await createAssignment(selectedClass.id, formData);
        setToast({ isOpen: true, type: 'success', message: 'Assignment created' });
      }
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      fetchAssignments(selectedClass.id);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Operation failed' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAssignment(selectedClass.id, confirmAction);
      setToast({ isOpen: true, type: 'success', message: 'Assignment deleted' });
      fetchAssignments(selectedClass.id);
      if (expandedAssignment === confirmAction) setExpandedAssignment(null);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Delete failed' });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const openDeleteConfirm = (assignmentId) => {
    setConfirmAction(assignmentId);
    setConfirmOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><SpinnerIcon /></div>;
  }

  if (!selectedClass) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">Assignments</h1>
        {error && <AlertBox message={error} />}
        {classes.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">You haven't created any classes yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <div key={cls.id} onClick={() => setSelectedClass(cls)} className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{cls.class_name}</h3>
                {cls.subject && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{cls.subject}</p>}
                <div className="mt-4"><span className="text-sm text-[var(--color-primary)]">Manage Assignments →</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setSelectedClass(null)} className="text-[var(--color-primary)] hover:underline flex items-center gap-1">← Back to Classes</button>
        <button onClick={() => { setEditingAssignment(null); setShowAssignmentForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)]">
          <Plus size={16} /> New Assignment
        </button>
      </div>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">{selectedClass.class_name} – Assignments</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Manage assignments, upload resources, and grade student submissions.</p>

      {loadingAssignments ? (
        <div className="flex justify-center py-4"><SpinnerIcon /></div>
      ) : assignments.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No assignments yet. Click "New Assignment" to create one.</p>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <div key={assignment.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{assignment.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                    <span>Type: {assignment.type}</span>
                    <span>Max Score: {assignment.max_score}</span>
                    {assignment.due_date && <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>}
                  </div>
                  {assignment.description && <p className="text-sm text-[var(--color-text-secondary)] mt-2">{assignment.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingAssignment(assignment); setShowAssignmentForm(true); }} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => openDeleteConfirm(assignment.id)} className="p-1 text-red-500 hover:text-red-700" title="Delete"><Trash2 size={16} /></button>
                  <button onClick={() => setExpandedAssignment(expandedAssignment === assignment.id ? null : assignment.id)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Expand">
                    {expandedAssignment === assignment.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {expandedAssignment === assignment.id && (
                <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-input-bg)]/50">
                  {/* Attachments */}
                  <AttachmentManager classId={selectedClass.id} assignmentId={assignment.id} />
                  {/* Submissions table */}
                  <SubmissionsTable classId={selectedClass.id} assignmentId={assignment.id} maxScore={assignment.max_score} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AssignmentFormModal
        isOpen={showAssignmentForm}
        onClose={() => { setShowAssignmentForm(false); setEditingAssignment(null); }}
        onSubmit={handleCreateUpdate}
        initialData={editingAssignment}
      />
      <ConfirmModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Assignment" message="Are you sure? This will also delete all grades for this assignment." confirmText="Delete" type="danger" />
      <Toast type={toast.type} message={toast.message} isOpen={toast.isOpen} onClose={() => setToast({ isOpen: false, type: 'success', message: '' })} />
    </div>
  );
}