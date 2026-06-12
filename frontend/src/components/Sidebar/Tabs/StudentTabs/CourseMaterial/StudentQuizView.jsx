import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock } from 'lucide-react';
import {
	getClassQuizzes,
	getQuizDetails,
	startQuiz,
	submitAnswer,
	submitQuiz,
	getMySubmissions,
	getSubmissionDetails,
} from '../../../../../api/quizApi';

export default function StudentQuizView({ classId, user }) {
	const [quizzes, setQuizzes] = useState([]);
	const [selectedQuiz, setSelectedQuiz] = useState(null);
	const [quizDetails, setQuizDetails] = useState(null);
	const [submission, setSubmission] = useState(null);
	const [answers, setAnswers] = useState({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [startTime, setStartTime] = useState(null);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const timerRef = useRef(null);

	const loadQuizzes = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getClassQuizzes(classId);
			setQuizzes(data);
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to load quizzes');
		} finally {
			setLoading(false);
		}
	}, [classId]);

	useEffect(() => {
		loadQuizzes();
	}, [loadQuizzes]);

	useEffect(() => {
		if (startTime) {
			timerRef.current = setInterval(() => {
				setElapsedSeconds((prev) => prev + 1);
			}, 1000);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [startTime]);

	const handleSelectQuiz = async (quiz) => {
		try {
			setLoading(true);
			const details = await getQuizDetails(classId, quiz.id);
			setQuizDetails(details);
			setSelectedQuiz(quiz);
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to load quiz details');
		} finally {
			setLoading(false);
		}
	};

	const handleStartQuiz = async () => {
		try {
			setLoading(true);
			const sub = await startQuiz(classId, selectedQuiz.id);
			setSubmission(sub);
			setStartTime(new Date());
			setElapsedSeconds(0);
			setAnswers({});
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to start quiz');
		} finally {
			setLoading(false);
		}
	};

	const handleSelectOption = async (questionId, optionId) => {
		const newAnswers = { ...answers, [questionId]: { optionId } };
		setAnswers(newAnswers);

		try {
			await submitAnswer(classId, selectedQuiz.id, submission.id, {
				questionId,
				selectedOptionId: optionId,
				textAnswer: null,
			});
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to save answer');
		}
	};

	const handleTextAnswer = async (questionId, textValue) => {
		const newAnswers = { ...answers, [questionId]: { textAnswer: textValue } };
		setAnswers(newAnswers);

		try {
			await submitAnswer(classId, selectedQuiz.id, submission.id, {
				questionId,
				selectedOptionId: null,
				textAnswer: textValue,
			});
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to save answer');
		}
	};

	const handleSubmitQuiz = async () => {
		if (!window.confirm('Submit quiz? You cannot change your answers after submission.')) return;

		try {
			setLoading(true);
			await submitQuiz(classId, selectedQuiz.id, submission.id, {
				timeSpentSeconds: elapsedSeconds,
			});

			if (timerRef.current) clearInterval(timerRef.current);

			const submissionDetails = await getSubmissionDetails(classId, selectedQuiz.id, submission.id);
			setSubmission(submissionDetails);
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to submit quiz');
		} finally {
			setLoading(false);
		}
	};

	const formatTime = (seconds) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		}
		return `${minutes}m ${secs}s`;
	};

	const formatTimerDisplay = (seconds) => {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${String(secs).padStart(2, '0')}`;
	};

	const publishedQuizzes = quizzes.filter((q) => q.is_published);

	if (!selectedQuiz) {
		return (
			<div className="space-y-4">
				{error && (
					<div style={{
						backgroundColor: 'var(--color-danger-soft)',
						color: 'var(--color-danger)',
						padding: '12px',
						borderRadius: '6px',
						border: '1px solid var(--color-danger)',
					}}>{error}</div>
				)}

				<h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Available Quizzes</h2>

				{loading && <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Loading quizzes...</div>}

				{publishedQuizzes.length === 0 && !loading && (
					<div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No quizzes available yet.</div>
				)}

				<div className="space-y-2">
					{publishedQuizzes.map((quiz) => (
						<div 
							key={quiz.id} 
							className="rounded border p-4 transition cursor-pointer"
							style={{
								backgroundColor: 'var(--color-surface)',
								borderColor: 'var(--color-border)',
								boxShadow: 'var(--shadow-sm)',
							}}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1">
									<h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quiz.title}</h3>
									{quiz.description && (
										<p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{quiz.description}</p>
									)}
									<div className="flex gap-2 mt-2 flex-wrap">
										{quiz.time_limit_minutes && (
											<span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{
												backgroundColor: 'var(--color-info-soft)',
												color: 'var(--color-info)',
											}}>
												<Clock size={12} /> {quiz.time_limit_minutes} min
											</span>
										)}
										{quiz.attempts_allowed && (
											<span className="text-xs px-2 py-0.5 rounded" style={{
												backgroundColor: 'var(--color-secondary-soft)',
												color: 'var(--color-secondary)',
											}}>
												{quiz.attempts_allowed} attempt(s)
											</span>
										)}
									</div>
								</div>
								<button
									onClick={() => handleSelectQuiz(quiz)}
									className="px-4 py-2 text-white rounded hover:opacity-90 transition whitespace-nowrap"
									style={{
										backgroundColor: 'var(--color-primary)',
									}}
								>
									Take Quiz
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!submission) {
		return (
			<div className="space-y-4">
				{error && (
					<div style={{
						backgroundColor: 'var(--color-danger-soft)',
						color: 'var(--color-danger)',
						padding: '12px',
						borderRadius: '6px',
						border: '1px solid var(--color-danger)',
					}}>{error}</div>
				)}

				<div className="rounded border p-6" style={{
					backgroundColor: 'var(--color-surface)',
					borderColor: 'var(--color-border)',
					boxShadow: 'var(--shadow-md)',
				}}>
					<button
						onClick={() => setSelectedQuiz(null)}
						className="mb-4 hover:opacity-70 transition"
						style={{ color: 'var(--color-primary)' }}
					>
						← Back to Quizzes
					</button>

					<h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>{quizDetails?.title}</h2>

					{quizDetails?.description && (
						<p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>{quizDetails.description}</p>
					)}

					{quizDetails?.instructions && (
						<div className="border rounded p-4 mb-4" style={{
							backgroundColor: 'var(--color-info-soft)',
							borderColor: 'var(--color-info)',
						}}>
							<h3 className="font-semibold mb-2" style={{ color: 'var(--color-info)' }}>Instructions</h3>
							<p className="text-sm" style={{ color: 'var(--color-info)' }}>{quizDetails.instructions}</p>
						</div>
					)}

					<div className="border rounded p-4 mb-6" style={{
						backgroundColor: 'var(--color-surface-raised)',
						borderColor: 'var(--color-border)',
					}}>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span style={{ color: 'var(--color-text-secondary)' }}>Questions:</span>
								<p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quizDetails?.questions?.length || 0}</p>
							</div>
							{quizDetails?.time_limit_minutes && (
								<div>
									<span style={{ color: 'var(--color-text-secondary)' }}>Time Limit:</span>
									<p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quizDetails.time_limit_minutes} minutes</p>
								</div>
							)}
							{quizDetails?.pass_percentage && (
								<div>
									<span style={{ color: 'var(--color-text-secondary)' }}>Pass Score:</span>
									<p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quizDetails.pass_percentage}%</p>
								</div>
							)}
							{quizDetails?.attempts_allowed && (
								<div>
									<span style={{ color: 'var(--color-text-secondary)' }}>Attempts Allowed:</span>
									<p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quizDetails.attempts_allowed}</p>
								</div>
							)}
						</div>
					</div>

					<button
						onClick={handleStartQuiz}
						disabled={loading}
						className="w-full px-6 py-3 text-white rounded hover:opacity-90 disabled:opacity-50 font-semibold transition"
						style={{
							backgroundColor: 'var(--color-success)',
						}}
					>
						{loading ? 'Starting...' : 'Start Quiz'}
					</button>
				</div>
			</div>
		);
	}

	if (submission.submitted_at) {
		const passed = submission.percentage >= (quizDetails?.pass_percentage || 0);
		return (
			<div className="space-y-4">
				<div className="rounded border p-6 text-center" style={{
					backgroundColor: 'var(--color-surface)',
					borderColor: 'var(--color-border)',
					boxShadow: 'var(--shadow-md)',
				}}>
					<div className="text-5xl font-bold mb-3" style={{ color: passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
						{submission.percentage}%
					</div>
					<h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Quiz Submitted</h2>
					<p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
						Score: {submission.score} / {submission.max_score} points
					</p>
					<p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Time spent: {formatTime(submission.time_spent_seconds || 0)}</p>

					{passed ? (
						<div className="border rounded p-3 mb-6" style={{
							backgroundColor: 'var(--color-success-soft)',
							borderColor: 'var(--color-success)',
							color: 'var(--color-success)',
						}}>
							✓ Congratulations! You passed the quiz.
						</div>
					) : quizDetails?.pass_percentage ? (
						<div className="border rounded p-3 mb-6" style={{
							backgroundColor: 'var(--color-danger-soft)',
							borderColor: 'var(--color-danger)',
							color: 'var(--color-danger)',
						}}>
							You did not reach the passing score of {quizDetails.pass_percentage}%.
						</div>
					) : null}

					<button
						onClick={() => {
							setSelectedQuiz(null);
							setSubmission(null);
							setQuizDetails(null);
							setAnswers({});
							loadQuizzes();
						}}
						className="px-6 py-2 text-white rounded hover:opacity-90 transition"
						style={{ backgroundColor: 'var(--color-primary)' }}
					>
						Back to Quizzes
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className="space-y-4"
			onContextMenu={(e) => {
				if (quizDetails?.disable_right_click) {
					e.preventDefault();
				}
			}}
			onCopy={(e) => {
				if (quizDetails?.copy_protection_enabled) {
					e.preventDefault();
				}
			}}
			onPaste={(e) => {
				if (quizDetails?.paste_protection_enabled) {
					e.preventDefault();
				}
			}}
		>
			{error && <div style={{
				backgroundColor: 'var(--color-danger-soft)',
				color: 'var(--color-danger)',
				padding: '12px',
				borderRadius: '6px',
				border: '1px solid var(--color-danger)',
			}}>{error}</div>}

			<div className="sticky top-0 border-b p-4 flex items-center justify-between" style={{
				backgroundColor: 'var(--color-surface)',
				borderColor: 'var(--color-border)',
				boxShadow: 'var(--shadow-md)',
				zIndex: 10,
			}}>
				<div>
					<h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quizDetails?.title}</h2>
					<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
						Question {Object.keys(answers).length} of {quizDetails?.questions?.length || 0}
					</p>
				</div>

				{quizDetails?.time_limit_minutes && (
					<div className="flex items-center gap-2 px-4 py-2 rounded" style={{
						backgroundColor: 'var(--color-warning-soft)',
						color: 'var(--color-warning)',
					}}>
						<Clock size={18} />
						<span className="font-mono text-lg">{formatTimerDisplay(elapsedSeconds)}</span>
					</div>
				)}
			</div>

			<div className="space-y-6 pb-20">
				{quizDetails?.questions?.map((question, idx) => (
					<div key={question.id} className="rounded border p-6" style={{
						backgroundColor: 'var(--color-surface)',
						borderColor: 'var(--color-border)',
						boxShadow: 'var(--shadow-sm)',
					}}>
						<div className="flex items-start gap-2 mb-4">
							<span className="inline-block px-3 py-1 rounded font-medium" style={{
								backgroundColor: 'var(--color-primary-soft)',
								color: 'var(--color-primary)',
							}}>
								Q{idx + 1}
							</span>
							<h3
								className="flex-1 font-semibold text-lg"
								style={{
									color: 'var(--color-text-primary)',
									userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
								}}
							>
								{question.question_text}
							</h3>
							<span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{question.points} pt(s)</span>
						</div>

						{question.question_type === 'multiple-choice' && (
							<div className="space-y-2">
								{question.options?.map((option) => (
									<label
										key={option.id}
										className="flex items-center gap-3 p-3 border rounded cursor-pointer transition hover:opacity-80"
										style={{
											backgroundColor: answers[question.id]?.optionId === option.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
											borderColor: answers[question.id]?.optionId === option.id ? 'var(--color-primary)' : 'var(--color-border)',
											userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
										}}
									>
										<input
											type="radio"
											name={`question-${question.id}`}
											checked={answers[question.id]?.optionId === option.id}
											onChange={() => handleSelectOption(question.id, option.id)}
										/>
										<span style={{ color: 'var(--color-text-primary)' }}>{option.option_text}</span>
									</label>
								))}
							</div>
						)}

						{question.question_type === 'short-answer' && (
							<textarea
								value={answers[question.id]?.textAnswer || ''}
								onChange={(e) => handleTextAnswer(question.id, e.target.value)}
								placeholder="Enter your answer here..."
								className="w-full px-3 py-2 border rounded focus:outline-none"
								rows="3"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
									userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
								}}
							/>
						)}
					</div>
				))}
			</div>

			<div className="fixed bottom-0 left-0 right-0 border-t p-4 flex gap-3 justify-end" style={{
				backgroundColor: 'var(--color-surface)',
				borderColor: 'var(--color-border)',
				boxShadow: 'var(--shadow-lg)',
			}}>
				<button
					onClick={() => {
						setSelectedQuiz(null);
						setSubmission(null);
						setQuizDetails(null);
						if (timerRef.current) clearInterval(timerRef.current);
					}}
					className="px-6 py-2 rounded hover:opacity-90 transition"
					style={{
						backgroundColor: 'var(--color-border)',
						color: 'var(--color-text-primary)',
					}}
				>
					Exit
				</button>
				<button
					onClick={handleSubmitQuiz}
					disabled={loading}
					className="px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50 font-semibold transition"
					style={{
						backgroundColor: 'var(--color-success)',
					}}
				>
					{loading ? 'Submitting...' : 'Submit Quiz'}
				</button>
			</div>
		</div>
	);
}
