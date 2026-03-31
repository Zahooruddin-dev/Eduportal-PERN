import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../../../../api/api';
import Toast from '../../../Toast';

function toAudienceLabel(value) {
  const audience = String(value || '').toLowerCase();
  const map = {
    all: 'All users',
    students: 'Students',
    teachers: 'Teachers',
    parents: 'Parents',
    students_teachers: 'Students + Teachers',
    students_parents: 'Students + Parents',
    teachers_parents: 'Teachers + Parents',
  };
  return map[audience] || audience;
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export default function AdminNotificationsCenter({
  title = 'Notifications',
  subtitle = 'Announcements from admin are listed here. Mark them as read to clear alerts.',
  emptyMessage = 'No announcements available right now.',
  pollIntervalMs = 20000,
  onUnreadCountChange,
}) {
  const [items, setItems] = useState([]);
  const [includeRead, setIncludeRead] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingById, setMarkingById] = useState({});
  const [markingAll, setMarkingAll] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const openToast = useCallback((type, message) => {
    setToast({ isOpen: true, type, message });
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  useEffect(() => {
    if (typeof onUnreadCountChange === 'function') {
      onUnreadCountChange(unreadCount);
    }
  }, [onUnreadCountChange, unreadCount]);

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await getAdminNotifications({ includeRead });
      setItems(response.data || []);
    } catch (error) {
      if (!silent) {
        openToast('error', error?.response?.data?.message || 'Failed to load notifications.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [includeRead, openToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadNotifications({ silent: true });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications, pollIntervalMs]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadNotifications({ silent: true });
    setRefreshing(false);
  };

  const handleMarkRead = async (announcementId) => {
    if (!announcementId || markingById[announcementId]) return;
    setMarkingById((previous) => ({ ...previous, [announcementId]: true }));

    try {
      await markAdminNotificationRead(announcementId);
      setItems((previous) => previous.map((item) => (
        item.id === announcementId
          ? {
              ...item,
              is_read: true,
              read_at: item.read_at || new Date().toISOString(),
            }
          : item
      )));
    } catch (error) {
      openToast('error', error?.response?.data?.message || 'Failed to mark notification as read.');
    } finally {
      setMarkingById((previous) => ({ ...previous, [announcementId]: false }));
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAdminNotificationsRead();
      setItems((previous) => previous.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
      })));
      openToast('success', 'All notifications marked as read.');
    } catch (error) {
      openToast('error', error?.response?.data?.message || 'Failed to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className='min-h-screen bg-[var(--color-bg)]'>
      <div className='max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6'>
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>{title}</h1>
              <p className='mt-1 text-sm text-[var(--color-text-muted)]'>{subtitle}</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type='button'
                onClick={handleMarkAllRead}
                disabled={!unreadCount || markingAll}
                className='inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
              >
                <CheckCircle2 size={14} />
                {markingAll ? 'Marking...' : `Mark all read (${unreadCount})`}
              </button>
            </div>
          </div>

          <div className='mt-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]'>
            <input
              id='includeRead'
              type='checkbox'
              checked={includeRead}
              onChange={(event) => setIncludeRead(event.target.checked)}
              className='accent-[var(--color-primary)]'
            />
            <label htmlFor='includeRead'>Show already read notifications</label>
          </div>
        </div>

        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
          {loading ? (
            <div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-8 text-center'>
              <Bell className='mx-auto h-8 w-8 text-[var(--color-text-muted)]' />
              <p className='mt-2 text-sm text-[var(--color-text-muted)]'>{emptyMessage}</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {items.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.is_read
                      ? 'border-[var(--color-border)] bg-[var(--color-input-bg)]/60'
                      : 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/5'
                  }`}
                >
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                    <div>
                      <h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>{item.title}</h2>
                      <p className='mt-1 text-xs text-[var(--color-text-muted)]'>
                        Audience: {toAudienceLabel(item.audience_scope)}
                        {' '}• Posted by {item.created_by_username}
                        {' '}• {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    {!item.is_read && (
                      <button
                        type='button'
                        onClick={() => handleMarkRead(item.id)}
                        disabled={markingById[item.id]}
                        className='self-start rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
                      >
                        {markingById[item.id] ? 'Saving...' : 'Mark read'}
                      </button>
                    )}
                  </div>
                  <p className='mt-3 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>{item.content}</p>
                  {item.expires_at && (
                    <p className='mt-2 text-xs text-[var(--color-text-muted)]'>Expires: {formatDateTime(item.expires_at)}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
      />
    </div>
  );
}
