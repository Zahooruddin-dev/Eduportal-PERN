import { useState, useEffect } from 'react';
import { getMyAnnouncements } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const CardSkeleton = () => (
    <div className="animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--color-border)]" />
        <div className="flex-1">
          <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[var(--color-border)] rounded w-1/2 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-[var(--color-border)] rounded w-full" />
            <div className="h-3 bg-[var(--color-border)] rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          Announcements
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
        Announcements
      </h1>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-muted)]">
            No announcements from your enrolled classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {announcements.map((ann) => (
            <article
              key={ann.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--color-border-hover)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-sm font-medium text-[var(--color-primary)]">
                    {getInitials(ann.teacher_name)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                      {ann.title}
                    </h3>
                    <span className="inline-flex items-center text-xs text-[var(--color-text-muted)] bg-[var(--color-border)]/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {ann.class_name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Posted by <span className="font-medium text-[var(--color-text-primary)]">{ann.teacher_name}</span>
                    &nbsp;• {new Date(ann.created_at).toLocaleString()}
                  </p>
                  <div className="mt-3 text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap line-clamp-4">
                    {ann.content}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}