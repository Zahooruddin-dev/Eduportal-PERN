const db = require('../db/queryQuiz');
const dbClass = require('../db/queryClasses');
const dbEnroll = require('../db/queryEnrollment');

async function createQuiz(req, res) {
	const { classId } = req.params;
	const teacherId = req.user.id;
	const quizData = req.body;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const quiz = await db.createQuizQuery({
			classId,
			teacherId,
			...quizData,
		});

		res.status(201).json(quiz);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getQuizzes(req, res) {
	const { classId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });

		let teacherId = null;
		if (userRole === 'teacher') {
			if (targetClass.teacher_id !== userId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
			teacherId = userId;
		} else if (userRole === 'student') {
			const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, userId);
			if (!isEnrolled) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
		} else {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const filters = {
			search: req.query?.search,
		};

		const quizzes = await db.getQuizzesByClassQuery(classId, teacherId, filters);
		res.json(quizzes);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getQuizDetails(req, res) {
	const { classId, quizId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });

		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

		if (userRole === 'teacher') {
			if (targetClass.teacher_id !== userId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
		} else if (userRole === 'student') {
			const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, userId);
			if (!isEnrolled) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
			if (!quiz.is_published) {
				return res.status(403).json({ error: 'Quiz not yet available' });
			}
		} else {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const questions = await db.getQuestionsByQuizQuery(quizId);
		const questionsWithOptions = await Promise.all(
			questions.map(async (q) => {
				const options = await db.getOptionsByQuestionQuery(q.id);
				return {
					...q,
					options: userRole === 'teacher' ? options : options.map((o) => ({ ...o, is_correct: undefined })),
				};
			}),
		);

		res.json({
			...quiz,
			questions: questionsWithOptions,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function updateQuiz(req, res) {
	const { classId, quizId } = req.params;
	const teacherId = req.user.id;
	const updates = req.body;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

		const updated = await db.updateQuizQuery(quizId, teacherId, updates);
		if (!updated) return res.status(404).json({ error: 'Quiz not found or unauthorized' });

		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function deleteQuiz(req, res) {
	const { classId, quizId } = req.params;
	const teacherId = req.user.id;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const rowCount = await db.deleteQuizQuery(quizId, teacherId);
		if (rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function addQuestion(req, res) {
	const { classId, quizId } = req.params;
	const teacherId = req.user.id;
	const { questionText, questionType, points, correctAnswer, options } = req.body;

	try {
		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
		if (quiz.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const questions = await db.getQuestionsByQuizQuery(quizId);
		const maxOrder = Math.max(0, ...questions.map((q) => q.order_index || 0));

		const question = await db.createQuestionQuery({
			quizId,
			questionText,
			questionType,
			points,
			correctAnswer,
			orderIndex: maxOrder + 1,
		});

		if (questionType === 'multiple-choice' && Array.isArray(options)) {
			const optionsWithOrder = await Promise.all(
				options.map((opt, idx) =>
					db.createOptionQuery({
						questionId: question.id,
						optionText: opt.optionText,
						isCorrect: opt.isCorrect || false,
						orderIndex: idx,
					}),
				),
			);
			question.options = optionsWithOrder;
		}

		res.status(201).json(question);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function updateQuestion(req, res) {
	const { classId, quizId, questionId } = req.params;
	const teacherId = req.user.id;
	const { questionText, questionType, points, correctAnswer } = req.body;

	try {
		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
		if (quiz.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const question = await db.getQuestionByIdQuery(questionId);
		if (!question || question.quiz_id !== quizId) {
			return res.status(404).json({ error: 'Question not found' });
		}

		const updated = await db.updateQuestionQuery(questionId, {
			question_text: questionText,
			question_type: questionType,
			points,
			correct_answer: correctAnswer,
		});

		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function deleteQuestion(req, res) {
	const { classId, quizId, questionId } = req.params;
	const teacherId = req.user.id;

	try {
		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
		if (quiz.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const rowCount = await db.deleteQuestionQuery(questionId);
		if (rowCount === 0) return res.status(404).json({ error: 'Question not found' });

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function startQuiz(req, res) {
	const { classId, quizId } = req.params;
	const studentId = req.user.id;

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can take quizzes' });
	}

	try {
		const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, studentId);
		if (!isEnrolled) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
		if (!quiz.is_published) {
			return res.status(403).json({ error: 'Quiz not available' });
		}

		const attemptCount = await db.getStudentAttemptCountQuery(quizId, studentId);
		if (quiz.attempts_allowed && attemptCount >= quiz.attempts_allowed) {
			return res.status(403).json({ error: 'Maximum attempts reached' });
		}

		const submission = await db.createSubmissionQuery({
			quizId,
			studentId,
			attemptNumber: attemptCount + 1,
		});

		res.status(201).json(submission);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function submitAnswer(req, res) {
	const { classId, quizId, submissionId } = req.params;
	const studentId = req.user.id;
	const { questionId, selectedOptionId, textAnswer } = req.body;

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can submit answers' });
	}

	try {
		const submission = await db.getSubmissionByIdQuery(submissionId);
		if (!submission) return res.status(404).json({ error: 'Submission not found' });
		if (submission.student_id !== studentId || submission.quiz_id !== quizId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}
		if (submission.submitted_at) {
			return res.status(400).json({ error: 'Quiz already submitted' });
		}

		const question = await db.getQuestionByIdQuery(questionId);
		if (!question) return res.status(404).json({ error: 'Question not found' });

		const answer = await db.recordAnswerQuery({
			submissionId,
			questionId,
			selectedOptionId,
			textAnswer,
			isCorrect: null,
			pointsEarned: null,
		});

		res.json(answer);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function submitQuiz(req, res) {
	const { classId, quizId, submissionId } = req.params;
	const studentId = req.user.id;
	const { timeSpentSeconds } = req.body;

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can submit quizzes' });
	}

	try {
		const submission = await db.getSubmissionByIdQuery(submissionId);
		if (!submission) return res.status(404).json({ error: 'Submission not found' });
		if (submission.student_id !== studentId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}
		if (submission.submitted_at) {
			return res.status(400).json({ error: 'Quiz already submitted' });
		}

		const questions = await db.getQuestionsByQuizQuery(quizId);
		const answers = await db.getAnswersBySubmissionQuery(submissionId);

		let score = 0;
		const maxScore = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

		for (const answer of answers) {
			const question = questions.find((q) => q.id === answer.question_id);
			if (!question) continue;

			let isCorrect = false;
			let pointsEarned = 0;

			if (question.question_type === 'multiple-choice' && answer.selected_option_id) {
				const selectedOption = await db.getOptionsByQuestionQuery(question.id);
				const correct = selectedOption.find((o) => o.id === answer.selected_option_id);
				isCorrect = correct?.is_correct || false;

				if (isCorrect) {
					pointsEarned = Number(question.points) || 1;
					score += pointsEarned;
				}
			} else if (question.question_type === 'short-answer' && answer.text_answer) {
				isCorrect = String(answer.text_answer).toLowerCase() === String(question.correct_answer).toLowerCase();
				if (isCorrect) {
					pointsEarned = Number(question.points) || 1;
					score += pointsEarned;
				}
			}

			await db.recordAnswerQuery({
				submissionId,
				questionId: answer.question_id,
				selectedOptionId: answer.selected_option_id,
				textAnswer: answer.text_answer,
				isCorrect,
				pointsEarned,
			});
		}

		const submitted = await db.submitQuizQuery(submissionId, score, maxScore, timeSpentSeconds || 0);

		res.json(submitted);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getMySubmissions(req, res) {
	const { classId, quizId } = req.params;
	const studentId = req.user.id;

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can view their submissions' });
	}

	try {
		const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, studentId);
		if (!isEnrolled) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const submissions = await db.getSubmissionsByStudentQuery(quizId, studentId);
		res.json(submissions);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getSubmissionDetails(req, res) {
	const { classId, quizId, submissionId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	try {
		const submission = await db.getSubmissionByIdQuery(submissionId);
		if (!submission || submission.quiz_id !== quizId) {
			return res.status(404).json({ error: 'Submission not found' });
		}

		if (userRole === 'student') {
			if (submission.student_id !== userId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
		} else if (userRole === 'teacher') {
			const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
			if (!quiz || quiz.teacher_id !== userId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
		} else {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const answers = await db.getAnswersBySubmissionQuery(submissionId);

		res.json({
			...submission,
			answers,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getQuizSummary(req, res) {
	const { classId, quizId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	try {
		if (userRole !== 'teacher') {
			return res.status(403).json({ error: 'Only teachers can view summaries' });
		}

		const quiz = await db.getQuizByIdInClassQuery(quizId, classId);
		if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
		if (quiz.teacher_id !== userId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const summary = await db.getQuizSubmissionsSummaryQuery(quizId, classId);

		res.json({
			quizId,
			classId,
			summary,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

module.exports = {
	createQuiz,
	getQuizzes,
	getQuizDetails,
	updateQuiz,
	deleteQuiz,
	addQuestion,
	updateQuestion,
	deleteQuestion,
	startQuiz,
	submitAnswer,
	submitQuiz,
	getMySubmissions,
	getSubmissionDetails,
	getQuizSummary,
};
