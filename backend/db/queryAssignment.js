const pool = require('./Pool');

async function addAttachmentQuery(assignmentId, title, type, content) {
	const { rows } = await pool.query(
		`INSERT INTO assignment_attachments (assignment_id, title, type, content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
		[assignmentId, title, type, content],
	);
	return rows[0];
}

async function getAttachmentsByAssignmentQuery(assignmentId) {
	const { rows } = await pool.query(
		`SELECT * FROM assignment_attachments WHERE assignment_id = $1 ORDER BY created_at`,
		[assignmentId],
	);
	return rows;
}

async function deleteAttachmentQuery(attachmentId, assignmentId) {
	const { rowCount } = await pool.query(
		`DELETE FROM assignment_attachments WHERE id = $1 AND assignment_id = $2`,
		[attachmentId, assignmentId],
	);
	return rowCount;
}

// Assignment CRUD
async function createAssignmentQuery(assignment) {
	const { classId, title, description, type, maxScore, dueDate } = assignment;
	const { rows } = await pool.query(
		`INSERT INTO assignments (class_id, title, description, type, max_score, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
		[classId, title, description, type, maxScore, dueDate || null],
	);
	return rows[0];
}

async function getAssignmentsByClassQuery(classId) {
	const { rows } = await pool.query(
		`SELECT * FROM assignments WHERE class_id = $1 ORDER BY due_date ASC, created_at ASC`,
		[classId],
	);
	return rows;
}

async function updateAssignmentQuery(id, updates) {
	const { title, description, type, maxScore, dueDate } = updates;
	const { rows } = await pool.query(
		`UPDATE assignments
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             type = COALESCE($3, type),
             max_score = COALESCE($4, max_score),
             due_date = COALESCE($5, due_date),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
		[title, description, type, maxScore, dueDate, id],
	);
	return rows[0];
}

async function deleteAssignmentQuery(id) {
	const { rowCount } = await pool.query(
		`DELETE FROM assignments WHERE id = $1`,
		[id],
	);
	return rowCount;
}

// Grade CRUD
async function upsertGradeQuery(
	assignmentId,
	studentId,
	score,
	feedback,
	options = {},
) {
	const {
		classId = null,
		teacherId = null,
		maxScore = null,
		gradeType = 'assignment',
		released = false,
	} = options;

	const numericScore = score === null || score === undefined ? null : Number(score);
	const numericMax =
		maxScore === null || maxScore === undefined ? null : Number(maxScore);

	const updated = await pool.query(
		`UPDATE grades
		 SET grade = $3,
		     max_grade = COALESCE($4, max_grade),
		     grade_type = COALESCE($5, grade_type),
		     feedback = $6,
		     released = COALESCE($7, released),
		     class_id = COALESCE($8, class_id),
		     teacher_id = COALESCE($9, teacher_id),
		     created_at = COALESCE(created_at, NOW())
		 WHERE assignment_id::text = $1::text AND student_id::text = $2::text
		 RETURNING *`,
		[
			assignmentId,
			studentId,
			numericScore,
			numericMax,
			gradeType,
			feedback || '',
			released,
			classId,
			teacherId,
		],
	);

	if (updated.rows[0]) return updated.rows[0];

	const inserted = await pool.query(
		`INSERT INTO grades (
			assignment_id,
			student_id,
			grade,
			max_grade,
			grade_type,
			feedback,
			released,
			class_id,
			teacher_id,
			created_at
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		 RETURNING *`,
		[
			assignmentId,
			studentId,
			numericScore,
			numericMax,
			gradeType,
			feedback || '',
			released,
			classId,
			teacherId,
		],
	);

	return inserted.rows[0];
}

async function getGradesForAssignmentQuery(assignmentId) {
	const { rows } = await pool.query(
		`SELECT
			g.id,
			g.assignment_id,
			g.student_id,
			g.grade AS score,
			g.max_grade,
			g.feedback,
			g.released,
			g.created_at,
			u.username,
			u.profile_pic
         FROM grades g
		 JOIN users u ON u.id::text = g.student_id
		 WHERE g.assignment_id::text = $1::text
         ORDER BY u.username`,
		[assignmentId],
	);
	return rows;
}

async function getGradesForStudentQuery(studentId) {
	const { rows } = await pool.query(
		`SELECT a.class_id, a.title as assignment_title, a.type, a.max_score, a.due_date,
		        g.grade AS score,
				COALESCE(g.max_grade, a.max_score) AS max_grade,
				g.feedback,
				g.created_at as graded_at
         FROM grades g
		 JOIN assignments a ON g.assignment_id::text = a.id::text
		 WHERE g.student_id::text = $1::text
         ORDER BY a.due_date DESC`,
		[studentId],
	);
	return rows;
}

async function getStudentGradesForClassQuery(studentId, classId) {
	const { rows } = await pool.query(
		`SELECT a.id as assignment_id, a.title, a.type, a.max_score, a.due_date,
		        g.grade AS score,
				g.feedback,
				g.max_grade
         FROM assignments a
		 LEFT JOIN grades g
			ON g.assignment_id::text = a.id::text
			AND g.student_id::text = $1::text
		 WHERE a.class_id::text = $2::text
         ORDER BY a.due_date ASC`,
		[studentId, classId],
	);
	return rows;
}
async function getAssignmentByIdQuery(id) {
	const { rows } = await pool.query('SELECT * FROM assignments WHERE id = $1', [
		id,
	]);
	return rows[0];
}

// Submissions
async function upsertSubmissionQuery(assignmentId, studentId, submissionType, submissionContent) {
	const { rows } = await pool.query(
		`INSERT INTO assignment_submissions (assignment_id, student_id, submission_type, submission_content)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (assignment_id, student_id)
		 DO UPDATE SET
		   submission_type = EXCLUDED.submission_type,
		   submission_content = EXCLUDED.submission_content,
		   updated_at = NOW()
		 RETURNING *`,
		[assignmentId, studentId, submissionType, submissionContent],
	);
	return rows[0];
}

async function getSubmissionsByAssignmentQuery(assignmentId) {
	const { rows } = await pool.query(
		`SELECT s.*, u.username, u.profile_pic
		 FROM assignment_submissions s
		 JOIN users u ON s.student_id = u.id
		 WHERE s.assignment_id = $1
		 ORDER BY s.submitted_at DESC`,
		[assignmentId],
	);
	return rows;
}

async function getStudentSubmissionQuery(assignmentId, studentId) {
	const { rows } = await pool.query(
		`SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2`,
		[assignmentId, studentId],
	);
	return rows[0];
}
module.exports = {
	addAttachmentQuery,
	getAttachmentsByAssignmentQuery,
	deleteAttachmentQuery,
	createAssignmentQuery,
	getAssignmentsByClassQuery,
	updateAssignmentQuery,
	deleteAssignmentQuery,
	upsertGradeQuery,
	getGradesForAssignmentQuery,
	getGradesForStudentQuery,
	getStudentGradesForClassQuery,
	getAssignmentByIdQuery,
	upsertSubmissionQuery,
	getSubmissionsByAssignmentQuery,
	getStudentSubmissionQuery,
};
