// ScheduleManagement.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  createClass,
  deleteMyClass,
  getClassEnrolledRooster,
  getMyClasses,
  updateClass,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import ConfirmModal from '../../../../ConfirmModal';
import Toast from '../../../../Toast';
import { formatTimeRange, getScheduleBlocksFromClass } from '../../../../../utils/scheduleUtils';
import ClassDetails from './ClassDetails';
import ClassEditorModal from './ClassEditorModal';

function scheduleSummary(classItem) {
  const blocks = getScheduleBlocksFromClass(classItem);
  if (!blocks.length) return 'No schedule configured';
  const first = blocks[0];
  const text = `${first.day} ${formatTimeRange(first.start_time, first.end_time)}`;
  if (blocks.length === 1) return text;
  return `${text} + ${blocks.length - 1} more`;
}

export default function ScheduleManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => String(a.class_name || '').localeCompare(String(b.class_name || ''))),
    [classes],
  );

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const filteredClasses = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return sortedClasses;
    return sortedClasses.filter((classItem) => {
      const className = String(classItem.class_name || '').toLowerCase();
      const subject = String(classItem.subject || '').toLowerCase();
      const grade = String(classItem.grade_level || '').toLowerCase();
      const room = String(classItem.room_number || '').toLowerCase();
      return (
        className.includes(query)
        || subject.includes(query)
        || grade.includes(query)
        || room.includes(query)
      );
    });
  }, [searchQuery, sortedClasses]);

  const classStats = useMemo(() => {
    const totalClasses = sortedClasses.length;
    const totalEnrolled = sortedClasses.reduce(
      (sum, classItem) => sum + Number(classItem.enrolledCount || 0),
      0,
    );
    const classesWithMeetingLink = sortedClasses.filter((classItem) => Boolean(classItem.meeting_link)).length;

    return {
      totalClasses,
      totalEnrolled,
      classesWithMeetingLink,
    };
  }, [sortedClasses]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await getMyClasses();
      const classList = response.data || [];
      const withCounts = await Promise.all(
        classList.map(async (classItem) => {
          try {
            const rosterResponse = await getClassEnrolledRooster(classItem.id);
            return { ...classItem, enrolledCount: rosterResponse.data?.length || 0 };
          } catch {
            return { ...classItem, enrolledCount: 0 };
          }
        }),
      );
      setClasses(withCounts);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load your classes.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openCreateModal = () => {
    setEditorMode('create');
    setEditingClass(null);
    setEditorOpen(true);
  };

  const openEditModal = (classItem) => {
    setEditorMode('edit');
    setEditingClass(classItem);
    setEditorOpen(true);
  };

  const handleSaveClass = async (payload) => {
    setSubmitting(true);
    try {
      if (editorMode === 'edit' && editingClass) {
        await updateClass(editingClass.id, payload);
        setToast({ isOpen: true, type: 'success', message: 'Class updated successfully.' });
      } else {
        await createClass(payload);
        setToast({ isOpen: true, type: 'success', message: 'Class created successfully.' });
      }
      setEditorOpen(false);
      setEditingClass(null);
      await fetchClasses();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Unable to save class.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (classItem) => {
    setClassToDelete(classItem);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!classToDelete) return;
    try {
      await deleteMyClass(classToDelete.id);
      setToast({ isOpen: true, type: 'success', message: 'Class deleted successfully.' });
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId('');
      }
      setClassToDelete(null);
      setConfirmOpen(false);
      await fetchClasses();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to delete class.',
      });
    }
  };

  if (selectedClass) {
    return <ClassDetails classId={selectedClass.id} onBack={() => setSelectedClassId('')} />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Class Schedule Manager</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Manage classes, schedules, and quick class actions from one place.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            + New Class
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Total Classes</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{classStats.totalClasses}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Total Enrolled</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{classStats.totalEnrolled}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">With Meeting Link</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{classStats.classesWithMeetingLink}</p>
          </div>
        </div>

        <div className="mb-6">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search class name, subject, grade, or room"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Showing {filteredClasses.length} of {sortedClasses.length} classes
          </p>
        </div>

        {sortedClasses.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
            <p className="text-[var(--color-text-muted)]">No classes found. Create one to get started.</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
            <p className="text-[var(--color-text-muted)]">No classes matched your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] line-clamp-2">
                    {classItem.class_name}
                  </h2>
                  <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {classItem.grade_level || 'General'}
                  </span>
                </div>

                {classItem.subject && (
                  <p className="mb-1 text-sm text-[var(--color-text-secondary)]">{classItem.subject}</p>
                )}

                <p className="text-sm text-[var(--color-text-secondary)]">{scheduleSummary(classItem)}</p>

                <div className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
                  <p>Enrolled: {classItem.enrolledCount || 0}</p>
                  {classItem.room_number && <p>Room: {classItem.room_number}</p>}
                  {classItem.max_students && <p>Capacity: {classItem.max_students}</p>}
                </div>

                {classItem.meeting_link && (
                  <a
                    href={classItem.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Open meeting link
                  </a>
                )}

                {classItem.description && (
                  <p className="mt-3 text-sm text-[var(--color-text-muted)] line-clamp-3">
                    {classItem.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedClassId(classItem.id)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] transition hover:bg-[var(--color-border)]/40"
                  >
                    Open Class
                  </button>
                  <button
                    onClick={() => openEditModal(classItem)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-border)]/40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(classItem)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClassEditorModal
        key={`${editorMode}-${editingClass?.id || 'new'}-${editorOpen ? 'open' : 'closed'}`}
        isOpen={editorOpen}
        mode={editorMode}
        initialData={editingClass}
        onClose={() => {
          if (submitting) return;
          setEditorOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleSaveClass}
        submitting={submitting}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setClassToDelete(null);
        }}
        onConfirm={performDelete}
        title="Delete Class"
        message="Are you sure you want to delete this class? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
      />
    </div>
  );
}