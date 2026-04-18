const pool = require('./Pool');

async function getStudentCalendarClasses(userId) {
	const { rows } = await pool.query(
		`SELECT
			c.id AS class_id,
			c.class_name,
			c.subject,
			c.schedule_days,
			c.start_time,
			c.end_time,
			c.schedule_blocks,
			c.schedule_timezone,
			c.meeting_link,
			c.room_number,
			c.grade_level,
			c.description,
			c.institute_id,
			t.username AS teacher_name
		 FROM enrollments e
		 JOIN classes c ON c.id = e.class_id
		 LEFT JOIN users t ON t.id = c.teacher_id
		 WHERE e.student_id = $1
		 ORDER BY c.class_name ASC`,
		[userId],
	);
	return rows;
}

async function getTeacherCalendarClasses(teacherId) {
	const { rows } = await pool.query(
		`SELECT
			c.id AS class_id,
			c.class_name,
			c.subject,
			c.schedule_days,
			c.start_time,
			c.end_time,
			c.schedule_blocks,
			c.schedule_timezone,
			c.meeting_link,
			c.room_number,
			c.grade_level,
			c.description,
			c.institute_id,
			t.username AS teacher_name
		 FROM classes c
		 LEFT JOIN users t ON t.id = c.teacher_id
		 WHERE c.teacher_id = $1
		 ORDER BY c.class_name ASC`,
		[teacherId],
	);
	return rows;
}

async function getStudentCalendarAssignments(userId) {
	const { rows } = await pool.query(
		`SELECT
			a.id AS assignment_id,
			a.class_id,
			a.title,
			a.description,
			a.type,
			a.due_date,
			a.due_at,
			c.class_name,
			c.subject,
			c.schedule_timezone,
			c.institute_id
		 FROM assignments a
		 JOIN classes c ON c.id = a.class_id
		 JOIN enrollments e ON e.class_id = c.id
		 WHERE e.student_id = $1
		 AND (a.due_at IS NOT NULL OR a.due_date IS NOT NULL)
		 ORDER BY COALESCE(a.due_at, a.due_date::timestamp) ASC`,
		[userId],
	);
	return rows;
}

async function getTeacherCalendarAssignments(teacherId) {
	const { rows } = await pool.query(
		`SELECT
			a.id AS assignment_id,
			a.class_id,
			a.title,
			a.description,
			a.type,
			a.due_date,
			a.due_at,
			c.class_name,
			c.subject,
			c.schedule_timezone,
			c.institute_id
		 FROM assignments a
		 JOIN classes c ON c.id = a.class_id
		 WHERE c.teacher_id = $1
		 AND (a.due_at IS NOT NULL OR a.due_date IS NOT NULL)
		 ORDER BY COALESCE(a.due_at, a.due_date::timestamp) ASC`,
		[teacherId],
	);
	return rows;
}

async function getPreferredAcademicTermForInstitute(instituteId) {
	const active = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE institute_id = $1
		 AND is_active = true
		 ORDER BY starts_on ASC
		 LIMIT 1`,
		[instituteId],
	);
	if (active.rows[0]) return active.rows[0];

	const current = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE institute_id = $1
		 AND starts_on <= CURRENT_DATE
		 AND ends_on >= CURRENT_DATE
		 ORDER BY starts_on DESC
		 LIMIT 1`,
		[instituteId],
	);
	if (current.rows[0]) return current.rows[0];

	const next = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE institute_id = $1
		 AND starts_on > CURRENT_DATE
		 ORDER BY starts_on ASC
		 LIMIT 1`,
		[instituteId],
	);
	if (next.rows[0]) return next.rows[0];

	const fallback = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE institute_id = $1
		 ORDER BY ends_on DESC
		 LIMIT 1`,
		[instituteId],
	);
	return fallback.rows[0] || null;
}

async function listAcademicExceptionsForInstitute(instituteId, options = {}) {
	const { termId = null, classIds = [], onlyInstructional = false } = options;
	const clauses = ['institute_id = $1'];
	const values = [instituteId];
	let index = 2;

	if (termId) {
		clauses.push(`(term_id = $${index} OR term_id IS NULL)`);
		values.push(termId);
		index += 1;
	}

	if (Array.isArray(classIds) && classIds.length > 0) {
		clauses.push(`(class_id IS NULL OR class_id = ANY($${index}::uuid[]))`);
		values.push(classIds);
		index += 1;
	}

	if (onlyInstructional) {
		clauses.push('blocks_instruction = true');
	}

	const { rows } = await pool.query(
		`SELECT *
		 FROM academic_calendar_exceptions
		 WHERE ${clauses.join(' AND ')}
		 ORDER BY starts_on ASC, created_at ASC`,
		values,
	);
	return rows;
}

async function getActiveCalendarFeedTokenByUserId(userId) {
	const { rows } = await pool.query(
		`SELECT id, user_id, institute_id, expires_at, created_at
		 FROM calendar_feed_tokens
		 WHERE user_id = $1
		 AND revoked_at IS NULL
		 AND expires_at > NOW()
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[userId],
	);
	return rows[0] || null;
}

async function revokeActiveCalendarFeedTokensByUserId(userId, client = pool) {
	await client.query(
		`UPDATE calendar_feed_tokens
		 SET revoked_at = NOW(),
			 updated_at = NOW()
		 WHERE user_id = $1
		 AND revoked_at IS NULL`,
		[userId],
	);
}

async function createCalendarFeedToken({ userId, instituteId, tokenHash, expiresAt }, client = pool) {
	const { rows } = await client.query(
		`INSERT INTO calendar_feed_tokens (
			user_id,
			institute_id,
			token_hash,
			expires_at
		 ) VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, institute_id, expires_at, created_at`,
		[userId, instituteId, tokenHash, expiresAt],
	);
	return rows[0];
}

async function getCalendarFeedTokenByHash(tokenHash) {
	const { rows } = await pool.query(
		`SELECT
			t.id,
			t.user_id,
			t.institute_id,
			t.expires_at,
			t.revoked_at,
			t.created_at,
			u.role,
			u.username,
			u.institute_id AS user_institute_id
		 FROM calendar_feed_tokens t
		 JOIN users u ON u.id = t.user_id
		 WHERE t.token_hash = $1
		 LIMIT 1`,
		[tokenHash],
	);
	return rows[0] || null;
}

async function listAcademicTermsByInstitute(instituteId) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE institute_id = $1
		 ORDER BY starts_on DESC, created_at DESC`,
		[instituteId],
	);
	return rows;
}

async function getAcademicTermById(termId, instituteId) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM academic_terms
		 WHERE id = $1
		 AND institute_id = $2`,
		[termId, instituteId],
	);
	return rows[0] || null;
}

async function setAcademicTermsInactive(instituteId, client = pool) {
	await client.query(
		`UPDATE academic_terms
		 SET is_active = false,
			 updated_at = NOW()
		 WHERE institute_id = $1
		 AND is_active = true`,
		[instituteId],
	);
}

async function createAcademicTerm(data, client = pool) {
	const { instituteId, label, startsOn, endsOn, isActive, createdBy } = data;
	const { rows } = await client.query(
		`INSERT INTO academic_terms (
			institute_id,
			label,
			starts_on,
			ends_on,
			is_active,
			created_by
		 ) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
		[instituteId, label, startsOn, endsOn, Boolean(isActive), createdBy || null],
	);
	return rows[0];
}

async function updateAcademicTerm(data, client = pool) {
	const { termId, instituteId, label, startsOn, endsOn, isActive } = data;
	const { rows } = await client.query(
		`UPDATE academic_terms
		 SET label = COALESCE($3, label),
			 starts_on = COALESCE($4, starts_on),
			 ends_on = COALESCE($5, ends_on),
			 is_active = COALESCE($6, is_active),
			 updated_at = NOW()
		 WHERE id = $1
		 AND institute_id = $2
		 RETURNING *`,
		[
			termId,
			instituteId,
			label || null,
			startsOn || null,
			endsOn || null,
			isActive === undefined ? null : Boolean(isActive),
		],
	);
	return rows[0] || null;
}

async function deleteAcademicTerm(termId, instituteId) {
	const { rowCount } = await pool.query(
		`DELETE FROM academic_terms
		 WHERE id = $1
		 AND institute_id = $2`,
		[termId, instituteId],
	);
	return rowCount;
}

async function validateClassInInstitute(classId, instituteId) {
	const { rows } = await pool.query(
		`SELECT id
		 FROM classes
		 WHERE id = $1
		 AND institute_id = $2`,
		[classId, instituteId],
	);
	return rows[0] || null;
}

async function validateTermInInstitute(termId, instituteId) {
	const { rows } = await pool.query(
		`SELECT id
		 FROM academic_terms
		 WHERE id = $1
		 AND institute_id = $2`,
		[termId, instituteId],
	);
	return rows[0] || null;
}

async function listAcademicExceptionsByInstitute(instituteId, options = {}) {
	const { classId = null, termId = null } = options;
	const clauses = ['e.institute_id = $1'];
	const values = [instituteId];
	let index = 2;

	if (classId) {
		clauses.push(`e.class_id = $${index}`);
		values.push(classId);
		index += 1;
	}

	if (termId) {
		clauses.push(`e.term_id = $${index}`);
		values.push(termId);
		index += 1;
	}

	const { rows } = await pool.query(
		`SELECT
			e.*,
			c.class_name,
			t.label AS term_label
		 FROM academic_calendar_exceptions e
		 LEFT JOIN classes c ON c.id = e.class_id
		 LEFT JOIN academic_terms t ON t.id = e.term_id
		 WHERE ${clauses.join(' AND ')}
		 ORDER BY e.starts_on DESC, e.created_at DESC`,
		values,
	);
	return rows;
}

async function getAcademicExceptionById(exceptionId, instituteId) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM academic_calendar_exceptions
		 WHERE id = $1
		 AND institute_id = $2`,
		[exceptionId, instituteId],
	);
	return rows[0] || null;
}

async function createAcademicException(data) {
	const {
		instituteId,
		classId,
		termId,
		title,
		description,
		category,
		startsOn,
		endsOn,
		blocksInstruction,
		createdBy,
	} = data;
	const { rows } = await pool.query(
		`INSERT INTO academic_calendar_exceptions (
			institute_id,
			class_id,
			term_id,
			title,
			description,
			category,
			starts_on,
			ends_on,
			blocks_instruction,
			created_by
		 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING *`,
		[
			instituteId,
			classId || null,
			termId || null,
			title,
			description || null,
			category,
			startsOn,
			endsOn,
			Boolean(blocksInstruction),
			createdBy || null,
		],
	);
	return rows[0];
}

async function updateAcademicException(data) {
	const {
		exceptionId,
		instituteId,
		classId,
		termId,
		title,
		description,
		category,
		startsOn,
		endsOn,
		blocksInstruction,
	} = data;
	const updates = [];
	const values = [exceptionId, instituteId];
	let index = 3;

	if (classId !== undefined) {
		updates.push(`class_id = $${index}`);
		values.push(classId);
		index += 1;
	}

	if (termId !== undefined) {
		updates.push(`term_id = $${index}`);
		values.push(termId);
		index += 1;
	}

	if (title !== undefined) {
		updates.push(`title = $${index}`);
		values.push(title);
		index += 1;
	}

	if (description !== undefined) {
		updates.push(`description = $${index}`);
		values.push(description);
		index += 1;
	}

	if (category !== undefined) {
		updates.push(`category = $${index}`);
		values.push(category);
		index += 1;
	}

	if (startsOn !== undefined) {
		updates.push(`starts_on = $${index}`);
		values.push(startsOn);
		index += 1;
	}

	if (endsOn !== undefined) {
		updates.push(`ends_on = $${index}`);
		values.push(endsOn);
		index += 1;
	}

	if (blocksInstruction !== undefined) {
		updates.push(`blocks_instruction = $${index}`);
		values.push(Boolean(blocksInstruction));
		index += 1;
	}

	updates.push('updated_at = NOW()');

	const { rows } = await pool.query(
		`UPDATE academic_calendar_exceptions
		 SET ${updates.join(', ')}
		 WHERE id = $1
		 AND institute_id = $2
		 RETURNING *`,
		values,
	);
	return rows[0] || null;
}

async function deleteAcademicException(exceptionId, instituteId) {
	const { rowCount } = await pool.query(
		`DELETE FROM academic_calendar_exceptions
		 WHERE id = $1
		 AND institute_id = $2`,
		[exceptionId, instituteId],
	);
	return rowCount;
}

module.exports = {
	getStudentCalendarClasses,
	getTeacherCalendarClasses,
	getStudentCalendarAssignments,
	getTeacherCalendarAssignments,
	getPreferredAcademicTermForInstitute,
	listAcademicExceptionsForInstitute,
	getActiveCalendarFeedTokenByUserId,
	revokeActiveCalendarFeedTokensByUserId,
	createCalendarFeedToken,
	getCalendarFeedTokenByHash,
	listAcademicTermsByInstitute,
	getAcademicTermById,
	setAcademicTermsInactive,
	createAcademicTerm,
	updateAcademicTerm,
	deleteAcademicTerm,
	validateClassInInstitute,
	validateTermInInstitute,
	listAcademicExceptionsByInstitute,
	getAcademicExceptionById,
	createAcademicException,
	updateAcademicException,
	deleteAcademicException,
};
