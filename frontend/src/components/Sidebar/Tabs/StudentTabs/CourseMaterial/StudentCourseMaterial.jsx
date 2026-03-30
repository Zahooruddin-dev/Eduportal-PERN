import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  getStudentEnrolledShedule,
  getClassResources,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { FileText, ExternalLink, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import CommentSection from '../../Shared/CommentSection';
import { getFileViewUrl } from '../../../../../utils/fileUtils';

export default function StudentCourseMaterial() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [showCommentsFor, setShowCommentsFor] = useState(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await getStudentEnrolledShedule(user.id);
      setClasses(res.data);
    } catch (err) {
      setError('Failed to load enrolled classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchResources = async (classId) => {
    setLoadingResources(true);
    try {
      const res = await getClassResources(classId);
      setResources(res.data);
    } catch (err) {
      setError('Failed to load resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    fetchResources(cls.id);
  };

  const ClassCardSkeleton = () => (
    <div className="animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm">
      <div className="h-5 bg-[var(--color-border)] rounded w-3/4 mb-2" />
      <div className="h-3 bg-[var(--color-border)] rounded w-1/2 mb-1" />
      <div className="h-3 bg-[var(--color-border)] rounded w-2/3 mb-3" />
      <div className="h-4 bg-[var(--color-border)] rounded w-1/3 mt-2" />
    </div>
  );

  const ResourceSkeleton = () => (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-4 bg-[var(--color-border)] rounded w-2/3 mb-3" />
      <div className="flex gap-2 mb-2">
        <div className="h-5 bg-[var(--color-border)] rounded w-12" />
        <div className="h-5 bg-[var(--color-border)] rounded w-12" />
      </div>
      <div className="h-3 bg-[var(--color-border)] rounded w-full mb-2" />
      <div className="h-3 bg-[var(--color-border)] rounded w-5/6 mb-2" />
      <div className="h-3 bg-[var(--color-border)] rounded w-1/3" />
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          Course Material
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div className="p-4 sm:p-6">
        <button
          onClick={() => setSelectedClass(null)}
          className="mb-6 inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-lg px-2 py-1"
        >
          <ArrowLeft size={18} />
          <span>Back to Classes</span>
        </button>

        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          {selectedClass.class_name} – Course Materials
        </h1>

        {loadingResources ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ResourceSkeleton key={i} />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
            <p className="text-[var(--color-text-muted)]">
              No materials available for this class yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">
                      {res.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          res.type === 'file'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                        }`}
                      >
                        {res.type === 'file' ? 'File' : 'Link'}
                      </span>
                      {res.tags && res.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {res.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {res.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-3">
                        {res.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      {res.type === 'file' ? (
                        <button
                          onClick={() =>
                            setViewingFile({
                              url: getFileViewUrl(res.content),
                              title: res.title,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-md px-2 py-1"
                        >
                          <FileText size={14} />
                          View File
                        </button>
                      ) : (
                        <a
                          href={res.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-md px-2 py-1"
                        >
                          <LinkIcon size={14} />
                          Visit Link
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button
                        onClick={() => setShowCommentsFor(res.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-md px-2 py-1"
                      >
                        💬 Comments ({res.comment_count ?? 0})
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-3 pt-2 border-t border-[var(--color-border)]">
                  Added: {new Date(res.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showCommentsFor && (
          <CommentSection
            classId={selectedClass?.id}
            resourceId={showCommentsFor}
            onClose={() => setShowCommentsFor(null)}
          />
        )}
        {viewingFile && (
          <FileViewerModal
            fileUrl={viewingFile.url}
            title={viewingFile.title}
            isOpen={!!viewingFile}
            onClose={() => setViewingFile(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
        Course Material
      </h1>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-muted)]">
            You are not enrolled in any classes yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => handleSelectClass(cls)}
              className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--color-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => e.key === 'Enter' && handleSelectClass(cls)}
            >
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {cls.class_name}
              </h3>
              {cls.schedule_days && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                  📅 {cls.schedule_days} • ⏰ {cls.start_time} – {cls.end_time}
                </p>
              )}
              <div className="mt-4">
                <span className="text-sm font-medium text-[var(--color-primary)] inline-flex items-center gap-1">
                  View Materials
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}