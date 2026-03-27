import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getStudentEnrolledShedule, getClassResources } from '../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../Icons/Icon';
import { FileText, ExternalLink, Link as LinkIcon } from 'lucide-react';

export default function StudentCourseMaterial() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

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
      const res = await getClassResources(classId); // only returns published resources
      setResources(res.data);
    } catch (err) {
      setError('Failed to load resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    fetchResources(cls.class_id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon />
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedClass(null)}
          className="mb-6 text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          ← Back to Classes
        </button>

        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          {selectedClass.class_name} – Course Materials
        </h1>

        {loadingResources ? (
          <div className="flex justify-center py-8"><SpinnerIcon /></div>
        ) : resources.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No materials available for this class yet.
          </p>
        ) : (
          <div className="space-y-4">
            {resources.map((res) => (
              <div key={res.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{res.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        res.type === 'file'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {res.type === 'file' ? 'File' : 'Link'}
                      </span>
                      {res.tags && res.tags.length > 0 && (
                        <div className="flex gap-1">
                          {res.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs bg-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {res.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2">{res.description}</p>
                    )}
                    <div className="mt-2">
                      {res.type === 'file' ? (
                        <a
                          href={res.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          <FileText size={14} />
                          View File
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <a
                          href={res.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          <LinkIcon size={14} />
                          Visit Link
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-2">
                  Added: {new Date(res.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
        Course Material
      </h1>
      {error && <AlertBox message={error} />}
      {classes.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">
          You are not enrolled in any classes yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.class_id}
              onClick={() => handleSelectClass(cls)}
              className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {cls.class_name}
              </h3>
              {cls.schedule_days && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  📅 {cls.schedule_days} • ⏰ {cls.start_time} – {cls.end_time}
                </p>
              )}
              <div className="mt-4">
                <span className="text-sm text-[var(--color-primary)]">View Materials →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}