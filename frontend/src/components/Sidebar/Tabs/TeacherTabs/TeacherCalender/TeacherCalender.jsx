import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, ExternalLink, Pencil } from 'lucide-react';
import { getMyClasses, updateClass } from '../../../../../api/api';
import Toast from '../../../../Toast';
import { SpinnerIcon } from '../../../../Icons/Icon';
import {
  buildCalendarEvents,
  buildGoogleCalendarDraftUrl,
  DAY_ORDER,
  downloadIcsForEvents,
  formatTimeRange,
  groupEventsByDay,
} from '../../../../../utils/scheduleUtils';
import ClassEditorModal from '../ScheduleManagement/ClassEditorModal';

export default function TeacherCalender() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await getMyClasses();
      setClasses(response.data || []);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load your class calendar.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const events = useMemo(() => buildCalendarEvents(classes), [classes]);
  const groupedEvents = useMemo(() => groupEventsByDay(events), [events]);

  const openGoogleDraft = (eventItem) => {
    const url = buildGoogleCalendarDraftUrl(eventItem);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openEdit = (classId) => {
    const found = classes.find((item) => item.id === classId || item.class_id === classId);
    if (!found) return;
    setEditingClass(found);
    setEditorOpen(true);
  };

  const saveClass = async (payload) => {
    if (!editingClass?.id) return;
    setSaving(true);
    try {
      await updateClass(editingClass.id, payload);
      setToast({ isOpen: true, type: 'success', message: 'Class schedule updated.' });
      setEditorOpen(false);
      setEditingClass(null);
      await loadClasses();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to update class.',
      });
    } finally {
      setSaving(false);
    }
  };

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

      <div className='mb-6 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Teacher Calendar</h1>
          <p className='text-sm text-[var(--color-text-muted)]'>
            Edit your class schedule and keep calendar data ready for Google sync.
          </p>
        </div>

        <button
          type='button'
          onClick={() => downloadIcsForEvents(events, 'teacher-class-calendar.ics')}
          disabled={events.length === 0}
          className='inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Download size={16} />
          Export .ics
        </button>
      </div>

      <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Classes</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{classes.length}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Weekly Sessions</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{events.length}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Editing</p>
          <p className='mt-1 text-sm font-medium text-[var(--color-text-primary)]'>Inline class updates</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <CalendarDays className='mx-auto mb-2 text-[var(--color-text-muted)]' size={28} />
          <p className='text-[var(--color-text-muted)]'>No schedule blocks available yet.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {DAY_ORDER.map((day) => (
            <section
              key={day}
              className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
            >
              <h2 className='mb-3 text-lg font-semibold text-[var(--color-text-primary)]'>{day}</h2>
              {groupedEvents[day]?.length ? (
                <div className='space-y-3'>
                  {groupedEvents[day].map((eventItem) => (
                    <article
                      key={eventItem.id}
                      className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'
                    >
                      <p className='text-sm font-semibold text-[var(--color-text-primary)]'>{eventItem.title}</p>
                      {eventItem.subject && (
                        <p className='text-xs text-[var(--color-text-secondary)]'>{eventItem.subject}</p>
                      )}
                      <p className='mt-1 text-xs text-[var(--color-text-muted)]'>
                        {formatTimeRange(eventItem.start_time, eventItem.end_time)}
                      </p>
                      {eventItem.room_number && (
                        <p className='text-xs text-[var(--color-text-muted)]'>Room: {eventItem.room_number}</p>
                      )}

                      <div className='mt-2 flex flex-wrap gap-2'>
                        <button
                          type='button'
                          onClick={() => openEdit(eventItem.classId)}
                          className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-border)]/60'
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          type='button'
                          onClick={() => openGoogleDraft(eventItem)}
                          className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-border)]/60'
                        >
                          <ExternalLink size={12} />
                          Google Draft
                        </button>
                        {eventItem.meeting_link && (
                          <a
                            href={eventItem.meeting_link}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60'
                          >
                            Join Link
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-[var(--color-text-muted)]'>No sessions.</p>
              )}
            </section>
          ))}
        </div>
      )}

      <ClassEditorModal
        key={`teacher-calendar-${editingClass?.id || 'none'}-${editorOpen ? 'open' : 'closed'}`}
        isOpen={editorOpen}
        mode='edit'
        initialData={editingClass}
        onClose={() => {
          if (saving) return;
          setEditorOpen(false);
          setEditingClass(null);
        }}
        onSubmit={saveClass}
        submitting={saving}
      />
    </div>
  );
}
