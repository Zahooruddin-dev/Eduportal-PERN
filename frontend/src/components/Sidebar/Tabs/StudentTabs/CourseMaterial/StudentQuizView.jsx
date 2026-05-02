import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
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
					<div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">{error}</div>
				)}

				<h2 className="text-lg font-semibold">Available Quizzes</h2>

				{loading && <div className="text-center py-8 text-gray-500">Loading quizzes...</div>}

				{publishedQuizzes.length === 0 && !loading && (
					<div className="text-center py-8 text-gray-500">No quizzes available yet.</div>
				)}

				<div className="space-y-2">
					{publishedQuizzes.map((quiz) => (
						<div key={quiz.id} className="border rounded p-4 bg-white hover:shadow-md transition">
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1">
									<h3 className="font-semibold">{quiz.title}</h3>
									{quiz.description && (
										<p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
									)}
									<div className="flex gap-2 mt-2">
										{quiz.time_limit_minutes && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
												<Clock size={12} /> {quiz.time_limit_minutes} min
											</span>
										)}
										{quiz.attempts_allowed && (
											<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
												{quiz.attempts_allowed} attempt(s)
											</span>
										)}
									</div>
								</div>
								<button
									onClick={() => handleSelectQuiz(quiz)}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
					<div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">{error}</div>
				)}

				<div className="bg-white rounded border p-6">
					<button
						onClick={() => setSelectedQuiz(null)}
						className="text-blue-600 hover:text-blue-700 mb-4"
					>
						← Back to Quizzes
					</button>

					<h2 className="text-2xl font-semibold mb-3">{quizDetails?.title}</h2>

					{quizDetails?.description && (
						<p className="text-gray-700 mb-4">{quizDetails.description}</p>
					)}

					{quizDetails?.instructions && (
						<div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
							<h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
							<p className="text-blue-900 text-sm">{quizDetails.instructions}</p>
						</div>
					)}

					<div className="bg-gray-50 border rounded p-4 mb-6">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-600">Questions:</span>
								<p className="font-semibold">{quizDetails?.questions?.length || 0}</p>
							</div>
							{quizDetails?.time_limit_minutes && (
								<div>
									<span className="text-gray-600">Time Limit:</span>
									<p className="font-semibold">{quizDetails.time_limit_minutes} minutes</p>
								</div>
							)}
							{quizDetails?.pass_percentage && (
								<div>
									<span className="text-gray-600">Pass Score:</span>
									<p className="font-semibold">{quizDetails.pass_percentage}%</p>
								</div>
							)}
							{quizDetails?.attempts_allowed && (
								<div>
									<span className="text-gray-600">Attempts Allowed:</span>
									<p className="font-semibold">{quizDetails.attempts_allowed}</p>
								</div>
							)}
						</div>
					</div>

					<button
						onClick={handleStartQuiz}
						disabled={loading}
						className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
					>
						{loading ? 'Starting...' : 'Start Quiz'}
					</button>
				</div>
			</div>
		);
	}

	if (submission.submitted_at) {
		return (
			<div className="space-y-4">
				<div className="bg-white rounded border p-6 text-center">
					<div className="text-5xl font-bold text-green-600 mb-3">{submission.percentage}%</div>
					<h2 className="text-2xl font-semibold mb-2">Quiz Submitted</h2>
					<p className="text-gray-700 mb-4">
						Score: {submission.score} / {submission.max_score} points
					</p>
					<p className="text-gray-600 mb-6">Time spent: {formatTime(submission.time_spent_seconds || 0)}</p>

					{submission.percentage >= (quizDetails?.pass_percentage || 0) ? (
						<div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-6">
							✓ Congratulations! You passed the quiz.
						</div>
					) : quizDetails?.pass_percentage ? (
						<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-6">
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
						className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
			{error && <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">{error}</div>}

			<div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">{quizDetails?.title}</h2>
					<p className="text-sm text-gray-600">
						Question {Object.keys(answers).length} of {quizDetails?.questions?.length || 0}
					</p>
				</div>

				{quizDetails?.time_limit_minutes && (
					<div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded">
						<Clock size={18} />
						<span className="font-mono text-lg">{formatTimerDisplay(elapsedSeconds)}</span>
					</div>
				)}
			</div>

			<div className="space-y-6 pb-20">
				{quizDetails?.questions?.map((question, idx) => (
					<div key={question.id} className="bg-white rounded border p-6">
						<div className="flex items-start gap-2 mb-4">
							<span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">
								Q{idx + 1}
							</span>
							<h3
								className="flex-1 font-semibold text-lg"
								style={{
									userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
								}}
							>
								{question.question_text}
							</h3>
							<span className="text-sm text-gray-600">{question.points} pt(s)</span>
						</div>

						{question.question_type === 'multiple-choice' && (
							<div className="space-y-2">
								{question.options?.map((option) => (
									<label
										key={option.id}
										className="flex items-center gap-3 p-3 border rounded hover:bg-blue-50 cursor-pointer"
										style={{
											userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
										}}
									>
										<input
											type="radio"
											name={`question-${question.id}`}
											checked={answers[question.id]?.optionId === option.id}
											onChange={() => handleSelectOption(question.id, option.id)}
										/>
										<span>{option.option_text}</span>
									</label>
								))}
							</div>
						)}

						{question.question_type === 'short-answer' && (
							<textarea
								value={answers[question.id]?.textAnswer || ''}
								onChange={(e) => handleTextAnswer(question.id, e.target.value)}
								placeholder="Enter your answer here..."
								className="w-full px-3 py-2 border rounded"
								rows="3"
								style={{
									userSelect: quizDetails?.copy_protection_enabled ? 'none' : 'auto',
								}}
							/>
						)}
					</div>
				))}
			</div>

			<div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 justify-end">
				<button
					onClick={() => {
						setSelectedQuiz(null);
						setSubmission(null);
						setQuizDetails(null);
						if (timerRef.current) clearInterval(timerRef.current);
					}}
					className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
				>
					Exit
				</button>
				<button
					onClick={handleSubmitQuiz}
					disabled={loading}
					className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
				>
					{loading ? 'Submitting...' : 'Submit Quiz'}
				</button>
			</div>
		</div>
	);
}
