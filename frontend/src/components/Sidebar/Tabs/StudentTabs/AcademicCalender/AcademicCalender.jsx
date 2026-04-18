import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, Download, ExternalLink, RefreshCcw } from 'lucide-react';
import {
  createMyCalendarSubscription,
  downloadMyCalendarIcs,
  getMyCalendarEvents,
  getMyCalendarSubscription,
  rotateMyCalendarSubscription,
} from '../../../../../api/api';
import Toast from '../../../../Toast';
import { SpinnerIcon } from '../../../../Icons/Icon';
import {
  buildGoogleCalendarDraftUrl,
  DAY_ORDER,
  formatTimeRange,
  groupEventsByDay,
} from '../../../../../utils/scheduleUtils';

function saveBlob(blob, fileName) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function AcademicCalender() {
  const [classSessions, setClassSessions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [subscriptionMeta, setSubscriptionMeta] = useState({
    hasActiveSubscription: false,
    expiresAt: null,
    createdAt: null,
    ttlDays: 90,
  });
  const [subscriptionLink, setSubscriptionLink] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  useEffect(() => {
    let mounted = true;

    const loadCalendar = async () => {
      setLoading(true);
      try {
        const [eventsResponse, subscriptionResponse] = await Promise.all([
          getMyCalendarEvents(),
          getMyCalendarSubscription(),
        ]);

        if (!mounted) return;

        setClassSessions(eventsResponse.data?.classSessions || []);
        setDeadlines(eventsResponse.data?.deadlines || []);
        setExceptions(eventsResponse.data?.exceptions || []);
        setSubscriptionMeta(subscriptionResponse.data || {
          hasActiveSubscription: false,
          expiresAt: null,
          createdAt: null,
          ttlDays: 90,
        });
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.message || 'Failed to load your class calendar.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCalendar();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedEvents = useMemo(() => groupEventsByDay(classSessions), [classSessions]);

  const classCount = useMemo(() => {
    const ids = new Set(classSessions.map((item) => String(item.classId || item.class_id || item.id)));
    return ids.size;
  }, [classSessions]);

  const hasActiveGeneratedLink = Boolean(subscriptionLink?.subscribeUrl);

  const openGoogleDraft = (eventItem) => {
    const url = buildGoogleCalendarDraftUrl(eventItem);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = async () => {
    setBusyAction('download');
    try {
      const response = await downloadMyCalendarIcs();
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'text/calendar;charset=utf-8' });
      saveBlob(blob, 'student-academic-calendar.ics');
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to export calendar.',
      });
    } finally {
      setBusyAction('');
    }
  };

  const handleGenerateSubscription = async (rotate = false) => {
    setBusyAction(rotate ? 'rotate' : 'generate');
    try {
      const response = rotate
        ? await rotateMyCalendarSubscription()
        : await createMyCalendarSubscription();
      setSubscriptionLink(response.data);
      setSubscriptionMeta((current) => ({
        ...current,
        hasActiveSubscription: true,
        expiresAt: response.data?.expiresAt || current.expiresAt,
        createdAt: response.data?.createdAt || current.createdAt,
      }));
      setToast({
        isOpen: true,
        type: 'success',
        message: rotate
          ? 'Subscription link rotated successfully.'
          : 'Subscription link generated successfully.',
      });
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to generate subscription link.',
      });
    } finally {
      setBusyAction('');
    }
  };

  const handleCopyLink = async () => {
    if (!subscriptionLink?.subscribeUrl) return;
    try {
      await navigator.clipboard.writeText(subscriptionLink.subscribeUrl);
      setToast({
        isOpen: true,
        type: 'success',
        message: 'Subscription URL copied to clipboard.',
      });
    } catch {
      setToast({
        isOpen: true,
        type: 'error',
        message: 'Failed to copy subscription URL.',
      });
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
          <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Academic Calendar</h1>
          <p className='text-sm text-[var(--color-text-muted)]'>
            Weekly view of your enrolled classes with export-ready event data.
          </p>
        </div>

        <button
          type='button'
          onClick={handleDownloadIcs}
          disabled={classSessions.length === 0 || busyAction === 'download'}
          className='inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Download size={16} />
          {busyAction === 'download' ? 'Exporting...' : 'Export .ics'}
        </button>
      </div>

      <div className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-[var(--color-text-primary)]'>Google Calendar Subscribe</p>
            <p className='text-xs text-[var(--color-text-muted)]'>
              Use one subscription link to keep Google Calendar synced with class sessions, deadlines, and institute updates.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => handleGenerateSubscription(false)}
              disabled={busyAction === 'generate' || busyAction === 'rotate'}
              className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 disabled:opacity-60'
            >
              <ExternalLink size={13} />
              {busyAction === 'generate' ? 'Generating...' : 'Generate Link'}
            </button>
            <button
              type='button'
              onClick={() => handleGenerateSubscription(true)}
              disabled={busyAction === 'generate' || busyAction === 'rotate'}
              className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 disabled:opacity-60'
            >
              <RefreshCcw size={13} />
              {busyAction === 'rotate' ? 'Rotating...' : 'Rotate'}
            </button>
          </div>
        </div>

        <div className='mt-3 text-xs text-[var(--color-text-muted)]'>
          Active subscription: {subscriptionMeta.hasActiveSubscription ? 'Yes' : 'No'}
          {subscriptionMeta.expiresAt ? ` • Expires: ${new Date(subscriptionMeta.expiresAt).toLocaleString()}` : ''}
        </div>

        {hasActiveGeneratedLink && (
          <div className='mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
            <p className='text-xs font-medium text-[var(--color-text-primary)]'>Subscription URL</p>
            <p className='mt-1 break-all text-xs text-[var(--color-text-secondary)]'>{subscriptionLink.subscribeUrl}</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={handleCopyLink}
                className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60'
              >
                <Copy size={12} />
                Copy URL
              </button>
              {subscriptionLink.webcalUrl && (
                <a
                  href={subscriptionLink.webcalUrl}
                  className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-border)]/60'
                >
                  <ExternalLink size={12} />
                  Open webcal link
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Enrolled Classes</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{classCount}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Weekly Sessions</p>
          <p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{classSessions.length}</p>
        </div>
        <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Deadlines / Exceptions</p>
          <p className='mt-1 text-sm font-medium text-[var(--color-text-primary)]'>{deadlines.length} / {exceptions.length}</p>
        </div>
      </div>

      {classSessions.length === 0 ? (
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
                        {formatTimeRange(eventItem.start_time || eventItem.startTime, eventItem.end_time || eventItem.endTime)}
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
