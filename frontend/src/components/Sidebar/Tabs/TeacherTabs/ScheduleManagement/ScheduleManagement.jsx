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
  const [selectedClass, setSelectedClass] = useState(null);
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
    return <ClassDetails classId={selectedClass.id} onBack={() => setSelectedClass(null)} />;
  }

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6'>
      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
      />

      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>My Classes</h1>
          <p className='text-sm text-[var(--color-text-muted)]'>
            Create classes with detailed day-by-day schedules and meeting links.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white hover:bg-[var(--color-primary-hover)]'
        >
          + New Class
        </button>
      </div>

      {sortedClasses.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <p className='text-[var(--color-text-muted)]'>No classes found. Create one to get started.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sortedClasses.map((classItem) => (
            <article
              key={classItem.id}
              className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:shadow-md'
            >
              <div className='mb-2 flex items-start justify-between gap-2'>
                <h2 className='text-lg font-semibold text-[var(--color-text-primary)] line-clamp-2'>
                  {classItem.class_name}
                </h2>
                <span className='rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)]'>
                  {classItem.grade_level || 'General'}
                </span>
              </div>

              {classItem.subject && (
                <p className='mb-1 text-sm text-[var(--color-text-secondary)]'>{classItem.subject}</p>
              )}

              <p className='text-sm text-[var(--color-text-secondary)]'>{scheduleSummary(classItem)}</p>

              <div className='mt-2 space-y-1 text-xs text-[var(--color-text-muted)]'>
                <p>Enrolled: {classItem.enrolledCount || 0}</p>
                {classItem.room_number && <p>Room: {classItem.room_number}</p>}
                {classItem.max_students && <p>Capacity: {classItem.max_students}</p>}
              </div>

              {classItem.meeting_link && (
                <a
                  href={classItem.meeting_link}
                  target='_blank'
                  rel='noreferrer'
                  className='mt-3 inline-block text-sm text-[var(--color-primary)] hover:underline'
                >
                  Open meeting link
                </a>
              )}

              {classItem.description && (
                <p className='mt-3 text-sm text-[var(--color-text-muted)] line-clamp-3'>
                  {classItem.description}
                </p>
              )}

              <div className='mt-4 flex flex-wrap gap-2'>
                <button
                  onClick={() => setSelectedClass(classItem)}
                  className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/50'
                >
                  View Details
                </button>
                <button
                  onClick={() => openEditModal(classItem)}
                  className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/50'
                >
                  Edit
                </button>
                <button
                  onClick={() => requestDelete(classItem)}
                  className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

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
        title='Delete Class'
        message='Are you sure you want to delete this class? This cannot be undone.'
        confirmText='Delete'
        cancelText='Cancel'
        type='danger'
      />
    </div>
  );
}
