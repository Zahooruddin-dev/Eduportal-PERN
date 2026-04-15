import { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getStudentEnrolledShedule, getClassAssignments, getMyAssignmentSubmission } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import StudentAssignmentView from './StudentAssignmentView';

export default function StudentAssignments() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignmentStats, setAssignmentStats] = useState({});

  // Helper function to calculate assignment statistics for a class
  const calculateAssignmentStats = async (classId) => {
    try {
      const res = await getClassAssignments(classId);
      const assignments = Array.isArray(res.data) ? res.data : [];

      let totalCount = assignments.length;
      let pendingCount = 0;
      let overdueCount = 0;
      let submittedCount = 0;

      const now = new Date();

      // Fetch submission status for each assignment
      for (const assignment of assignments) {
        try {
          const submissionRes = await getMyAssignmentSubmission(classId, assignment.id);
          const submission = submissionRes.data;

          if (submission?.submission_content) {
            submittedCount++;
          } else {
            // Check if overdue
            const due = assignment.due_date ? new Date(assignment.due_date) : null;
            if (due && due < now) {
              overdueCount++;
            } else {
              pendingCount++;
            }
          }
        } catch (err) {
          // If no submission found, treat as pending
          const due = assignment.due_date ? new Date(assignment.due_date) : null;
          if (due && due < now) {
            overdueCount++;
          } else {
            pendingCount++;
          }
        }
      }

      return {
        total: totalCount,
        pending: pendingCount,
        overdue: overdueCount,
        submitted: submittedCount,
      };
    } catch (err) {
      return {
        total: 0,
        pending: 0,
        overdue: 0,
        submitted: 0,
      };
    }
  };

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
        const classList = Array.isArray(res.data) ? res.data : [];
        setClasses(classList);

        // Fetch assignment stats for each class
        const statsMap = {};
        for (const cls of classList) {
          const classId = cls.id ?? cls.class_id;
          const stats = await calculateAssignmentStats(classId);
          statsMap[classId] = stats;
        }
        setAssignmentStats(statsMap);
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
          {classes.map((cls) => {
            const classId = cls.id ?? cls.class_id;
            const stats = assignmentStats[classId] || { total: 0, pending: 0, overdue: 0, submitted: 0 };
            
            return (
              <div
                key={classId}
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
                  {/* Assignment Stats Badges */}
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {/* Total Assignments */}
                    {stats.total > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
                        <BookOpen size={12} />
                        {stats.total}
                      </div>
                    )}
                    
                    {/* Pending/New Assignments */}
                    {stats.pending > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 whitespace-nowrap">
                        <Clock size={12} />
                        {stats.pending}
                      </div>
                    )}
                    
                    {/* Overdue Assignments */}
                    {stats.overdue > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 whitespace-nowrap">
                        <AlertCircle size={12} />
                        {stats.overdue}
                      </div>
                    )}
                    
                    {/* Submitted Assignments */}
                    {stats.submitted > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 whitespace-nowrap">
                        <CheckCircle size={12} />
                        {stats.submitted}
                      </div>
                    )}
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
                
                {/* Assignment Summary */}
                {stats.total > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {stats.submitted}/{stats.total} submitted
                      {stats.overdue > 0 && <span className="text-red-600 dark:text-red-400 font-medium"> • {stats.overdue} overdue</span>}
                    </p>
                  </div>
                )}
                
                <div className="mt-4">
                  <span className="text-sm font-medium text-[var(--color-primary)] inline-flex items-center gap-1 group-hover:underline">
                    View Assignments <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}