import { useMemo, useState } from 'react';
import { Search, Bell, Clock } from 'lucide-react';

export default function InfoNoticesTab({ resources }) {
  const [searchQuery, setSearchQuery] = useState('');

  const infoNotices = useMemo(() => {
    let items = resources.filter(r => 
      r.material_category === 'info' || r.material_category === 'notice'
    );
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [resources, searchQuery]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  if (infoNotices.length === 0) {
    return (
      <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
        <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
          <Bell size={40} className='text-[var(--color-primary)]' />
        </div>
        <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
          No Info & Notices
        </p>
        <p className='mt-2 text-[var(--color-text-muted)]'>
          No announcements or notices available for this course yet.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Search */}
      <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
        <div className='relative'>
          <Search
            size={18}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
          />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search announcements...'
            className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]/40 transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
          />
        </div>
        <p className='mt-3 text-xs text-[var(--color-text-muted)]'>
          Showing {infoNotices.length} item{infoNotices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Notices List */}
      <div className='space-y-3 md:space-y-4'>
        {infoNotices.map((notice) => (
          <article
            key={notice.id}
            className='group rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:border-[var(--color-primary)]/60 hover:shadow-lg hover:-translate-y-1 md:rounded-2xl md:p-6'
          >
            {/* Header */}
            <div className='flex items-start gap-3 md:gap-4'>
              <div className='rounded-lg bg-[var(--color-primary)]/10 p-2 md:p-2.5 flex-shrink-0 mt-1'>
                {notice.material_category === 'notice' ? (
                  <Bell size={20} className='text-[var(--color-primary)]' />
                ) : (
                  <Clock size={20} className='text-[var(--color-primary)]' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1'>
                    <h3 className='font-bold text-[var(--color-text-primary)] md:text-lg break-words'>
                      {notice.title}
                    </h3>
                    <div className='mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]'>
                      <span className='inline-flex items-center gap-1 rounded-full bg-[var(--color-border)]/70 px-2.5 py-1 capitalize'>
                        {notice.material_category}
                      </span>
                      <span className='flex items-center gap-1'>
                        <Clock size={14} />
                        {formatDate(notice.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            {notice.description && (
              <div className='mt-4 ml-11 md:ml-14'>
                <p className='text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap'>
                  {notice.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {notice.tags && notice.tags.length > 0 && (
              <div className='mt-4 ml-11 md:ml-14 flex flex-wrap gap-2'>
                {notice.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className='rounded-full bg-[var(--color-border)]/60 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]'
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
