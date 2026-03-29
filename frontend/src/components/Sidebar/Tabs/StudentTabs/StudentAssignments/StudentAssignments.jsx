import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getStudentEnrolledShedule } from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import StudentAssignmentView from './StudentAssignmentView';

export default function StudentAssignments() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const fetchEnrolled = async () => {
      setLoading(true);
      try {
        const res = await getStudentEnrolledShedule(user.id);
        setClasses(res.data);
      } catch {
        setError('Failed to load enrolled classes.');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrolled();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon />
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">
        Assignments
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Select a class to view assignments, submit your work, and check your grades.
      </p>

      {error && <AlertBox message={error} />}

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-[var(--color-text-muted)] mb-4 opacity-30" />
          <p className="text-[var(--color-text-secondary)] font-medium">You're not enrolled in any classes yet.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Ask your teacher for an enrollment code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/40 transition-all group"
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
                <span className="text-sm text-[var(--color-primary)] group-hover:underline">
                  View Assignments →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}