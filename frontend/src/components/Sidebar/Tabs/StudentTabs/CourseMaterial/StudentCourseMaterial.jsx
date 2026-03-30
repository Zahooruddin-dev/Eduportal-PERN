import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  getStudentEnrolledShedule,
  getClassResources,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { FileText, ExternalLink, Link as LinkIcon, ChevronDown, MessageSquare } from 'lucide-react';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import CommentSection from '../../Shared/CommentSection';
import { getFileViewUrl } from '../../../../../utils/fileUtils';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function toTimestamp(value, fallback = 0) {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

export default function StudentCourseMaterial() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const [showCommentsFor, setShowCommentsFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const availableTags = useMemo(() => {
    const tags = new Set();
    resources.forEach((resource) => {
      (resource.tags || []).forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (normalized) tags.add(normalized);
      });
    });
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let next = [...resources];

    if (query) {
      next = next.filter((resource) => {
        const haystack = [
          resource.title,
          resource.description,
          resource.content,
          ...(resource.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    if (selectedTag !== 'all') {
      next = next.filter((resource) =>
        (resource.tags || []).some(
          (tag) => String(tag).toLowerCase() === selectedTag.toLowerCase(),
        ),
      );
    }

    next.sort((a, b) => {
      if (sortBy === 'oldest') {
        return toTimestamp(a.created_at) - toTimestamp(b.created_at);
      }
      if (sortBy === 'expiring') {
        const aExpiry = toTimestamp(a.expires_at, Number.POSITIVE_INFINITY);
        const bExpiry = toTimestamp(b.expires_at, Number.POSITIVE_INFINITY);
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return toTimestamp(b.created_at) - toTimestamp(a.created_at);
      }
      return toTimestamp(b.created_at) - toTimestamp(a.created_at);
    });

    return next;
  }, [resources, searchQuery, selectedTag, sortBy]);

  useEffect(() => {
    if (selectedTag !== 'all' && !availableTags.includes(selectedTag)) {
      setSelectedTag('all');
    }
  }, [availableTags, selectedTag]);

  const fetchResourcesForClass = async (classId) => {
    if (!classId) {
      setResources([]);
      return;
    }

    setLoadingResources(true);
    setError('');
    try {
      const res = await getClassResources(classId);
      setResources(res.data || []);
    } catch {
      setError('Failed to load resources for this class.');
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchClasses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getStudentEnrolledShedule(user.id);
        const enrolledClasses = res.data || [];
        setClasses(enrolledClasses);

        if (enrolledClasses.length > 0) {
          const firstClassId = enrolledClasses[0].id;
          setSelectedClassId(firstClassId);
          await fetchResourcesForClass(firstClassId);
        } else {
          setSelectedClassId('');
          setResources([]);
        }
      } catch {
        setError('Failed to load enrolled classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.id]);

  const handleClassChange = async (event) => {
    const nextClassId = event.target.value;
    setSelectedClassId(nextClassId);
    await fetchResourcesForClass(nextClassId);
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
      <header className='mb-5'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Course Material</h1>
        <p className='text-sm text-[var(--color-text-muted)]'>
          Access files and links shared by your teacher.
        </p>
      </header>

      {error && (
        <div
          role='alert'
          className='mb-4 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]'
        >
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <p className='text-[var(--color-text-muted)]'>You are not enrolled in any classes yet.</p>
        </div>
      ) : (
        <>
          <section className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
              <div>
                <label
                  htmlFor='student-resource-class-selector'
                  className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'
                >
                  Class
                </label>
                <div className='relative'>
                  <select
                    id='student-resource-class-selector'
                    value={selectedClassId}
                    onChange={handleClassChange}
                    className='w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                  >
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
                    aria-hidden='true'
                  />
                </div>
              </div>

              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
                <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Selected Class</p>
                <p className='text-base font-semibold text-[var(--color-text-primary)]'>
                  {selectedClass?.class_name || '-'}
                </p>
              </div>

              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
                <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Resources</p>
                <p className='text-base font-semibold text-[var(--color-text-primary)]'>{resources.length}</p>
              </div>
            </div>
          </section>

          <section className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
              <div>
                <label htmlFor='student-resource-search' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
                  Search
                </label>
                <input
                  id='student-resource-search'
                  type='text'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder='Search title, description, link, tags'
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                />
              </div>

              <div>
                <label htmlFor='student-resource-tag-filter' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
                  Tag
                </label>
                <select
                  id='student-resource-tag-filter'
                  value={selectedTag}
                  onChange={(event) => setSelectedTag(event.target.value)}
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                >
                  <option value='all'>All tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor='student-resource-sort' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
                  Sort
                </label>
                <select
                  id='student-resource-sort'
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                >
                  <option value='newest'>Newest first</option>
                  <option value='oldest'>Oldest first</option>
                  <option value='expiring'>Expiring soon</option>
                </select>
              </div>
            </div>

            <p className='mt-2 text-xs text-[var(--color-text-muted)]'>
              Showing {filteredResources.length} of {resources.length} resources
            </p>
          </section>

          {loadingResources ? (
            <div className='flex h-40 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'>
              <SpinnerIcon />
            </div>
          ) : resources.length === 0 ? (
            <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
              <p className='text-[var(--color-text-muted)]'>No materials available for this class yet.</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
              <p className='text-[var(--color-text-muted)]'>No materials match your current filters.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredResources.map((resource) => (
                <article
                  key={resource.id}
                  className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm'
                >
                  <h3 className='text-base font-semibold text-[var(--color-text-primary)]'>
                    {resource.title}
                  </h3>

                  <div className='mt-2 flex flex-wrap gap-2'>
                    <span className='rounded-full bg-[var(--color-primary)]/12 px-2 py-1 text-xs text-[var(--color-primary)]'>
                      {resource.type === 'file' ? 'File' : 'Link'}
                    </span>

                    {resource.tags?.length > 0 &&
                      resource.tags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className='rounded-md bg-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]'
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  {resource.description && (
                    <p className='mt-2 text-sm text-[var(--color-text-secondary)]'>{resource.description}</p>
                  )}

                  <div className='mt-3 flex flex-wrap gap-2'>
                    {resource.type === 'file' ? (
                      <button
                        type='button'
                        onClick={() => {
                          setViewingFile({
                            url: getFileViewUrl(resource.content),
                            title: resource.title,
                          });
                        }}
                        className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/50'
                      >
                        <FileText size={14} />
                        View File
                      </button>
                    ) : (
                      <a
                        href={resource.content}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/50'
                      >
                        <LinkIcon size={14} />
                        Open Link
                        <ExternalLink size={12} />
                      </a>
                    )}

                    <button
                      type='button'
                      onClick={() => setShowCommentsFor(resource.id)}
                      className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
                    >
                      <MessageSquare size={14} />
                      Comments ({resource.comment_count ?? 0})
                    </button>
                  </div>

                  <p className='mt-3 text-xs text-[var(--color-text-muted)]'>
                    Added: {formatDate(resource.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {showCommentsFor && (
        <CommentSection
          classId={selectedClassId}
          resourceId={showCommentsFor}
          onClose={() => setShowCommentsFor(null)}
        />
      )}

      {viewingFile && (
        <FileViewerModal
          fileUrl={viewingFile.url}
          title={viewingFile.title}
          isOpen={Boolean(viewingFile)}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}
