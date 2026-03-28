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
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import Toast from '../../../../../components/Toast';
import ConfirmModal from '../../../../../components/ConfirmModal';

export default function TeacherGradebook() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [grades, setGrades] = useState({}); // { studentId: { score, feedback } }
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    type: 'assignment',
    maxScore: 100,
    dueDate: '',
  });
  const [savingGrades, setSavingGrades] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch teacher's classes
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

  // When class selected, fetch its assignments and roster
  const fetchClassData = async (classId) => {
    setLoadingAssignments(true);
    setLoadingRoster(true);
    try {
      const [assignmentsRes, rosterRes] = await Promise.all([
        getClassAssignments(classId),
        getClassEnrolledRooster(classId),
      ]);
      setAssignments(assignmentsRes.data);
      setStudents(rosterRes.data);
    } catch (err) {
      setError('Failed to load class data');
    } finally {
      setLoadingAssignments(false);
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchClassData(selectedClass.id);
      setSelectedAssignment(null); // reset
      setGrades({});
    }
  }, [selectedClass]);

  // When assignment selected, fetch its grades
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
      setGrades(gradeMap);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to load grades' });
    }
  };

  useEffect(() => {
    if (selectedAssignment) {
      fetchAssignmentGrades(selectedAssignment.id);
    } else {
      setGrades({});
    }
  }, [selectedAssignment]);

  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
  };

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
    if (!selectedAssignment) return;
    const gradesArray = students.map(student => ({
      studentId: student.student_id,
      score: grades[student.student_id]?.score ?? null,
      feedback: grades[student.student_id]?.feedback ?? null,
    }));
    setSavingGrades(true);
    try {
      await submitAssignmentGrades(selectedClass.id, selectedAssignment.id, { grades: gradesArray });
      setToast({ isOpen: true, type: 'success', message: 'Grades saved successfully' });
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
      if (selectedAssignment?.id === confirmAction) setSelectedAssignment(null);
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
          Gradebook
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
                    Manage Grades →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main gradebook view
  return (
    <div className="p-6">
      {/* Header */}
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
        {selectedClass.class_name} – Gradebook
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Manage assignments and enter grades
      </p>

      {/* Assignments List */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
          Assignments
        </h2>
        {loadingAssignments ? (
          <div className="flex justify-center py-4"><SpinnerIcon /></div>
        ) : assignments.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">No assignments yet. Click "New Assignment" to create one.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`bg-[var(--color-surface)] border rounded-xl p-4 shadow-sm transition-colors ${
                  selectedAssignment?.id === assignment.id
                    ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      {assignment.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                      <span>Type: {assignment.type}</span>
                      <span>Max Score: {assignment.max_score}</span>
                      {assignment.due_date && <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>}
                    </div>
                    {assignment.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                        {assignment.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(assignment)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(assignment.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => handleAssignmentSelect(assignment)}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    {selectedAssignment?.id === assignment.id ? 'Hide Grades' : 'Enter Grades'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grade Entry */}
      {selectedAssignment && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              Grades for: {selectedAssignment.title}
            </h2>
            <button
              onClick={saveGrades}
              disabled={savingGrades}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
            >
              {savingGrades ? <SpinnerIcon /> : <Save size={16} />}
              Save Grades
            </button>
          </div>
          {loadingRoster ? (
            <div className="flex justify-center py-8"><SpinnerIcon /></div>
          ) : students.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No students enrolled in this class.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <thead className="bg-[var(--color-border)]/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {students.map((student) => (
                    <tr key={student.student_id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {student.profile_pic ? (
                            <img
                              src={student.profile_pic}
                              alt={student.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm font-medium">
                              {student.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="ml-3 text-sm text-[var(--color-text-primary)]">
                            {student.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="any"
                          value={grades[student.student_id]?.score ?? ''}
                          onChange={(e) => handleGradeChange(student.student_id, 'score', e.target.value)}
                          className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          placeholder={`Max ${selectedAssignment.max_score}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={grades[student.student_id]?.feedback ?? ''}
                          onChange={(e) => handleGradeChange(student.student_id, 'feedback', e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          rows="1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? All grades for this assignment will also be deleted."
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