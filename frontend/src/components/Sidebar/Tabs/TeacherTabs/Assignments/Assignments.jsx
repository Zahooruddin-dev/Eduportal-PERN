import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  getMyClasses,
  getClassEnrolledRooster,
  getClassAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentGrades,
  submitAssignmentGrades,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import { Plus } from 'lucide-react';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';
import AssignmentCard from './AssignmentCard';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [students, setStudents] = useState([]);
  const [gradesMap, setGradesMap] = useState({}); // { assignmentId: { studentId: { score, feedback } } }
  const [savingGrades, setSavingGrades] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    type: 'assignment',
    maxScore: 100,
    dueDate: '',
  });
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

  const fetchClassData = async (classId) => {
    setLoadingAssignments(true);
    try {
      const [assignmentsRes, rosterRes] = await Promise.all([
        getClassAssignments(classId),
        getClassEnrolledRooster(classId),
      ]);
      setAssignments(assignmentsRes.data);
      setStudents(rosterRes.data);
      // initialize gradesMap for assignments if not already present
      setGradesMap(prev => {
        const newMap = { ...prev };
        for (let a of assignmentsRes.data) {
          if (!newMap[a.id]) newMap[a.id] = {};
        }
        return newMap;
      });
    } catch (err) {
      setError('Failed to load class data');
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchClassData(selectedClass.id);
    }
  }, [selectedClass]);

  const fetchAssignmentGrades = async (assignmentId) => {
    try {
      const res = await getAssignmentGrades(selectedClass.id, assignmentId);
      const gradeMap = {};
      res.data.forEach(g => {
        gradeMap[g.student_id] = {
          score: g.score,
          feedback: g.feedback,
        };
      });
      setGradesMap(prev => ({
        ...prev,
        [assignmentId]: gradeMap
      }));
    } catch (err) {
      console.error('Failed to load grades', err);
    }
  };

  const handleGradeChange = (assignmentId, studentId, field, value) => {
    setGradesMap(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [studentId]: {
          ...prev[assignmentId]?.[studentId],
          [field]: field === 'score' ? parseFloat(value) : value
        }
      }
    }));
  };

  const handleSaveGrades = async (assignmentId) => {
    const gradesForAssignment = gradesMap[assignmentId] || {};
    const gradesArray = students.map(student => ({
      studentId: student.student_id,
      score: gradesForAssignment[student.student_id]?.score ?? null,
      feedback: gradesForAssignment[student.student_id]?.feedback ?? null,
    }));
    setSavingGrades(true);
    try {
      await submitAssignmentGrades(selectedClass.id, assignmentId, { grades: gradesArray });
      setToast({ isOpen: true, type: 'success', message: 'Grades saved' });
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Failed to save grades' });
    } finally {
      setSavingGrades(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      if (editingAssignment) {
        await updateAssignment(selectedClass.id, editingAssignment.id, assignmentForm);
        setToast({ isOpen: true, type: 'success', message: 'Assignment updated' });
      } else {
        await createAssignment(selectedClass.id, assignmentForm);
        setToast({ isOpen: true, type: 'success', message: 'Assignment created' });
      }
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      setAssignmentForm({ title: '', description: '', type: 'assignment', maxScore: 100, dueDate: '' });
      fetchClassData(selectedClass.id);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Operation failed' });
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      await deleteAssignment(selectedClass.id, confirmAction);
      setToast({ isOpen: true, type: 'success', message: 'Assignment deleted' });
      fetchClassData(selectedClass.id);
      // Remove from gradesMap
      setGradesMap(prev => {
        const newMap = { ...prev };
        delete newMap[confirmAction];
        return newMap;
      });
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

  const openEditForm = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type,
      maxScore: assignment.max_score,
      dueDate: assignment.due_date ? assignment.due_date.split('T')[0] : '',
    });
    setShowAssignmentForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon />
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          Assignments
        </h1>
        {error && <AlertBox message={error} />}
        {classes.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">
            You haven't created any classes yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {cls.class_name}
                </h3>
                {cls.subject && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {cls.subject}
                  </p>
                )}
                <div className="mt-4">
                  <span className="text-sm text-[var(--color-primary)]">
                    Manage Assignments →
                  </span>
                </div>
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
        <button
          onClick={() => setSelectedClass(null)}
          className="text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          ← Back to Classes
        </button>
        <button
          onClick={() => {
            setEditingAssignment(null);
            setAssignmentForm({ title: '', description: '', type: 'assignment', maxScore: 100, dueDate: '' });
            setShowAssignmentForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={16} />
          New Assignment
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
        {selectedClass.class_name} – Assignments
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Manage assignments, attach resources, and grade student submissions
      </p>

      {loadingAssignments ? (
        <div className="flex justify-center py-8"><SpinnerIcon /></div>
      ) : assignments.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-center py-8">
          No assignments yet. Click "New Assignment" to create one.
        </p>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              classId={selectedClass.id}
              students={students}
              grades={gradesMap[assignment.id] || {}}
              onGradeChange={(studentId, field, value) => handleGradeChange(assignment.id, studentId, field, value)}
              onSaveGrades={(assignmentId) => handleSaveGrades(assignmentId)}
              savingGrades={savingGrades}
              onEdit={openEditForm}
              onDelete={openDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
            </h2>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Title *</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  required
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Type</label>
                <select
                  value={assignmentForm.type}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Max Score *</label>
                <input
                  type="number"
                  step="any"
                  value={assignmentForm.maxScore}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: parseFloat(e.target.value) })}
                  required
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Description</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  rows="2"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignmentForm(false)}
                  className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl"
                >
                  {editingAssignment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? All grades and submissions for this assignment will also be deleted."
        confirmText="Delete"
        type="danger"
      />

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast({ isOpen: false, type: 'success', message: '' })}
      />
    </div>
  );
}