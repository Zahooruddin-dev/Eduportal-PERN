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
} from '../../../../../api/quizApi';

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
			{error && (
				<div style={{
					backgroundColor: 'var(--color-danger-soft)',
					color: 'var(--color-danger)',
					padding: '12px',
					borderRadius: '6px',
					border: '1px solid var(--color-danger)',
				}}>{error}</div>
			)}

			{!showForm && !selectedQuizForQuestion && (
				<button
					onClick={() => setShowForm(true)}
					className="flex items-center gap-2 px-4 py-2 text-white rounded hover:opacity-90 transition"
					style={{ backgroundColor: 'var(--color-primary)' }}
				>
					<Plus size={18} /> Create Quiz
				</button>
			)}

			{showForm && (
				<form onSubmit={handleSubmitQuiz} className="rounded border p-4 space-y-3" style={{
					backgroundColor: 'var(--color-surface)',
					borderColor: 'var(--color-border)',
					boxShadow: 'var(--shadow-md)',
				}}>
					<h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
						{editingQuizId ? 'Edit' : 'Create'} Quiz
					</h3>

					<input
						type="text"
						name="title"
						placeholder="Quiz Title"
						value={formData.title}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded focus:outline-none"
						style={{
							backgroundColor: 'var(--color-input-bg)',
							color: 'var(--color-text-primary)',
							borderColor: 'var(--color-border)',
						}}
						required
					/>

					<textarea
						name="description"
						placeholder="Description (optional)"
						value={formData.description}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded focus:outline-none"
						style={{
							backgroundColor: 'var(--color-input-bg)',
							color: 'var(--color-text-primary)',
							borderColor: 'var(--color-border)',
						}}
						rows="2"
					/>

					<textarea
						name="instructions"
						placeholder="Instructions for students (optional)"
						value={formData.instructions}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border rounded focus:outline-none"
						style={{
							backgroundColor: 'var(--color-input-bg)',
							color: 'var(--color-text-primary)',
							borderColor: 'var(--color-border)',
						}}
						rows="2"
					/>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Quiz Type</label>
							<select
								name="type"
								value={formData.type}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
							>
								<option value="multiple-choice">Multiple Choice</option>
								<option value="short-answer">Short Answer</option>
								<option value="mixed">Mixed</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Attempts Allowed</label>
							<input
								type="number"
								name="attemptsAllowed"
								placeholder="Unlimited"
								value={formData.attemptsAllowed}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
								min="0"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Time Limit (minutes)</label>
							<input
								type="number"
								name="timeLimitMinutes"
								placeholder="No limit"
								value={formData.timeLimitMinutes}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
								min="0"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Pass Percentage</label>
							<input
								type="number"
								name="passPercentage"
								placeholder="Not set"
								value={formData.passPercentage}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
								min="0"
								max="100"
								step="0.01"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="isPublished"
								checked={formData.isPublished}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Publish for students
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="allowReview"
								checked={formData.allowReview}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Allow review after submission
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="showAnswers"
								checked={formData.showAnswers}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Show correct answers
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="randomizeQuestions"
								checked={formData.randomizeQuestions}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Randomize questions order
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="shuffleAnswers"
								checked={formData.shuffleAnswers}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Shuffle answer options
						</label>
					</div>

					<div className="border rounded p-3" style={{
						backgroundColor: 'var(--color-warning-soft)',
						borderColor: 'var(--color-warning)',
					}}>
						<h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-warning)' }}>Security Options</h4>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="copyProtectionEnabled"
								checked={formData.copyProtectionEnabled}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Prevent copying
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="pasteProtectionEnabled"
								checked={formData.pasteProtectionEnabled}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Prevent pasting
						</label>
						<label className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
							<input
								type="checkbox"
								name="disableRightClick"
								checked={formData.disableRightClick}
								onChange={handleInputChange}
								style={{ accentColor: 'var(--color-primary)' }}
							/>
							Disable right-click
						</label>
					</div>

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 text-white rounded hover:opacity-90 disabled:opacity-50 transition"
							style={{ backgroundColor: 'var(--color-primary)' }}
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
							className="px-4 py-2 rounded hover:opacity-90 transition"
							style={{
								backgroundColor: 'var(--color-border)',
								color: 'var(--color-text-primary)',
							}}
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{selectedQuizForQuestion && (
				<form onSubmit={handleAddQuestion} className="rounded border p-4 space-y-3" style={{
					backgroundColor: 'var(--color-surface)',
					borderColor: 'var(--color-border)',
					boxShadow: 'var(--shadow-md)',
				}}>
					<h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Question</h3>

					<textarea
						name="questionText"
						placeholder="Question text"
						value={questionFormData.questionText}
						onChange={handleQuestionInputChange}
						className="w-full px-3 py-2 border rounded focus:outline-none"
						style={{
							backgroundColor: 'var(--color-input-bg)',
							color: 'var(--color-text-primary)',
							borderColor: 'var(--color-border)',
						}}
						rows="2"
						required
					/>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Question Type</label>
							<select
								name="questionType"
								value={questionFormData.questionType}
								onChange={handleQuestionInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
							>
								<option value="multiple-choice">Multiple Choice</option>
								<option value="short-answer">Short Answer</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Points</label>
							<input
								type="number"
								name="points"
								value={questionFormData.points}
								onChange={handleQuestionInputChange}
								className="w-full px-3 py-2 border rounded focus:outline-none"
								style={{
									backgroundColor: 'var(--color-input-bg)',
									color: 'var(--color-text-primary)',
									borderColor: 'var(--color-border)',
								}}
								min="0"
								step="0.01"
								required
							/>
						</div>
					</div>

					{questionFormData.questionType === 'multiple-choice' && (
						<div className="space-y-2">
							<h4 className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>Answer Options</h4>
							{questionFormData.options.map((option, idx) => (
								<div key={idx} className="flex gap-2">
									<input
										type="text"
										placeholder="Option text"
										value={option.optionText}
										onChange={(e) => handleOptionChange(idx, 'optionText', e.target.value)}
										className="flex-1 px-3 py-2 border rounded focus:outline-none"
										style={{
											backgroundColor: 'var(--color-input-bg)',
											color: 'var(--color-text-primary)',
											borderColor: 'var(--color-border)',
										}}
										required
									/>
									<label className="flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
										<input
											type="checkbox"
											checked={option.isCorrect}
											onChange={() => handleOptionChange(idx, 'isCorrect')}
											style={{ accentColor: 'var(--color-primary)' }}
										/>
										Correct
									</label>
									<button
										type="button"
										onClick={() => removeOptionField(idx)}
										className="px-2 py-1 rounded hover:opacity-70 transition"
										style={{ color: 'var(--color-danger)' }}
									>
										<Trash2 size={16} />
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={addOptionField}
								className="text-sm hover:opacity-70 transition"
								style={{ color: 'var(--color-primary)' }}
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
							className="w-full px-3 py-2 border rounded focus:outline-none"
							style={{
								backgroundColor: 'var(--color-input-bg)',
								color: 'var(--color-text-primary)',
								borderColor: 'var(--color-border)',
							}}
						/>
					)}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 text-white rounded hover:opacity-90 disabled:opacity-50 transition"
							style={{ backgroundColor: 'var(--color-primary)' }}
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
							className="px-4 py-2 rounded hover:opacity-90 transition"
							style={{
								backgroundColor: 'var(--color-border)',
								color: 'var(--color-text-primary)',
							}}
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			<div className="space-y-2">
				{quizzes.map((quiz) => (
					<div key={quiz.id} className="border rounded" style={{
						backgroundColor: 'var(--color-surface)',
						borderColor: 'var(--color-border)',
						boxShadow: 'var(--shadow-sm)',
					}}>
						<div
							className="p-4 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
							onClick={() =>
								setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)
							}
						>
							<div className="flex-1">
								<h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quiz.title}</h3>
								<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
									{quiz.total_submissions} submission(s) · {quiz.graded_submissions} graded
								</p>
								<div className="flex gap-2 mt-1 flex-wrap">
									{quiz.is_published ? (
										<span className="text-xs px-2 py-0.5 rounded" style={{
											backgroundColor: 'var(--color-success-soft)',
											color: 'var(--color-success)',
										}}>
											Published
										</span>
									) : (
										<span className="text-xs px-2 py-0.5 rounded" style={{
											backgroundColor: 'var(--color-border)',
											color: 'var(--color-text-secondary)',
										}}>
											Draft
										</span>
									)}
									<span className="text-xs px-2 py-0.5 rounded" style={{
										backgroundColor: 'var(--color-info-soft)',
										color: 'var(--color-info)',
									}}>
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
									className="p-2 rounded hover:opacity-70 transition"
									style={{
										backgroundColor: 'var(--color-info-soft)',
										color: 'var(--color-info)',
									}}
								>
									<Edit2 size={16} />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteQuiz(quiz.id);
									}}
									className="p-2 rounded hover:opacity-70 transition"
									style={{
										backgroundColor: 'var(--color-danger-soft)',
										color: 'var(--color-danger)',
									}}
								>
									<Trash2 size={16} />
								</button>
							</div>

							<div style={{ color: 'var(--color-text-secondary)' }}>
								{expandedQuizId === quiz.id ? <ChevronUp /> : <ChevronDown />}
							</div>
						</div>

						{expandedQuizId === quiz.id && (
							<div className="border-t p-4 space-y-3" style={{
								backgroundColor: 'var(--color-surface-raised)',
								borderColor: 'var(--color-border)',
							}}>
								{quiz.description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{quiz.description}</p>}

								{quiz.questions && quiz.questions.length > 0 && (
									<div>
										<h4 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Questions ({quiz.questions.length})</h4>
										<div className="space-y-2">
											{quiz.questions.map((q) => (
												<div key={q.id} className="p-3 rounded border text-sm" style={{
													backgroundColor: 'var(--color-surface)',
													borderColor: 'var(--color-border)',
												}}>
													<div className="flex items-start justify-between gap-2">
														<div className="flex-1">
															<p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{q.question_text}</p>
															<p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
																Type: {q.question_type} · Points: {q.points}
															</p>
														</div>
														<button
															onClick={() => handleDeleteQuestion(quiz.id, q.id)}
															className="p-1 rounded hover:opacity-70 transition"
															style={{ color: 'var(--color-danger)' }}
														>
															<Trash2 size={14} />
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								<button
									onClick={() => setSelectedQuizForQuestion(quiz.id)}
									className="w-full py-2 px-3 rounded hover:opacity-90 transition text-sm font-medium flex items-center justify-center gap-2"
									style={{
										backgroundColor: 'var(--color-primary-soft)',
										color: 'var(--color-primary)',
									}}
								>
									<Plus size={16} /> Add Question
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			{quizzes.length === 0 && !showForm && !loading && (
				<div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No quizzes yet. Create one to get started!</div>
			)}
		</div>
	);
}
