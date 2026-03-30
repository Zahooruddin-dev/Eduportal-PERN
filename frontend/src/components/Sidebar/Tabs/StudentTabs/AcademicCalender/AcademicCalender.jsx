import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getStudentEnrolledShedule } from '../../../../../api/api';
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

export default function AcademicCalender() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const loadSchedule = async () => {
      setLoading(true);
      try {
        const response = await getStudentEnrolledShedule(user.id);
        if (mounted) setClasses(response.data || []);
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.error || 'Failed to load your class calendar.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSchedule();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const events = useMemo(() => buildCalendarEvents(classes), [classes]);
  const groupedEvents = useMemo(() => groupEventsByDay(events), [events]);

  const classCount = useMemo(() => {
    const ids = new Set(classes.map((item) => String(item.class_id || item.id)));
    return ids.size;
  }, [classes]);

  const openGoogleDraft = (eventItem) => {
    const url = buildGoogleCalendarDraftUrl(eventItem);
    window.open(url, '_blank', 'noopener,noreferrer');
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
          <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Academic Calendar</h1>
          <p className='text-sm text-[var(--color-text-muted)]'>
            Weekly view of your enrolled classes with export-ready event data.
          </p>
        </div>

        <button
          type='button'
          onClick={() => downloadIcsForEvents(events, 'student-academic-calendar.ics')}
          disabled={events.length === 0}
          className='inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Download size={16} />
          Export .ics
        </button>
      </div>

      <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Enrolled Classes</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{classCount}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Weekly Sessions</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{events.length}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Google Ready</p>
          <p className='mt-1 text-sm font-medium text-[var(--color-text-primary)]'>Draft links available</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <CalendarDays className='mx-auto mb-2 text-[var(--color-text-muted)]' size={28} />
          <p className='text-[var(--color-text-muted)]'>No class schedule available yet.</p>
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
    </div>
  );
}
