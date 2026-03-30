const pool = require('./Pool');

async function getGradesForClassQuery(classId, options = {}) {
	const { gradeType = 'all', released = 'all' } = options;
	const params = [String(classId)];
	let where = 'WHERE g.class_id = $1';

	if (gradeType && gradeType !== 'all') {
		params.push(String(gradeType).toLowerCase());
		where += ` AND LOWER(COALESCE(g.grade_type, '')) = $${params.length}`;
	}

	if (released === 'true' || released === true) {
		where += ' AND g.released = true';
	}

	if (released === 'false' || released === false) {
		where += ' AND COALESCE(g.released, false) = false';
	}

	const { rows } = await pool.query(
		`SELECT
			g.id,
			g.class_id,
			g.teacher_id,
			g.student_id,
			g.assignment_id,
			g.grade,
			g.max_grade,
			g.grade_type,
			g.feedback,
			g.released,
			g.created_at,
			COALESCE(u.username, g.student_id) AS student_name
		 FROM grades g
		 LEFT JOIN users u ON u.id::text = g.student_id
		 ${where}
		 ORDER BY g.created_at DESC`,
		params,
	);

	return rows;
}

async function insertGradesQuery(client, classId, teacherId, grades) {
	const insertText = `INSERT INTO grades (
		class_id,
		teacher_id,
		student_id,
		assignment_id,
		grade,
		max_grade,
		grade_type,
		feedback,
		released,
		created_at
	)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
	RETURNING *`;

	const inserted = [];
	for (const gradeEntry of grades) {
		const values = [
			String(classId),
			String(teacherId),
			String(gradeEntry.student_id),
			gradeEntry.assignment_id ? String(gradeEntry.assignment_id) : null,
			Number(gradeEntry.grade),
			Number(gradeEntry.max_grade),
			String(gradeEntry.grade_type).toLowerCase(),
			gradeEntry.feedback ? String(gradeEntry.feedback) : '',
			Boolean(gradeEntry.released),
		];

		const result = await client.query(insertText, values);
		inserted.push(result.rows[0]);
	}

	return inserted;
}

async function setClassReleaseStatusQuery(
	client,
	classId,
	released,
	gradeType = 'all',
) {
	const params = [Boolean(released), String(classId)];
	let where = 'WHERE class_id = $2';

	if (gradeType && gradeType !== 'all') {
		params.push(String(gradeType).toLowerCase());
		where += ` AND LOWER(COALESCE(grade_type, '')) = $${params.length}`;
	}

	const result = await client.query(
		`UPDATE grades
		 SET released = $1
		 ${where}`,
		params,
	);

	return result.rowCount;
}

async function getStudentReleasedGradesQuery(studentId, options = {}) {
	const { classId = null, gradeType = 'all' } = options;
	const params = [String(studentId)];
	let where = 'WHERE g.student_id = $1 AND g.released = true';

	if (classId) {
		params.push(String(classId));
		where += ` AND g.class_id = $${params.length}`;
	}

	if (gradeType && gradeType !== 'all') {
		params.push(String(gradeType).toLowerCase());
		where += ` AND LOWER(COALESCE(g.grade_type, '')) = $${params.length}`;
	}

	const { rows } = await pool.query(
		`SELECT
			g.id,
			g.class_id,
			g.teacher_id,
			g.student_id,
			g.assignment_id,
			g.grade,
			g.max_grade,
			g.grade_type,
			g.feedback,
			g.released,
			g.created_at,
			COALESCE(c.class_name, g.class_id) AS class_name,
			COALESCE(t.username, '') AS teacher_name
		 FROM grades g
		 LEFT JOIN classes c ON c.id::text = g.class_id
		 LEFT JOIN users t ON t.id::text = g.teacher_id
		 ${where}
		 ORDER BY g.created_at DESC`,
		params,
	);

	return rows;
}

module.exports = {
	getGradesForClassQuery,
	insertGradesQuery,
	setClassReleaseStatusQuery,
	getStudentReleasedGradesQuery,

};