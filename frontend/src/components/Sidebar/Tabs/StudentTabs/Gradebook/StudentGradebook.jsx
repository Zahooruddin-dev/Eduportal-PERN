import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/useAuth';
import {
  getStudentEnrolledShedule,
  getMyGradebookGrades,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'exam', label: 'Exams' },
  { value: 'quiz', label: 'Quizzes' },
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatDate(dateValue) {
  if (!dateValue) return '-';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export default function StudentGradebook() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const response = await getStudentEnrolledShedule(user.id);
        if (mounted) setClasses(response.data || []);
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.error || 'Failed to load classes.',
          });
        }
      } finally {
        if (mounted) setLoadingClasses(false);
      }
    };

    loadClasses();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const loadGrades = async () => {
      setLoadingGrades(true);
      try {
        const params = {};
        if (selectedClass !== 'all') params.classId = selectedClass;
        if (selectedType !== 'all') params.type = selectedType;
        const response = await getMyGradebookGrades(params);
        if (mounted) setGrades(response.data || []);
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.error || 'Failed to load grades.',
          });
        }
      } finally {
        if (mounted) setLoadingGrades(false);
      }
    };

    loadGrades();

    return () => {
      mounted = false;
    };
  }, [user?.id, selectedClass, selectedType]);

  const classNameById = useMemo(() => {
    const map = new Map();
    for (const cls of classes) {
      map.set(String(cls.id), cls.class_name || cls.subject || String(cls.id));
    }
    return map;
  }, [classes]);

  const summary = useMemo(() => {
    const total = grades.length;
    const percentages = grades
      .map((grade) => {
        const score = toNumber(grade.grade);
        const max = toNumber(grade.max_grade);
        if (score === null || max === null || max <= 0) return null;
        return (score / max) * 100;
      })
      .filter((value) => value !== null);

    const average =
      percentages.length > 0
        ? (percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(1)
        : null;

    const highest =
      percentages.length > 0 ? Math.max(...percentages).toFixed(1) : null;

    const lowest =
      percentages.length > 0 ? Math.min(...percentages).toFixed(1) : null;

    return { total, average, highest, lowest };
  }, [grades]);

  return (
    <div className='p-4 sm:p-6 w-full'>
      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
      />

      <div className='flex flex-col gap-2 mb-6'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>My Gradebook</h1>
        <p className='text-sm text-[var(--color-text-muted)]'>
          View released grades for all your classes or narrow by class and grade type.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4'>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Released Grades</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>{summary.total}</p>
        </div>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Average</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>
            {summary.average === null ? '-' : `${summary.average}%`}
          </p>
        </div>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Range</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>
            {summary.lowest === null || summary.highest === null
              ? '-'
              : `${summary.lowest}% - ${summary.highest}%`}
          </p>
        </div>
      </div>

      <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          <div className='flex flex-col gap-1'>
            <label className='text-sm text-[var(--color-text-muted)]'>Class</label>
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              disabled={loadingClasses}
              className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            >
              <option value='all'>All Enrolled Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name || cls.subject || cls.id}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-[var(--color-text-muted)]'>Grade Type</label>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className='overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl'>
        <table className='w-full min-w-[820px] text-left'>
          <thead>
            <tr className='text-[var(--color-text-muted)] text-sm border-b border-[var(--color-border)]'>
              <th className='px-3 py-3 font-medium'>Class</th>
              <th className='px-3 py-3 font-medium'>Type</th>
              <th className='px-3 py-3 font-medium'>Score</th>
              <th className='px-3 py-3 font-medium'>Percent</th>
              <th className='px-3 py-3 font-medium'>Feedback</th>
              <th className='px-3 py-3 font-medium'>Published</th>
            </tr>
          </thead>
          <tbody>
            {loadingGrades && (
              <tr>
                <td className='px-3 py-4 text-sm text-[var(--color-text-muted)]' colSpan={6}>
                  <span className='inline-flex items-center gap-2'>
                    <SpinnerIcon />
                    Loading grades...
                  </span>
                </td>
              </tr>
            )}

            {!loadingGrades && grades.length === 0 && (
              <tr>
                <td className='px-3 py-6 text-sm text-[var(--color-text-muted)]' colSpan={6}>
                  No released grades match the selected filters.
                </td>
              </tr>
            )}

            {!loadingGrades &&
              grades.map((grade) => {
                const score = toNumber(grade.grade);
                const max = toNumber(grade.max_grade);
                const percentage =
                  score !== null && max !== null && max > 0
                    ? `${((score / max) * 100).toFixed(1)}%`
                    : '-';

                return (
                  <tr key={grade.id} className='border-t border-[var(--color-border)] align-top'>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)]'>
                      {grade.class_name || classNameById.get(String(grade.class_id)) || grade.class_id}
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)] capitalize'>
                      {grade.grade_type || '-'}
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)]'>
                      {score === null || max === null ? '-' : `${score} / ${max}`}
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)]'>{percentage}</td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-secondary)] max-w-[340px]'>
                      <p className='line-clamp-2'>{grade.feedback || '-'}</p>
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                      {formatDate(grade.created_at)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
