import { useEffect, useMemo, useState } from 'react';
import {
  getGradebookGrades,
  postGradebookGrades,
  uploadGradebookCsv,
  getMyClasses,
  getClassEnrolledRooster,
  releaseGradebookGrades,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'exam', label: 'Exams' },
  { value: 'quiz', label: 'Quizzes' },
];

const RELEASE_OPTIONS = [
  { value: 'all', label: 'All Visibility' },
  { value: 'true', label: 'Shared' },
  { value: 'false', label: 'Private' },
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

export default function Gradebook() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', released: 'all' });
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [file, setFile] = useState(null);
  const [newGrade, setNewGrade] = useState({
    student_id: '',
    grade: '',
    max_grade: '100',
    grade_type: 'exam',
    feedback: '',
  });
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  useEffect(() => {
    let mounted = true;

    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const response = await getMyClasses();
        const classList = response.data || [];
        if (mounted) {
          setClasses(classList);
          if (classList.length) {
            setSelectedClass((current) => current || classList[0].id);
          }
        }
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
  }, []);

  useEffect(() => {
    if (!selectedClass) return;

    let mounted = true;

    const loadClassData = async () => {
      setLoading(true);
      try {
        const [rosterResponse, gradesResponse] = await Promise.all([
          getClassEnrolledRooster(selectedClass),
          getGradebookGrades(selectedClass, {
            type: filters.type,
            released: filters.released,
          }),
        ]);

        if (mounted) {
          setStudents(rosterResponse.data || []);
          setGrades(gradesResponse.data || []);
        }
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.error || 'Failed to load gradebook data.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadClassData();

    return () => {
      mounted = false;
    };
  }, [selectedClass, filters.type, filters.released]);

  const stats = useMemo(() => {
    const values = grades
      .map((gradeEntry) => toNumber(gradeEntry.grade))
      .filter((value) => value !== null);

    const maxValues = grades
      .map((gradeEntry) => toNumber(gradeEntry.max_grade))
      .filter((value) => value !== null && value > 0);

    if (!values.length || !maxValues.length) {
      return { highest: null, lowest: null, average: null, sharedCount: 0 };
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const sharedCount = grades.filter((gradeEntry) => gradeEntry.released).length;

    return {
      highest: Math.max(...values),
      lowest: Math.min(...values),
      average,
      sharedCount,
    };
  }, [grades]);

  const selectedClassName = useMemo(() => {
    const found = classes.find((cls) => cls.id === selectedClass);
    return found?.class_name || selectedClass;
  }, [classes, selectedClass]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
  };

  const resetGradeForm = () => {
    setNewGrade({
      student_id: '',
      grade: '',
      max_grade: '100',
      grade_type: newGrade.grade_type,
      feedback: '',
    });
  };

  const refreshGradesOnly = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await getGradebookGrades(selectedClass, {
        type: filters.type,
        released: filters.released,
      });
      setGrades(response.data || []);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to refresh grades.',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async () => {
    if (!file || !selectedClass) return;
    setUploading(true);
    try {
      const text = await file.text();
      await uploadGradebookCsv({ class_id: selectedClass, csv: text });
      setToast({ isOpen: true, type: 'success', message: 'CSV grades imported successfully.' });
      setFile(null);
      await refreshGradesOnly();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'CSV upload failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const addManualGrade = async () => {
    if (!selectedClass) return;
    const gradeValue = toNumber(newGrade.grade);
    const maxGradeValue = toNumber(newGrade.max_grade);

    if (!newGrade.student_id) {
      setToast({ isOpen: true, type: 'warning', message: 'Please select a student.' });
      return;
    }

    if (gradeValue === null || gradeValue < 0) {
      setToast({ isOpen: true, type: 'warning', message: 'Please enter a valid grade.' });
      return;
    }

    if (maxGradeValue === null || maxGradeValue <= 0) {
      setToast({ isOpen: true, type: 'warning', message: 'Please enter a valid max grade.' });
      return;
    }

    setSaving(true);
    try {
      await postGradebookGrades({
        class_id: selectedClass,
        grades: [
          {
            student_id: newGrade.student_id,
            grade: gradeValue,
            max_grade: maxGradeValue,
            feedback: newGrade.feedback || '',
            grade_type: newGrade.grade_type,
          },
        ],
      });
      setToast({ isOpen: true, type: 'success', message: 'Grade added successfully.' });
      resetGradeForm();
      await refreshGradesOnly();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to add grade.',
      });
    } finally {
      setSaving(false);
    }
  };

  const shareClassGrades = async (released) => {
    if (!selectedClass) return;
    setReleasing(true);
    try {
      const response = await releaseGradebookGrades({
        class_id: selectedClass,
        released,
        grade_type: filters.type !== 'all' ? filters.type : undefined,
      });
      setToast({
        isOpen: true,
        type: 'success',
        message: `${response.data.updated || 0} grades updated.`,
      });
      await refreshGradesOnly();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to update grade visibility.',
      });
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className='p-4 sm:p-6 w-full'>
      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
      />

      <div className='flex flex-col gap-2 mb-6'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Teacher Gradebook</h1>
        <p className='text-sm text-[var(--color-text-muted)]'>
          Add exam, quiz, or assignment grades, import CSV records, and publish results for students.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4'>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Class</p>
          <p className='text-lg font-semibold text-[var(--color-text-primary)] mt-1 truncate'>
            {selectedClass ? selectedClassName : '-'}
          </p>
        </div>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Highest</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>
            {stats.highest === null ? '-' : stats.highest}
          </p>
        </div>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Lowest</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>
            {stats.lowest === null ? '-' : stats.lowest}
          </p>
        </div>
        <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4'>
          <p className='text-xs text-[var(--color-text-muted)] uppercase tracking-wide'>Shared</p>
          <p className='text-2xl font-semibold text-[var(--color-text-primary)] mt-1'>
            {stats.sharedCount}
          </p>
        </div>
      </div>

      <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='flex flex-col gap-1'>
            <label className='text-sm text-[var(--color-text-muted)]'>Class</label>
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              disabled={loadingClasses}
              className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            >
              {classes.length === 0 && <option value=''>No class found</option>}
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name || cls.subject || cls.id}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-[var(--color-text-muted)]'>Grade Type Filter</label>
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({ ...current, type: event.target.value }))
              }
              className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-[var(--color-text-muted)]'>Visibility Filter</label>
            <select
              value={filters.released}
              onChange={(event) =>
                setFilters((current) => ({ ...current, released: event.target.value }))
              }
              className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            >
              {RELEASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='mt-4 flex flex-col sm:flex-row sm:items-center gap-2'>
          <input
            type='file'
            accept='.csv,text/csv'
            onChange={handleFileChange}
            className='block w-full text-sm text-[var(--color-text-secondary)]'
          />
          <button
            onClick={uploadCsv}
            disabled={!selectedClass || !file || uploading}
            className='px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {uploading ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={() => shareClassGrades(true)}
            disabled={!selectedClass || releasing}
            className='px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {releasing ? 'Updating...' : 'Share Grades'}
          </button>
          <button
            onClick={() => shareClassGrades(false)}
            disabled={!selectedClass || releasing}
            className='px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Hide Grades
          </button>
        </div>
      </div>

      <div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-4'>
        <h2 className='text-lg font-semibold text-[var(--color-text-primary)] mb-3'>Add Grade</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2'>
          <select
            value={newGrade.student_id}
            onChange={(event) =>
              setNewGrade((current) => ({ ...current, student_id: event.target.value }))
            }
            className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
          >
            <option value=''>Select student</option>
            {students.map((student) => (
              <option key={student.student_id} value={student.student_id}>
                {student.username} ({student.student_id})
              </option>
            ))}
          </select>

          <select
            value={newGrade.grade_type}
            onChange={(event) =>
              setNewGrade((current) => ({ ...current, grade_type: event.target.value }))
            }
            className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
          >
            <option value='exam'>Exam</option>
            <option value='quiz'>Quiz</option>
            <option value='assignment'>Assignment</option>
          </select>

          <input
            placeholder='Grade'
            value={newGrade.grade}
            onChange={(event) =>
              setNewGrade((current) => ({ ...current, grade: event.target.value }))
            }
            className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
          />

          <input
            placeholder='Max grade'
            value={newGrade.max_grade}
            onChange={(event) =>
              setNewGrade((current) => ({ ...current, max_grade: event.target.value }))
            }
            className='px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
          />

          <button
            onClick={addManualGrade}
            disabled={!selectedClass || saving}
            className='px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {saving ? 'Saving...' : 'Add Grade'}
          </button>
        </div>

        <textarea
          placeholder='Feedback (optional)'
          value={newGrade.feedback}
          onChange={(event) =>
            setNewGrade((current) => ({ ...current, feedback: event.target.value }))
          }
          rows={2}
          className='mt-2 w-full px-3 py-2 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
        />

        <p className='mt-2 text-xs text-[var(--color-text-muted)]'>
          Average score for current filter: {stats.average === null ? '-' : stats.average.toFixed(2)}
        </p>
      </div>

      <div className='overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl'>
        <table className='w-full min-w-[980px] text-left'>
          <thead>
            <tr className='text-[var(--color-text-muted)] text-sm border-b border-[var(--color-border)]'>
              <th className='px-3 py-3 font-medium'>Student</th>
              <th className='px-3 py-3 font-medium'>Score</th>
              <th className='px-3 py-3 font-medium'>Type</th>
              <th className='px-3 py-3 font-medium'>Feedback</th>
              <th className='px-3 py-3 font-medium'>Shared</th>
              <th className='px-3 py-3 font-medium'>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className='px-3 py-4 text-sm text-[var(--color-text-muted)]' colSpan={6}>
                  <span className='inline-flex items-center gap-2'>
                    <SpinnerIcon />
                    Loading gradebook...
                  </span>
                </td>
              </tr>
            )}

            {!loading && grades.length === 0 && (
              <tr>
                <td className='px-3 py-4 text-sm text-[var(--color-text-muted)]' colSpan={6}>
                  No grades found for the selected filters.
                </td>
              </tr>
            )}

            {!loading &&
              grades.map((gradeEntry) => {
                const score = toNumber(gradeEntry.grade);
                const max = toNumber(gradeEntry.max_grade);
                return (
                  <tr key={gradeEntry.id} className='border-t border-[var(--color-border)] align-top'>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)]'>
                      <div className='font-medium'>{gradeEntry.student_name || gradeEntry.student_id}</div>
                      <div className='text-xs text-[var(--color-text-muted)]'>{gradeEntry.student_id}</div>
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)]'>
                      {score === null || max === null ? '-' : `${score} / ${max}`}
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-primary)] capitalize'>
                      {gradeEntry.grade_type || '-'}
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-secondary)] max-w-[340px]'>
                      <p className='line-clamp-2'>{gradeEntry.feedback || '-'}</p>
                    </td>
                    <td className='px-3 py-3 text-sm'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gradeEntry.released
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {gradeEntry.released ? 'Shared' : 'Private'}
                      </span>
                    </td>
                    <td className='px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                      {formatDate(gradeEntry.created_at)}
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
