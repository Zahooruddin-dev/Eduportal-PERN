import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react';
import * as quizApi from '../../../../../api/quizApi';

export default function QuickGradePanel({ classId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await quizApi.getQuizzes(classId);
        setQuizzes(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedQuizId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
      }
    };

    if (classId) {
      fetchQuizzes();
    }
  }, [classId]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedQuizId) {
        setSubmissions([]);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await quizApi.getQuizSummary(classId, selectedQuizId);
        setSubmissions(res.data?.submissions || []);
      } catch (err) {
        setError('Failed to load submissions');
        console.error('Error fetching submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [classId, selectedQuizId]);

  const selectedQuiz = useMemo(() => {
    return quizzes.find(q => q.id === selectedQuizId);
  }, [quizzes, selectedQuizId]);

  const pendingSubmissions = useMemo(() => {
    return submissions.filter(s => !s.is_graded);
  }, [submissions]);

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      graded: submissions.filter(s => s.is_graded).length,
      pending: pendingSubmissions.length,
      avgScore: submissions.length > 0
        ? (submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length).toFixed(2)
        : 0,
    };
  }, [submissions, pendingSubmissions]);

  if (!classId) {
    return (
      <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
        <p className='text-[var(--color-text-muted)]'>Select a class to view submissions</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
        <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
          <AlertCircle size={40} className='text-[var(--color-primary)]' />
        </div>
        <p className='text-lg font-semibold text-[var(--color-text-primary)]'>No Quizzes</p>
        <p className='mt-2 text-[var(--color-text-muted)]'>No quizzes available for this class yet.</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Quiz Selector */}
      <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
        <label htmlFor='grade-quiz-selector' className='mb-2 block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]'>
          Select Quiz
        </label>
        <div className='relative'>
          <select
            id='grade-quiz-selector'
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
          >
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
        <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-blue-500/5 to-transparent p-4 text-center shadow-sm md:rounded-2xl md:p-5'>
          <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Total</p>
          <p className='mt-2 text-lg font-bold text-blue-600 md:text-2xl'>{stats.total}</p>
        </div>

        <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-green-500/5 to-transparent p-4 text-center shadow-sm md:rounded-2xl md:p-5'>
          <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Graded</p>
          <p className='mt-2 text-lg font-bold text-green-600 md:text-2xl'>{stats.graded}</p>
        </div>

        <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-orange-500/5 to-transparent p-4 text-center shadow-sm md:rounded-2xl md:p-5'>
          <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Pending</p>
          <p className='mt-2 text-lg font-bold text-orange-600 md:text-2xl'>{stats.pending}</p>
        </div>

        <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-purple-500/5 to-transparent p-4 text-center shadow-sm md:rounded-2xl md:p-5'>
          <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Avg Score</p>
          <p className='mt-2 text-lg font-bold text-purple-600 md:text-2xl'>{stats.avgScore}%</p>
        </div>
      </div>

      {error && (
        <div className='rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)] md:rounded-2xl md:p-5'>
          {error}
        </div>
      )}

      {/* Submissions List */}
      {loading ? (
        <div className='flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]'>
          <Loader size={32} className='animate-spin text-[var(--color-primary)]' />
        </div>
      ) : submissions.length === 0 ? (
        <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
          <p className='text-lg font-semibold text-[var(--color-text-primary)]'>No Submissions Yet</p>
          <p className='mt-2 text-[var(--color-text-muted)]'>Students will appear here once they submit the quiz.</p>
        </div>
      ) : (
        <div className='space-y-3 md:space-y-4'>
          <div className='flex items-center justify-between rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:rounded-2xl md:p-5'>
            <h3 className='font-bold text-[var(--color-text-primary)] md:text-lg'>
              Submissions: {submissions.length}
            </h3>
            {pendingSubmissions.length > 0 && (
              <span className='inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-600'>
                <Clock size={14} />
                {pendingSubmissions.length} pending
              </span>
            )}
          </div>

          {submissions.map((submission) => (
            <div
              key={submission.id}
              className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:border-[var(--color-primary)]/60 hover:shadow-lg md:rounded-2xl md:p-5'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1 min-w-0'>
                  <h4 className='font-bold text-[var(--color-text-primary)] md:text-base truncate'>
                    {submission.student_name || 'Student'}
                  </h4>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)] md:text-sm'>
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>

                <div className='flex items-center gap-2'>
                  {submission.is_graded ? (
                    <div className='flex flex-col items-end gap-1'>
                      <div className='inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1.5'>
                        <CheckCircle2 size={16} className='text-green-600' />
                        <span className='text-xs font-bold text-green-600'>{submission.percentage}%</span>
                      </div>
                      <span className='text-xs text-[var(--color-text-muted)]'>Graded</span>
                    </div>
                  ) : (
                    <div className='flex flex-col items-end gap-1'>
                      <span className='inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-600'>
                        Pending
                      </span>
                      <button
                        onClick={() => {
                          window.open(`#/quiz/${submission.quiz_id}/submission/${submission.id}`, '_blank');
                        }}
                        className='text-xs font-bold text-[var(--color-primary)] hover:underline'
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
