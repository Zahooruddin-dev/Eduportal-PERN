import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  getStudentEnrolledShedule,
  getClassResources,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { FileText, ExternalLink, Link as LinkIcon, ChevronDown, MessageSquare, Download, Clock, Users } from 'lucide-react';
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
  const [downloadingAll, setDownloadingAll] = useState(false);

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

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDownloadAll = async () => {
    if (filteredResources.length === 0) return;
    setDownloadingAll(true);
    try {
      for (const resource of filteredResources) {
        if (resource.type === 'file') {
          const fileUrl = getFileViewUrl(resource.content);
          const fileName = `${resource.title}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          await downloadFile(fileUrl, fileName);
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      console.error('Download all failed:', err);
    } finally {
      setDownloadingAll(false);
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
    <div className='min-h-screen bg-[var(--color-bg-primary)] p-3 sm:p-4 md:p-6'>
      <div className='mx-auto max-w-6xl'>
        {/* Header */}
        <header className='mb-6 md:mb-8'>
          <h1 className='text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl'>Course Materials</h1>
          <p className='mt-2 text-sm text-[var(--color-text-muted)] md:text-base'>
            Access files and resources shared by your instructors
          </p>
        </header>

        {/* Error Alert */}
        {error && (
          <div
            role='alert'
            className='mb-4 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)] md:rounded-2xl md:px-5 md:py-4'
          >
            {error}
          </div>
        )}

        {/* No Classes State */}
        {classes.length === 0 ? (
          <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center md:rounded-2xl md:p-8'>
            <p className='text-[var(--color-text-muted)]'>
              You are not enrolled in any classes yet.
            </p>
          </div>
        ) : (
          <>
            {/* Class Selection and Info */}
            <div className='mb-6 space-y-4 md:mb-8'>
              {/* Class Selector */}
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
                <label
                  htmlFor='student-resource-class-selector'
                  className='mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'
                >
                  Select Class
                </label>
                <div className='relative'>
                  <select
                    id='student-resource-class-selector'
                    value={selectedClassId}
                    onChange={handleClassChange}
                    className='w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl md:px-5 md:py-3'
                  >
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
                    aria-hidden='true'
                  />
                </div>
              </div>

              {/* Teacher Info Card */}
              {selectedClass && (
                <div className='rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 p-4 shadow-sm md:rounded-2xl md:p-5'>
                  <h3 className='mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'>
                    Instructor
                  </h3>
                  <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center md:gap-4'>
                    {selectedClass.teacher_profile_pic ? (
                      <img
                        src={selectedClass.teacher_profile_pic}
                        alt='Teacher'
                        className='h-12 w-12 rounded-full object-cover ring-2 ring-[var(--color-primary)]/30'
                      />
                    ) : (
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-base font-semibold text-[var(--color-primary)]'>
                        {selectedClass.teacher_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className='flex-1'>
                      <p className='text-base font-semibold text-[var(--color-text-primary)]'>
                        {selectedClass.teacher_name || 'Instructor'}
                      </p>
                      <p className='text-xs text-[var(--color-text-muted)]'>{selectedClass.subject || 'No subject'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Stats Grid */}
              <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
                <div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm md:rounded-xl md:p-4'>
                  <p className='text-xs uppercase tracking-wider text-[var(--color-text-muted)]'>Class</p>
                  <p className='mt-1 truncate text-sm font-semibold text-[var(--color-text-primary)] md:text-base'>
                    {selectedClass?.class_name || '-'}
                  </p>
                </div>

                <div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm md:rounded-xl md:p-4'>
                  <p className='text-xs uppercase tracking-wider text-[var(--color-text-muted)]'>Resources</p>
                  <p className='mt-1 text-sm font-semibold text-[var(--color-primary)] md:text-base'>{resources.length}</p>
                </div>

                <div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm md:rounded-xl md:p-4'>
                  <p className='text-xs uppercase tracking-wider text-[var(--color-text-muted)]'>Files</p>
                  <p className='mt-1 text-sm font-semibold text-[var(--color-text-primary)] md:text-base'>
                    {resources.filter(r => r.type === 'file').length}
                  </p>
                </div>

                <div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm md:rounded-xl md:p-4'>
                  <p className='text-xs uppercase tracking-wider text-[var(--color-text-muted)]'>Links</p>
                  <p className='mt-1 text-sm font-semibold text-[var(--color-text-primary)] md:text-base'>
                    {resources.filter(r => r.type === 'link').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className='mb-6 space-y-4 md:mb-8'>
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  {/* Search */}
                  <div>
                    <label htmlFor='student-resource-search' className='mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Search
                    </label>
                    <input
                      id='student-resource-search'
                      type='text'
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder='Search materials...'
                      className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]/50 transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    />
                  </div>

                  {/* Tag Filter */}
                  <div>
                    <label htmlFor='student-resource-tag-filter' className='mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Tag Filter
                    </label>
                    <select
                      id='student-resource-tag-filter'
                      value={selectedTag}
                      onChange={(event) => setSelectedTag(event.target.value)}
                      className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    >
                      <option value='all'>All tags</option>
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label htmlFor='student-resource-sort' className='mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Sort
                    </label>
                    <select
                      id='student-resource-sort'
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    >
                      <option value='newest'>Newest first</option>
                      <option value='oldest'>Oldest first</option>
                      <option value='expiring'>Expiring soon</option>
                    </select>
                  </div>
                </div>

                <div className='mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]'>
                  <p>Showing {filteredResources.length} of {resources.length} materials</p>
                  {filteredResources.some(r => r.type === 'file') && (
                    <button
                      type='button'
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className='inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50'
                    >
                      <Download size={14} />
                      {downloadingAll ? 'Downloading...' : 'Download All Files'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resources List */}
            {loadingResources ? (
              <div className='flex h-40 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] md:rounded-2xl'>
                <SpinnerIcon />
              </div>
            ) : resources.length === 0 ? (
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center md:rounded-2xl md:p-8'>
                <p className='text-[var(--color-text-muted)]'>No materials available for this class yet.</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center md:rounded-2xl md:p-8'>
                <p className='text-[var(--color-text-muted)]'>No materials match your current filters.</p>
              </div>
            ) : (
              <div className='grid gap-3 md:gap-4'>
                {filteredResources.map((resource) => (
                  <article
                    key={resource.id}
                    className='group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:border-[var(--color-primary)]/50 hover:shadow-md md:rounded-2xl md:p-5'
                  >
                    {/* Resource Header */}
                    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4'>
                      <div className='flex-1'>
                        <h3 className='text-base font-semibold text-[var(--color-text-primary)] md:text-lg'>
                          {resource.title}
                        </h3>

                        {resource.description && (
                          <p className='mt-1.5 text-sm text-[var(--color-text-secondary)]'>
                            {resource.description}
                          </p>
                        )}

                        {/* Tags */}
                        <div className='mt-2.5 flex flex-wrap gap-2'>
                          <span className='inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/12 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]'>
                            {resource.type === 'file' ? (
                              <>
                                <FileText size={12} />
                                File
                              </>
                            ) : (
                              <>
                                <LinkIcon size={12} />
                                Link
                              </>
                            )}
                          </span>

                          {resource.tags?.length > 0 &&
                            resource.tags.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className='rounded-full bg-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]'
                              >
                                {tag}
                              </span>
                            ))}
                        </div>

                        {/* Metadata */}
                        <div className='mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]'>
                          <div className='flex items-center gap-1'>
                            <Clock size={12} />
                            Added: {formatDate(resource.created_at)}
                          </div>
                          {resource.expires_at && (
                            <div className='flex items-center gap-1 text-[var(--color-warning)]'>
                              <Clock size={12} />
                              Expires: {formatDate(resource.expires_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='mt-4 flex flex-wrap gap-2 md:mt-5'>
                      {resource.type === 'file' ? (
                        <button
                          type='button'
                          onClick={() => {
                            setViewingFile({
                              url: getFileViewUrl(resource.content),
                              title: resource.title,
                            });
                          }}
                          className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/5 md:gap-2 md:rounded-xl md:px-4'
                        >
                          <FileText size={16} />
                          <span className='hidden sm:inline'>View</span>File
                        </button>
                      ) : (
                        <a
                          href={resource.content}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/5 md:gap-2 md:rounded-xl md:px-4'
                        >
                          <LinkIcon size={16} />
                          Open
                          <ExternalLink size={14} className='hidden sm:inline' />
                        </a>
                      )}

                      {resource.type === 'file' && (
                        <button
                          type='button'
                          onClick={() => downloadFile(getFileViewUrl(resource.content), resource.title)}
                          className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 md:gap-2 md:rounded-xl md:px-4'
                        >
                          <Download size={16} />
                          <span className='hidden sm:inline'>Download</span>
                        </button>
                      )}

                      <button
                        type='button'
                        onClick={() => setShowCommentsFor(resource.id)}
                        className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/50 md:gap-2 md:rounded-xl md:px-4'
                      >
                        <MessageSquare size={16} />
                        <span className='hidden sm:inline'>Comments</span>
                        <span className='rounded-full bg-[var(--color-primary)]/12 px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]'>
                          {resource.comment_count ?? 0}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modals */}
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
    </div>
  );
}
