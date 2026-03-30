import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link as LinkIcon,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import {
  getClassResources,
  createResource,
  updateResource,
  deleteResource,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import CommentSection from '../../Shared/CommentSection';

const INITIAL_FORM_DATA = {
  title: '',
  type: 'file',
  content: '',
  description: '',
  tags: '',
  isPublished: false,
  expiresAt: '',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function isExpired(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function toTimestamp(value, fallback = 0) {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

export default function ResourceManager({
  classId,
  className,
  classes,
  onClassChange,
}) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [showCommentsFor, setShowCommentsFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const publishedCount = useMemo(
    () => resources.filter((resource) => resource.is_published).length,
    [resources],
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

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getClassResources(classId);
      setResources(res.data || []);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load resources.';
      setError(message);
      setToast({ isOpen: true, type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (classId) fetchResources();
  }, [classId, fetchResources]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const resetAddForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedFile(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setUploading(true);

    try {
      const payload = new FormData();
      payload.append('title', formData.title.trim());
      payload.append('type', formData.type);
      payload.append('description', formData.description.trim());
      payload.append('tags', formData.tags.trim());
      payload.append('isPublished', String(formData.isPublished));

      if (formData.expiresAt) {
        payload.append('expiresAt', formData.expiresAt);
      }

      if (formData.type === 'file') {
        if (!selectedFile) {
          throw new Error('Please choose a file before submitting.');
        }
        payload.append('file', selectedFile);
      } else {
        if (!formData.content.trim()) {
          throw new Error('Please provide a valid link before submitting.');
        }
        payload.append('content', formData.content.trim());
      }

      await createResource(classId, payload);
      setToast({ isOpen: true, type: 'success', message: 'Resource added successfully.' });
      setShowAddForm(false);
      resetAddForm();
      await fetchResources();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to create resource.';
      setError(message);
      setToast({ isOpen: true, type: 'error', message });
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (resource) => {
    try {
      await updateResource(classId, resource.id, {
        is_published: !resource.is_published,
      });

      setToast({
        isOpen: true,
        type: 'success',
        message: !resource.is_published ? 'Resource published.' : 'Resource moved to draft.',
      });
      await fetchResources();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update resource.';
      setError(message);
      setToast({ isOpen: true, type: 'error', message });
    }
  };

  const requestDelete = (resource) => {
    setResourceToDelete(resource);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteResource(classId, resourceToDelete.id);
      setToast({ isOpen: true, type: 'success', message: 'Resource deleted.' });
      setResourceToDelete(null);
      await fetchResources();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete resource.';
      setError(message);
      setToast({ isOpen: true, type: 'error', message });
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

      <header className='mb-5'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Course Material</h1>
        <p className='text-sm text-[var(--color-text-muted)]'>
          Manage class resources for {className || 'your class'}.
        </p>
      </header>

      <section className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <label
              htmlFor='teacher-resource-class-selector'
              className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'
            >
              Class
            </label>
            <div className='relative'>
              <select
                id='teacher-resource-class-selector'
                value={classId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  const selectedClass = classes.find((classItem) => classItem.id === selectedId);
                  if (selectedClass) onClassChange(selectedClass.id, selectedClass.class_name);
                }}
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
            <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Total Resources</p>
            <p className='text-lg font-semibold text-[var(--color-text-primary)]'>{resources.length}</p>
          </div>

          <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
            <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Published</p>
            <p className='text-lg font-semibold text-[var(--color-success)]'>{publishedCount}</p>
          </div>
        </div>

        <div className='mt-3 flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setShowAddForm((current) => !current)}
            aria-expanded={showAddForm}
            aria-controls='teacher-add-resource-form'
            className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-primary-hover)]'
          >
            {showAddForm ? 'Close Form' : 'Add Resource'}
          </button>
        </div>
      </section>

      <section className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <label htmlFor='teacher-resource-search' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
              Search
            </label>
            <input
              id='teacher-resource-search'
              type='text'
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search title, description, link, tags'
              className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
            />
          </div>

          <div>
            <label htmlFor='teacher-resource-tag-filter' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
              Tag
            </label>
            <select
              id='teacher-resource-tag-filter'
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
            <label htmlFor='teacher-resource-sort' className='mb-1 block text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>
              Sort
            </label>
            <select
              id='teacher-resource-sort'
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

      {error && (
        <div
          role='alert'
          className='mb-4 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]'
        >
          {error}
        </div>
      )}

      {showAddForm && (
        <section
          id='teacher-add-resource-form'
          className='mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
        >
          <h2 className='mb-3 text-lg font-semibold text-[var(--color-text-primary)]'>Add New Resource</h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='teacher-resource-title' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                Title
              </label>
              <input
                id='teacher-resource-title'
                type='text'
                name='title'
                value={formData.title}
                onChange={handleInputChange}
                required
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
              />
            </div>

            <fieldset>
              <legend className='mb-1 text-sm text-[var(--color-text-secondary)]'>Resource Type</legend>
              <div className='flex flex-wrap gap-4'>
                <label className='inline-flex items-center gap-2 text-sm text-[var(--color-text-primary)]'>
                  <input
                    type='radio'
                    name='type'
                    value='file'
                    checked={formData.type === 'file'}
                    onChange={handleInputChange}
                  />
                  Upload File
                </label>
                <label className='inline-flex items-center gap-2 text-sm text-[var(--color-text-primary)]'>
                  <input
                    type='radio'
                    name='type'
                    value='link'
                    checked={formData.type === 'link'}
                    onChange={handleInputChange}
                  />
                  External Link
                </label>
              </div>
            </fieldset>

            {formData.type === 'file' ? (
              <div>
                <label htmlFor='teacher-resource-file' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                  File
                </label>
                <input
                  id='teacher-resource-file'
                  type='file'
                  onChange={handleFileChange}
                  required
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-white hover:file:bg-[var(--color-primary-hover)]'
                />
              </div>
            ) : (
              <div>
                <label htmlFor='teacher-resource-link' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                  URL
                </label>
                <input
                  id='teacher-resource-link'
                  type='url'
                  name='content'
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  placeholder='https://...'
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                />
              </div>
            )}

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div>
                <label htmlFor='teacher-resource-description' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                  Description
                </label>
                <textarea
                  id='teacher-resource-description'
                  name='description'
                  rows='3'
                  value={formData.description}
                  onChange={handleInputChange}
                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                />
              </div>

              <div className='space-y-3'>
                <div>
                  <label htmlFor='teacher-resource-tags' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                    Tags
                  </label>
                  <input
                    id='teacher-resource-tags'
                    type='text'
                    name='tags'
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder='lecture, homework, reading'
                    className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                  />
                </div>

                <div>
                  <label htmlFor='teacher-resource-expires' className='mb-1 block text-sm text-[var(--color-text-secondary)]'>
                    Expires At (optional)
                  </label>
                  <input
                    id='teacher-resource-expires'
                    type='datetime-local'
                    name='expiresAt'
                    value={formData.expiresAt}
                    onChange={handleInputChange}
                    className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                  />
                </div>
              </div>
            </div>

            <label className='inline-flex items-center gap-2 text-sm text-[var(--color-text-primary)]'>
              <input
                type='checkbox'
                name='isPublished'
                checked={formData.isPublished}
                onChange={handleInputChange}
              />
              Publish immediately (students can access it)
            </label>

            <div className='flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setShowAddForm(false);
                  resetAddForm();
                }}
                className='rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={uploading}
                className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--color-primary-hover)]'
              >
                {uploading ? 'Uploading...' : 'Save Resource'}
              </button>
            </div>
          </form>
        </section>
      )}

      {resources.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <p className='text-[var(--color-text-muted)]'>No resources yet for this class.</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
          <p className='text-[var(--color-text-muted)]'>No resources match your current filters.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {filteredResources.map((resource) => {
            const expired = isExpired(resource.expires_at);
            return (
              <article
                key={resource.id}
                className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <h3 className='truncate text-base font-semibold text-[var(--color-text-primary)]'>
                      {resource.title}
                    </h3>

                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      <span className='rounded-full bg-[var(--color-primary)]/12 px-2 py-1 text-xs text-[var(--color-primary)]'>
                        {resource.type === 'file' ? 'File' : 'Link'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          resource.is_published
                            ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
                            : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {resource.is_published ? 'Published' : 'Draft'}
                      </span>
                      {expired && (
                        <span className='rounded-full bg-[var(--color-danger)]/12 px-2 py-1 text-xs text-[var(--color-danger)]'>
                          Expired
                        </span>
                      )}
                    </div>

                    {resource.description && (
                      <p className='mt-2 text-sm text-[var(--color-text-secondary)]'>{resource.description}</p>
                    )}

                    {resource.tags?.length > 0 && (
                      <div className='mt-2 flex flex-wrap gap-1'>
                        {resource.tags.map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className='rounded-md bg-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
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
                      {resource.expires_at && ` • Expires: ${formatDate(resource.expires_at)}`}
                    </p>
                  </div>

                  <div className='flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={() => handleTogglePublish(resource)}
                      aria-label={resource.is_published ? 'Move resource to draft' : 'Publish resource'}
                      title={resource.is_published ? 'Move to draft' : 'Publish'}
                      className='rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
                    >
                      {resource.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <button
                      type='button'
                      onClick={() => requestDelete(resource)}
                      aria-label='Delete resource'
                      title='Delete resource'
                      className='rounded-lg border border-[var(--color-danger)]/40 p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCommentsFor && (
        <CommentSection
          classId={classId}
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

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setResourceToDelete(null);
        }}
        onConfirm={performDelete}
        title='Delete Resource'
        message='Are you sure you want to delete this resource? This action cannot be undone.'
        confirmText='Delete'
        cancelText='Cancel'
        type='danger'
      />
    </div>
  );
}
