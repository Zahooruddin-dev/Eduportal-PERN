import { useCallback, useEffect, useState } from 'react';
import { Megaphone, RefreshCw, Trash2 } from 'lucide-react';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  listAdminAnnouncements,
} from '../../../../../api/adminApi';
import ConfirmModal from '../../../../ConfirmModal';
import Toast from '../../../../Toast';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'students', label: 'Only students' },
  { value: 'teachers', label: 'Only teachers' },
  { value: 'parents', label: 'Only parents' },
  { value: 'students_teachers', label: 'Students and teachers' },
  { value: 'students_parents', label: 'Students and parents' },
  { value: 'teachers_parents', label: 'Teachers and parents' },
];

function toAudienceLabel(value) {
  const option = AUDIENCE_OPTIONS.find((item) => item.value === value);
  return option?.label || value;
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const [form, setForm] = useState({
    title: '',
    content: '',
    audienceScope: 'all',
    expiresAt: '',
  });

  const openToast = useCallback((type, message) => {
    setToast({ isOpen: true, type, message });
  }, []);

  const loadAnnouncements = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await listAdminAnnouncements();
      setAnnouncements(response.data || []);
    } catch (error) {
      if (!silent) {
        openToast('error', error?.response?.data?.message || 'Failed to load admin announcements.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [openToast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadAnnouncements({ silent: true });
    setRefreshing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      openToast('warning', 'Title and content are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audienceScope: form.audienceScope,
        expiresAt: form.expiresAt || null,
      };
      await createAdminAnnouncement(payload);
      setForm({
        title: '',
        content: '',
        audienceScope: form.audienceScope,
        expiresAt: '',
      });
      openToast('success', 'Announcement posted successfully.');
      await loadAnnouncements();
    } catch (error) {
      openToast('error', error?.response?.data?.message || 'Failed to create announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteAdminAnnouncement(pendingDeleteId);
      setAnnouncements((previous) => previous.filter((item) => item.id !== pendingDeleteId));
      openToast('success', 'Announcement deleted.');
    } catch (error) {
      openToast('error', error?.response?.data?.message || 'Failed to delete announcement.');
    }
  };

  return (
    <div className='min-h-screen bg-[var(--color-bg)]'>
      <div className='max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6'>
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Admin Announcements</h1>
              <p className='mt-1 text-sm text-[var(--color-text-muted)]'>
                Publish targeted announcements for students, teachers, and parents.
              </p>
            </div>
            <button
              type='button'
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
            >
              <RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'
        >
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-[var(--color-text-secondary)]'>Title</label>
              <input
                type='text'
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                placeholder='Exam schedule update'
                className='mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-[var(--color-text-secondary)]'>Audience</label>
              <select
                value={form.audienceScope}
                onChange={(event) => setForm((previous) => ({ ...previous, audienceScope: event.target.value }))}
                className='mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-[var(--color-text-secondary)]'>Expires (optional)</label>
              <input
                type='datetime-local'
                value={form.expiresAt}
                onChange={(event) => setForm((previous) => ({ ...previous, expiresAt: event.target.value }))}
                className='mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
              />
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-[var(--color-text-secondary)]'>Message</label>
              <textarea
                rows={4}
                value={form.content}
                onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))}
                placeholder='Share details with your selected audience...'
                className='mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 resize-y'
              />
            </div>
          </div>

          <button
            type='submit'
            disabled={submitting}
            className='inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
          >
            <Megaphone size={15} />
            {submitting ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </form>

        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
          <h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Published Announcements</h2>

          {loading ? (
            <div className='mt-3 rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className='mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-text-muted)]'>
              No announcements posted yet.
            </div>
          ) : (
            <div className='mt-3 space-y-3'>
              {announcements.map((item) => (
                <article key={item.id} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                    <div>
                      <h3 className='text-sm font-semibold text-[var(--color-text-primary)]'>{item.title}</h3>
                      <p className='mt-1 text-xs text-[var(--color-text-muted)]'>
                        {toAudienceLabel(item.audience_scope)}
                        {' '}• Created {formatDateTime(item.created_at)}
                        {' '}• Read by {Number(item.total_reads || 0)} users
                        {item.is_expired ? ' • Expired' : ''}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => setPendingDeleteId(item.id)}
                      className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>

                  <p className='mt-3 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>{item.content}</p>
                  {item.expires_at && (
                    <p className='mt-2 text-xs text-[var(--color-text-muted)]'>
                      Expires: {formatDateTime(item.expires_at)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDelete}
        title='Delete Announcement'
        message='This announcement will be removed for all users. Continue?'
        confirmText='Delete'
        cancelText='Cancel'
        type='danger'
      />

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
      />
    </div>
  );
}
