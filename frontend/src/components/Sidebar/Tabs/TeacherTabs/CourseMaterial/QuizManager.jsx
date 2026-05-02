import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, Edit2 } from 'lucide-react';
import {
	createQuiz,
	getClassQuizzes,
	updateQuiz,
	deleteQuiz,
	addQuestionToQuiz,
	updateQuestion,
	deleteQuestion,
} from '../../../api/quizApi';
import CommentSection from '../../CommentSection';

export default function QuizManager({ classId, user }) {
	const [quizzes, setQuizzes] = useState([]);
	const [expandedQuizId, setExpandedQuizId] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [editingQuizId, setEditingQuizId] = useState(null);
	const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [formData, setFormData] = useState({
		title: '',
		description: '',
		instructions: '',
		type: 'mixed',
		isPublished: false,
		allowReview: true,
		showAnswers: false,
		randomizeQuestions: false,
		shuffleAnswers: false,
		timeLimitMinutes: '',
		passPercentage: '',
		attemptsAllowed: '',
		copyProtectionEnabled: true,
		pasteProtectionEnabled: true,
		disableRightClick: true,
	});

	const [questionFormData, setQuestionFormData] = useState({
		questionText: '',
		questionType: 'multiple-choice',
		points: '1',
		correctAnswer: '',
		options: [{ optionText: '', isCorrect: false }],
	});

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

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		});
	};

	const handleQuestionInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setQuestionFormData({
			...questionFormData,
			[name]: type === 'checkbox' ? checked : value,
		});
	};

	const handleOptionChange = (index, field, value) => {
		const newOptions = [...questionFormData.options];
		newOptions[index][field] = field === 'isCorrect' ? !newOptions[index].isCorrect : value;
		setQuestionFormData({
			...questionFormData,
			options: newOptions,
		});
	};

	const addOptionField = () => {
		setQuestionFormData({
			...questionFormData,
			options: [...questionFormData.options, { optionText: '', isCorrect: false }],
		});
	};

	const removeOptionField = (index) => {
		setQuestionFormData({
			...questionFormData,
			options: questionFormData.options.filter((_, i) => i !== index),
		});
	};

	const handleSubmitQuiz = async (e) => {
		e.preventDefault();
		try {
			setLoading(true);
			const payload = {
				...formData,
				timeLimitMinutes: formData.timeLimitMinutes ? parseInt(formData.timeLimitMinutes) : null,
				passPercentage: formData.passPercentage ? parseFloat(formData.passPercentage) : null,
				attemptsAllowed: formData.attemptsAllowed ? parseInt(formData.attemptsAllowed) : null,
			};

			if (editingQuizId) {
				await updateQuiz(classId, editingQuizId, payload);
				setEditingQuizId(null);
			} else {
				await createQuiz(classId, payload);
			}

			setFormData({
				title: '',
				description: '',
				instructions: '',
				type: 'mixed',
				isPublished: false,
				allowReview: true,
				showAnswers: false,
				randomizeQuestions: false,
				shuffleAnswers: false,
				timeLimitMinutes: '',
				passPercentage: '',
				attemptsAllowed: '',
				copyProtectionEnabled: true,
				pasteProtectionEnabled: true,
				disableRightClick: true,
			});
			setShowForm(false);
			await loadQuizzes();
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to save quiz');
		} finally {
			setLoading(false);
		}
	};

	const handleAddQuestion = async (e) => {
		e.preventDefault();
		if (!selectedQuizForQuestion) return;

		try {
			setLoading(true);
			const payload = {
				questionText: questionFormData.questionText,
				questionType: questionFormData.questionType,
				points: parseFloat(questionFormData.points) || 1,
				correctAnswer: questionFormData.correctAnswer || null,
				options:
					questionFormData.questionType === 'multiple-choice' ? questionFormData.options : undefined,
			};

			await addQuestionToQuiz(classId, selectedQuizForQuestion, payload);

			setQuestionFormData({
				questionText: '',
				questionType: 'multiple-choice',
				points: '1',
				correctAnswer: '',
				options: [{ optionText: '', isCorrect: false }],
			});
			setSelectedQuizForQuestion(null);
			await loadQuizzes();
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to add question');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteQuestion = async (quizId, questionId) => {
		if (!window.confirm('Delete this question?')) return;

		try {
			setLoading(true);
			await deleteQuestion(classId, quizId, questionId);
			await loadQuizzes();
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to delete question');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteQuiz = async (quizId) => {
		if (!window.confirm('Delete this quiz and all its questions?')) return;

		try {
			setLoading(true);
			await deleteQuiz(classId, quizId);
			await loadQuizzes();
			setError('');
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to delete quiz');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			{error && <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">{error}</div>}

			{!showForm && !selectedQuizForQuestion && (
				<button
					onClick={() => setShowForm(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					<Plus size={18} /> Create Quiz
				</button>
			)}

			{showForm && (
				<form onSubmit={handleSubmitQuiz} className="bg-white rounded border p-4 space-y-3">
					<h3 className="font-semibold">{editingQuizId ? 'Edit' : 'Create'} Quiz</h3>

					<input
						type="text"
						name="title"
						placeholder="Quiz Title"
						value={formData.title}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded"
						required
					/>

					<textarea
						name="description"
						placeholder="Description (optional)"
						value={formData.description}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded"
						rows="2"
					/>

					<textarea
						name="instructions"
						placeholder="Instructions for students (optional)"
						value={formData.instructions}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded"
						rows="2"
					/>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium mb-1">Quiz Type</label>
							<select
								name="type"
								value={formData.type}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded"
							>
								<option value="multiple-choice">Multiple Choice</option>
								<option value="short-answer">Short Answer</option>
								<option value="mixed">Mixed</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Attempts Allowed</label>
							<input
								type="number"
								name="attemptsAllowed"
								placeholder="Unlimited"
								value={formData.attemptsAllowed}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded"
								min="0"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
							<input
								type="number"
								name="timeLimitMinutes"
								placeholder="No limit"
								value={formData.timeLimitMinutes}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded"
								min="0"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Pass Percentage</label>
							<input
								type="number"
								name="passPercentage"
								placeholder="Not set"
								value={formData.passPercentage}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded"
								min="0"
								max="100"
								step="0.01"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="isPublished"
								checked={formData.isPublished}
								onChange={handleInputChange}
							/>
							Publish for students
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="allowReview"
								checked={formData.allowReview}
								onChange={handleInputChange}
							/>
							Allow review after submission
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="showAnswers"
								checked={formData.showAnswers}
								onChange={handleInputChange}
							/>
							Show correct answers
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="randomizeQuestions"
								checked={formData.randomizeQuestions}
								onChange={handleInputChange}
							/>
							Randomize questions order
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="shuffleAnswers"
								checked={formData.shuffleAnswers}
								onChange={handleInputChange}
							/>
							Shuffle answer options
						</label>
					</div>

					<div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
						<h4 className="font-semibold text-sm mb-2">Security Options</h4>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="copyProtectionEnabled"
								checked={formData.copyProtectionEnabled}
								onChange={handleInputChange}
							/>
							Prevent copying
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="pasteProtectionEnabled"
								checked={formData.pasteProtectionEnabled}
								onChange={handleInputChange}
							/>
							Prevent pasting
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="disableRightClick"
								checked={formData.disableRightClick}
								onChange={handleInputChange}
							/>
							Disable right-click
						</label>
					</div>

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{loading ? 'Saving...' : 'Save Quiz'}
						</button>
						<button
							type="button"
							onClick={() => {
								setShowForm(false);
								setEditingQuizId(null);
								setFormData({
									title: '',
									description: '',
									instructions: '',
									type: 'mixed',
									isPublished: false,
									allowReview: true,
									showAnswers: false,
									randomizeQuestions: false,
									shuffleAnswers: false,
									timeLimitMinutes: '',
									passPercentage: '',
									attemptsAllowed: '',
									copyProtectionEnabled: true,
									pasteProtectionEnabled: true,
									disableRightClick: true,
								});
							}}
							className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{selectedQuizForQuestion && (
				<form onSubmit={handleAddQuestion} className="bg-white rounded border p-4 space-y-3">
					<h3 className="font-semibold">Add Question</h3>

					<textarea
						name="questionText"
						placeholder="Question text"
						value={questionFormData.questionText}
						onChange={handleQuestionInputChange}
						className="w-full px-3 py-2 border rounded"
						rows="2"
						required
					/>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium mb-1">Question Type</label>
							<select
								name="questionType"
								value={questionFormData.questionType}
								onChange={handleQuestionInputChange}
								className="w-full px-3 py-2 border rounded"
							>
								<option value="multiple-choice">Multiple Choice</option>
								<option value="short-answer">Short Answer</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Points</label>
							<input
								type="number"
								name="points"
								value={questionFormData.points}
								onChange={handleQuestionInputChange}
								className="w-full px-3 py-2 border rounded"
								min="0"
								step="0.01"
								required
							/>
						</div>
					</div>

					{questionFormData.questionType === 'multiple-choice' && (
						<div className="space-y-2">
							<h4 className="font-medium text-sm">Answer Options</h4>
							{questionFormData.options.map((option, idx) => (
								<div key={idx} className="flex gap-2">
									<input
										type="text"
										placeholder="Option text"
										value={option.optionText}
										onChange={(e) => handleOptionChange(idx, 'optionText', e.target.value)}
										className="flex-1 px-3 py-2 border rounded"
										required
									/>
									<label className="flex items-center gap-1">
										<input
											type="checkbox"
											checked={option.isCorrect}
											onChange={() => handleOptionChange(idx, 'isCorrect')}
										/>
										Correct
									</label>
									<button
										type="button"
										onClick={() => removeOptionField(idx)}
										className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
									>
										<Trash2 size={16} />
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={addOptionField}
								className="text-sm text-blue-600 hover:text-blue-700"
							>
								+ Add Option
							</button>
						</div>
					)}

					{questionFormData.questionType === 'short-answer' && (
						<input
							type="text"
							name="correctAnswer"
							placeholder="Correct answer"
							value={questionFormData.correctAnswer}
							onChange={handleQuestionInputChange}
							className="w-full px-3 py-2 border rounded"
						/>
					)}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{loading ? 'Adding...' : 'Add Question'}
						</button>
						<button
							type="button"
							onClick={() => {
								setSelectedQuizForQuestion(null);
								setQuestionFormData({
									questionText: '',
									questionType: 'multiple-choice',
									points: '1',
									correctAnswer: '',
									options: [{ optionText: '', isCorrect: false }],
								});
							}}
							className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			<div className="space-y-2">
				{quizzes.map((quiz) => (
					<div key={quiz.id} className="border rounded bg-white">
						<div
							className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
							onClick={() =>
								setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)
							}
						>
							<div className="flex-1">
								<h3 className="font-semibold">{quiz.title}</h3>
								<p className="text-sm text-gray-600">
									{quiz.total_submissions} submission(s) · {quiz.graded_submissions} graded
								</p>
								<div className="flex gap-2 mt-1">
									{quiz.is_published ? (
										<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
											Published
										</span>
									) : (
										<span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
											Draft
										</span>
									)}
									<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
										{quiz.type}
									</span>
								</div>
							</div>

							<div className="flex gap-2 mr-2">
								<button
									onClick={(e) => {
										e.stopPropagation();
										setEditingQuizId(quiz.id);
										setFormData({
											title: quiz.title,
											description: quiz.description || '',
											instructions: quiz.instructions || '',
											type: quiz.type,
											isPublished: quiz.is_published,
											allowReview: quiz.allow_review,
											showAnswers: quiz.show_answers,
											randomizeQuestions: quiz.randomize_questions,
											shuffleAnswers: quiz.shuffle_answers,
											timeLimitMinutes: quiz.time_limit_minutes || '',
											passPercentage: quiz.pass_percentage || '',
											attemptsAllowed: quiz.attempts_allowed || '',
											copyProtectionEnabled: quiz.copy_protection_enabled,
											pasteProtectionEnabled: quiz.paste_protection_enabled,
											disableRightClick: quiz.disable_right_click,
										});
										setShowForm(true);
									}}
									className="p-2 hover:bg-blue-100 rounded"
								>
									<Edit2 size={16} className="text-blue-600" />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteQuiz(quiz.id);
									}}
									className="p-2 hover:bg-red-100 rounded"
								>
									<Trash2 size={16} className="text-red-600" />
								</button>
							</div>

							{expandedQuizId === quiz.id ? <ChevronUp /> : <ChevronDown />}
						</div>

						{expandedQuizId === quiz.id && (
							<div className="border-t p-4 bg-gray-50 space-y-3">
								{quiz.description && <p className="text-sm text-gray-700">{quiz.description}</p>}

								{quiz.questions && quiz.questions.length > 0 && (
									<div>
										<h4 className="font-medium mb-2">Questions ({quiz.questions.length})</h4>
										<div className="space-y-2">
											{quiz.questions.map((q) => (
												<div key={q.id} className="bg-white p-3 rounded border text-sm">
													<div className="flex items-start justify-between gap-2">
														<div className="flex-1">
															<p className="font-medium">{q.question_text}</p>
															<p className="text-xs text-gray-600 mt-1">
																Type: {q.question_type} · Points: {q.points}
															</p>
														</div>
														<button
															onClick={() => handleDeleteQuestion(quiz.id, q.id)}
															className="p-1 hover:bg-red-100 rounded"
														>
															<Trash2 size={14} className="text-red-600" />
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								<button
									onClick={() => setSelectedQuizForQuestion(quiz.id)}
									className="w-full py-2 px-3 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-2"
								>
									<Plus size={16} /> Add Question
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			{quizzes.length === 0 && !showForm && !loading && (
				<div className="text-center py-8 text-gray-500">No quizzes yet. Create one to get started!</div>
			)}
		</div>
	);
}
