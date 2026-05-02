const pool = require('./Pool');

async function createQuizQuery(quizData) {
	const {
		classId,
		teacherId,
		title,
		description,
		instructions,
		type,
		isPublished,
		allowReview,
		showAnswers,
		randomizeQuestions,
		shuffleAnswers,
		timeLimitMinutes,
		passPercentage,
		attemptsAllowed,
		copyProtectionEnabled,
		pasteProtectionEnabled,
		disableRightClick,
	} = quizData;

	const { rows } = await pool.query(
		`INSERT INTO quizzes (
			class_id, teacher_id, title, description, instructions, type,
			is_published, allow_review, show_answers, randomize_questions,
			shuffle_answers, time_limit_minutes, pass_percentage, attempts_allowed,
			copy_protection_enabled, paste_protection_enabled, disable_right_click
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING *`,
		[
			classId,
			teacherId,
			title,
			description || null,
			instructions || null,
			type || 'mixed',
			isPublished || false,
			allowReview !== false,
			showAnswers || false,
			randomizeQuestions || false,
			shuffleAnswers || false,
			timeLimitMinutes || null,
			passPercentage || null,
			attemptsAllowed || null,
			copyProtectionEnabled !== false,
			pasteProtectionEnabled !== false,
			disableRightClick !== false,
		],
	);

	return rows[0];
}

async function getQuizzesByClassQuery(classId, teacherId, filters = {}) {
	const values = [classId];
	let whereClause = 'WHERE q.class_id = $1';

	if (!teacherId) {
		whereClause += ' AND q.is_published = true';
	}

	if (filters.search) {
		values.push(`%${String(filters.search).trim()}%`);
		whereClause += ` AND q.title ILIKE $${values.length}`;
	}

	const { rows } = await pool.query(
		`SELECT q.*,
			COUNT(DISTINCT qs.id)::int AS total_submissions,
			COUNT(DISTINCT CASE WHEN qs.is_graded THEN qs.id END)::int AS graded_submissions
		FROM quizzes q
		LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id
		${whereClause}
		GROUP BY q.id
		ORDER BY q.created_at DESC`,
		values,
	);

	return rows;
}

async function getQuizByIdQuery(quizId) {
	const { rows } = await pool.query(
		`SELECT * FROM quizzes WHERE id = $1`,
		[quizId],
	);
	return rows[0];
}

async function getQuizByIdInClassQuery(quizId, classId) {
	const { rows } = await pool.query(
		`SELECT * FROM quizzes WHERE id = $1 AND class_id = $2`,
		[quizId, classId],
	);
	return rows[0];
}

async function updateQuizQuery(quizId, teacherId, updates) {
	const allowedFields = [
		'title',
		'description',
		'instructions',
		'type',
		'is_published',
		'allow_review',
		'show_answers',
		'randomize_questions',
		'shuffle_answers',
		'time_limit_minutes',
		'pass_percentage',
		'attempts_allowed',
		'copy_protection_enabled',
		'paste_protection_enabled',
		'disable_right_click',
	];

	const setClauses = [];
	const values = [];
	let i = 1;

	for (const field of allowedFields) {
		if (updates[field] !== undefined) {
			setClauses.push(`${field} = $${i}`);
			values.push(updates[field]);
			i += 1;
		}
	}

	if (setClauses.length === 0) return null;

	values.push(quizId, teacherId);
	const { rows } = await pool.query(
		`UPDATE quizzes
		SET ${setClauses.join(', ')}, updated_at = NOW()
		WHERE id = $${i} AND teacher_id = $${i + 1}
		RETURNING *`,
		values,
	);

	return rows[0];
}

async function deleteQuizQuery(quizId, teacherId) {
	const { rowCount } = await pool.query(
		`DELETE FROM quizzes WHERE id = $1 AND teacher_id = $2`,
		[quizId, teacherId],
	);

	return rowCount;
}

async function createQuestionQuery(questionData) {
	const {
		quizId,
		questionText,
		questionType,
		points,
		correctAnswer,
		orderIndex,
	} = questionData;

	const { rows } = await pool.query(
		`INSERT INTO quiz_questions (
			quiz_id, question_text, question_type, points, correct_answer, order_index
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *`,
		[quizId, questionText, questionType, points || 1, correctAnswer || null, orderIndex],
	);

	return rows[0];
}

async function getQuestionsByQuizQuery(quizId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC`,
		[quizId],
	);

	return rows;
}

async function getQuestionByIdQuery(questionId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_questions WHERE id = $1`,
		[questionId],
	);

	return rows[0];
}

async function updateQuestionQuery(questionId, updates) {
	const allowedFields = ['question_text', 'question_type', 'points', 'correct_answer'];
	const setClauses = [];
	const values = [];
	let i = 1;

	for (const field of allowedFields) {
		if (updates[field] !== undefined) {
			setClauses.push(`${field} = $${i}`);
			values.push(updates[field]);
			i += 1;
		}
	}

	if (setClauses.length === 0) return null;

	values.push(questionId);
	const { rows } = await pool.query(
		`UPDATE quiz_questions
		SET ${setClauses.join(', ')}, updated_at = NOW()
		WHERE id = $${i}
		RETURNING *`,
		values,
	);

	return rows[0];
}

async function deleteQuestionQuery(questionId) {
	const { rowCount } = await pool.query(
		`DELETE FROM quiz_questions WHERE id = $1`,
		[questionId],
	);

	return rowCount;
}

async function createOptionQuery(optionData) {
	const { questionId, optionText, isCorrect, orderIndex } = optionData;

	const { rows } = await pool.query(
		`INSERT INTO quiz_question_options (
			question_id, option_text, is_correct, order_index
		) VALUES ($1, $2, $3, $4)
		RETURNING *`,
		[questionId, optionText, isCorrect || false, orderIndex],
	);

	return rows[0];
}

async function getOptionsByQuestionQuery(questionId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_question_options WHERE question_id = $1 ORDER BY order_index ASC`,
		[questionId],
	);

	return rows;
}

async function deleteOptionQuery(optionId) {
	const { rowCount } = await pool.query(
		`DELETE FROM quiz_question_options WHERE id = $1`,
		[optionId],
	);

	return rowCount;
}

async function createSubmissionQuery(submissionData) {
	const { quizId, studentId, attemptNumber } = submissionData;

	const { rows } = await pool.query(
		`INSERT INTO quiz_submissions (
			quiz_id, student_id, attempt_number
		) VALUES ($1, $2, $3)
		RETURNING *`,
		[quizId, studentId, attemptNumber || 1],
	);

	return rows[0];
}

async function getSubmissionByIdQuery(submissionId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_submissions WHERE id = $1`,
		[submissionId],
	);

	return rows[0];
}

async function getSubmissionsByStudentQuery(quizId, studentId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_submissions
		WHERE quiz_id = $1 AND student_id = $2
		ORDER BY attempt_number ASC`,
		[quizId, studentId],
	);

	return rows;
}

async function submitQuizQuery(submissionId, score, maxScore, timeSpentSeconds) {
	const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;

	const { rows } = await pool.query(
		`UPDATE quiz_submissions
		SET submitted_at = NOW(), score = $2, max_score = $3, percentage = $4, time_spent_seconds = $5, is_graded = true, updated_at = NOW()
		WHERE id = $1
		RETURNING *`,
		[submissionId, score, maxScore, percentage, timeSpentSeconds],
	);

	return rows[0];
}

async function recordAnswerQuery(answerData) {
	const {
		submissionId,
		questionId,
		selectedOptionId,
		textAnswer,
		isCorrect,
		pointsEarned,
	} = answerData;

	const { rows } = await pool.query(
		`INSERT INTO quiz_answers (
			submission_id, question_id, selected_option_id, text_answer, is_correct, points_earned
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (submission_id, question_id)
		DO UPDATE SET
			selected_option_id = EXCLUDED.selected_option_id,
			text_answer = EXCLUDED.text_answer,
			is_correct = EXCLUDED.is_correct,
			points_earned = EXCLUDED.points_earned,
			updated_at = NOW()
		RETURNING *`,
		[submissionId, questionId, selectedOptionId || null, textAnswer || null, isCorrect, pointsEarned || 0],
	);

	return rows[0];
}

async function getAnswersBySubmissionQuery(submissionId) {
	const { rows } = await pool.query(
		`SELECT * FROM quiz_answers WHERE submission_id = $1 ORDER BY created_at ASC`,
		[submissionId],
	);

	return rows;
}

async function getStudentAttemptCountQuery(quizId, studentId) {
	const { rows } = await pool.query(
		`SELECT COUNT(*) as attempt_count FROM quiz_submissions
		WHERE quiz_id = $1 AND student_id = $2`,
		[quizId, studentId],
	);

	return rows[0]?.attempt_count || 0;
}

async function getQuizSubmissionsSummaryQuery(quizId, classId) {
	const { rows } = await pool.query(
		`SELECT
			COUNT(DISTINCT qs.id)::int AS total_submissions,
			COUNT(DISTINCT CASE WHEN qs.is_graded THEN qs.id END)::int AS graded_submissions,
			COALESCE(AVG(qs.percentage), 0)::numeric(5,2) AS avg_percentage,
			COALESCE(MAX(qs.percentage), 0)::numeric(5,2) AS max_percentage,
			COALESCE(MIN(qs.percentage), 0)::numeric(5,2) AS min_percentage
		FROM quiz_submissions qs
		WHERE qs.quiz_id = $1`,
		[quizId],
	);

	return rows[0];
}

module.exports = {
	createQuizQuery,
	getQuizzesByClassQuery,
	getQuizByIdQuery,
	getQuizByIdInClassQuery,
	updateQuizQuery,
	deleteQuizQuery,
	createQuestionQuery,
	getQuestionsByQuizQuery,
	getQuestionByIdQuery,
	updateQuestionQuery,
	deleteQuestionQuery,
	createOptionQuery,
	getOptionsByQuestionQuery,
	deleteOptionQuery,
	createSubmissionQuery,
	getSubmissionByIdQuery,
	getSubmissionsByStudentQuery,
	submitQuizQuery,
	recordAnswerQuery,
	getAnswersBySubmissionQuery,
	getStudentAttemptCountQuery,
	getQuizSubmissionsSummaryQuery,
};
