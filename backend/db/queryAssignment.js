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
async function upsertGradeQuery(assignmentId, studentId, score, feedback) {
	const { rows } = await pool.query(
		`INSERT INTO grades (assignment_id, student_id, score, feedback)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (assignment_id, student_id)
         DO UPDATE SET
             score = EXCLUDED.score,
             feedback = EXCLUDED.feedback,
             updated_at = NOW()
         RETURNING *`,
		[assignmentId, studentId, score, feedback],
	);
	return rows[0];
}

async function getGradesForAssignmentQuery(assignmentId) {
	const { rows } = await pool.query(
		`SELECT g.*, u.username, u.profile_pic
         FROM grades g
         JOIN users u ON g.student_id = u.id
         WHERE g.assignment_id = $1
         ORDER BY u.username`,
		[assignmentId],
	);
	return rows;
}

async function getGradesForStudentQuery(studentId) {
	const { rows } = await pool.query(
		`SELECT a.class_id, a.title as assignment_title, a.type, a.max_score, a.due_date,
                g.score, g.feedback, g.updated_at as graded_at
         FROM grades g
         JOIN assignments a ON g.assignment_id = a.id
         WHERE g.student_id = $1
         ORDER BY a.due_date DESC`,
		[studentId],
	);
	return rows;
}

async function getStudentGradesForClassQuery(studentId, classId) {
	const { rows } = await pool.query(
		`SELECT a.id as assignment_id, a.title, a.type, a.max_score, a.due_date,
                g.score, g.feedback
         FROM assignments a
         LEFT JOIN grades g ON g.assignment_id = a.id AND g.student_id = $1
         WHERE a.class_id = $2
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
};
