import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getStudentEnrolledShedule } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import StudentAssignmentView from './StudentAssignmentView';

export default function StudentAssignments() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setClasses([]);
      return;
    }

    const fetchEnrolled = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getStudentEnrolledShedule(user.id);
        setClasses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setClasses([]);
        setError(err.response?.data?.error || 'Failed to load enrolled classes.');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrolled();
  }, [user?.id]);

  const ClassCardSkeleton = () => (
    <div className="animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
      <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mb-3" />
      <div className="h-3 bg-[var(--color-border)] rounded w-1/2 mb-2" />
      <div className="h-3 bg-[var(--color-border)] rounded w-2/3 mb-3" />
      <div className="h-4 bg-[var(--color-border)] rounded w-1/3" />
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">Assignments</h1>
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
      <StudentAssignmentView
        cls={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">Assignments</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Select a class to view assignments, submit your work, and check your grades.
      </p>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
          <BookOpen size={48} className="text-[var(--color-text-muted)] mb-4 opacity-30" />
          <p className="text-[var(--color-text-secondary)] font-medium">You're not enrolled in any classes yet.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Ask your teacher for an enrollment code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id ?? cls.class_id}
              onClick={() => setSelectedClass(cls)}
              className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--color-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => e.key === 'Enter' && setSelectedClass(cls)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <BookOpen size={18} />
                </div>
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] leading-snug">
                {cls.class_name}
              </h3>
              {cls.subject && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{cls.subject}</p>
              )}
              {cls.teacher_name && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">by {cls.teacher_name}</p>
              )}
              <div className="mt-4">
                <span className="text-sm font-medium text-[var(--color-primary)] inline-flex items-center gap-1 group-hover:underline">
                  View Assignments <span aria-hidden="true">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}