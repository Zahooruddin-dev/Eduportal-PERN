const crypto = require('crypto');
const pool = require('./Pool');

function looksLikeUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function uniqueTextArray(values) {
	if (!Array.isArray(values)) return [];
	const next = [];
	for (let i = 0; i < values.length; i += 1) {
		const item = String(values[i] || '').trim();
		if (!item) continue;
		if (!next.includes(item)) {
			next.push(item);
		}
	}
	return next;
}

function hashOneTimeCode(code) {
	return crypto
		.createHash('sha256')
		.update(String(code || '').trim())
		.digest('hex');
}

async function getTeacherProfileByUserId(userId, executor = pool) {
	const { rows } = await executor.query(
		`SELECT
			tp.user_id,
			tp.institute_id,
			tp.subjects,
			tp.preferred_class_id,
			tp.preferred_grade_label,
			tp.created_at,
			tp.updated_at,
			c.class_name AS preferred_class_name
		 FROM teacher_profiles tp
		 LEFT JOIN classes c ON c.id = tp.preferred_class_id
		 WHERE tp.user_id = $1`,
		[userId],
	);
	return rows[0] || null;
}

async function upsertTeacherProfileByUserId(payload, executor = pool) {
	const userId = String(payload?.userId || '').trim();
	const instituteId = String(payload?.instituteId || '').trim();
	const subjects = uniqueTextArray(payload?.subjects);
	const classIdCandidate = String(payload?.classId || '').trim();
	const classId = classIdCandidate || null;
	const otherGrade = String(payload?.otherGrade || '').trim() || null;

	if (!subjects.length) {
		throw new Error('At least one subject is required for teacher accounts.');
	}

	let validatedClassId = null;
	if (classId) {
		if (!looksLikeUuid(classId)) {
			throw new Error('Selected class is invalid.');
		}
		const { rows: classRows } = await executor.query(
			`SELECT id
			 FROM classes
			 WHERE id = $1
			 AND institute_id = $2
			 LIMIT 1`,
			[classId, instituteId],
		);
		if (!classRows[0]) {
			throw new Error('Selected class is invalid.');
		}
		validatedClassId = classRows[0].id;
	}

	await executor.query(
		`INSERT INTO teacher_profiles (
			user_id,
			institute_id,
			subjects,
			preferred_class_id,
			preferred_grade_label,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3::text[], $4, $5, NOW(), NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET
			subjects = EXCLUDED.subjects,
			preferred_class_id = EXCLUDED.preferred_class_id,
			preferred_grade_label = EXCLUDED.preferred_grade_label,
			updated_at = NOW()`,
		[
			userId,
			instituteId,
			subjects,
			validatedClassId,
			validatedClassId ? null : otherGrade,
		],
	);

	return getTeacherProfileByUserId(userId, executor);
}

async function registerQuery(
	username,
	email,
	password_hash,
	role = 'student',
	institute_id = null,
	parentProfile = null,
	teacherProfile = null,
) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`INSERT INTO users (username,email,password_hash,role,institute_id)
			 VALUES (
				$1,
				$2,
				$3,
				$4,
				COALESCE($5, (SELECT id FROM institutes ORDER BY created_at ASC LIMIT 1))
			 )
			 RETURNING id, username, email, role, profile_pic, created_at, institute_id`,
			[username, email, password_hash, role, institute_id],
		);

		const user = rows[0];

		if (role === 'parent') {
			await client.query(
				`INSERT INTO parent_profiles (
					user_id,
					child_full_name,
					child_grade,
					relationship_to_child,
					parent_phone,
					alternate_phone,
					address,
					notes
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[
					user.id,
					parentProfile?.childFullName,
					parentProfile?.childGrade,
					parentProfile?.relationshipToChild,
					parentProfile?.parentPhone,
					parentProfile?.alternatePhone || null,
					parentProfile?.address || null,
					parentProfile?.notes || null,
				],
			);
		}

		if (role === 'teacher') {
			await upsertTeacherProfileByUserId(
				{
					userId: user.id,
					instituteId: user.institute_id,
					subjects: teacherProfile?.subjects,
					classId: teacherProfile?.classId,
					otherGrade: teacherProfile?.otherGrade,
				},
				client,
			);
		}

		await client.query('COMMIT');
		return user;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function updateUsername(id, username, profilePic) {
	const query = profilePic
		? 'UPDATE users SET username = $1, profile_pic = $2 WHERE id = $3 RETURNING *'
		: 'UPDATE users SET username = $1 WHERE id = $2 RETURNING *';
	const params = profilePic ? [username, profilePic, id] : [username, id];
	const { rows } = await pool.query(query, params);
	return rows[0];
}

async function updatePasswordQuery(userId, newPasswordHash) {
	const { rows } = await pool.query(
		'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
		[newPasswordHash, userId],
	);
	return rows[0] || null;
}

async function deleteUserQuery(email) {
	const { rows } = await pool.query(
		'DELETE FROM users WHERE email = $1 RETURNING id',
		[email],
	);
	return rows[0] || null;
}

async function deleteUserByIdQuery(userId) {
	const { rows } = await pool.query(
		'DELETE FROM users WHERE id = $1 RETURNING id',
		[userId],
	);
	return rows[0] || null;
}

async function getUserByEmail(email) {
	const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
	return rows[0] || null;
}

async function getUserById(userId) {
	const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
	return rows[0] || null;
}

async function getParentProfileByUserId(userId) {
	const { rows } = await pool.query(
		`SELECT
			pp.user_id,
			pp.child_full_name,
			pp.child_grade,
			pp.relationship_to_child,
			pp.child_student_id,
			pp.parent_phone,
			pp.alternate_phone,
			pp.address,
			pp.notes,
			pp.created_at,
			pp.updated_at,
			linked.username AS linked_student_username,
			linked.email AS linked_student_email,
			linked.profile_pic AS linked_student_profile_pic
		 FROM parent_profiles pp
		 LEFT JOIN users linked ON linked.id = pp.child_student_id
		 WHERE pp.user_id = $1`,
		[userId],
	);
	return rows[0] || null;
}

async function updateParentProfileByUserId(userId, profile) {
	const { rows } = await pool.query(
		`UPDATE parent_profiles
		 SET
			child_full_name = $2,
			child_grade = $3,
			relationship_to_child = $4,
			parent_phone = $5,
			alternate_phone = $6,
			address = $7,
			notes = $8,
			updated_at = NOW()
		 WHERE user_id = $1
		 RETURNING user_id`,
		[
			userId,
			profile.childFullName,
			profile.childGrade,
			profile.relationshipToChild,
			profile.parentPhone,
			profile.alternatePhone || null,
			profile.address || null,
			profile.notes || null,
		],
	);

	if (!rows[0]) return null;
	return getParentProfileByUserId(userId);
}

async function listRegistrationClassesQuery() {
	const { rows } = await pool.query(
		`SELECT c.id, c.class_name, c.grade_level, c.subject
		 FROM classes c
		 WHERE c.institute_id = (
			SELECT id FROM institutes ORDER BY created_at ASC LIMIT 1
		 )
		 ORDER BY c.class_name ASC`,
	);
	return rows;
}

async function saveResetCode(email, code, expires, requestIp = null) {
	await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
	const codeHash = hashOneTimeCode(code);
	await pool.query(
		`INSERT INTO password_resets (
			email,
			code_hash,
			attempts_remaining,
			expires_at,
			request_ip,
			created_at,
			last_attempt_at
		)
		VALUES ($1, $2, 3, $3, $4, NOW(), NOW())`,
		[email, codeHash, expires, requestIp],
	);
}

async function verifyResetCode(email, code) {
	const { rows } = await pool.query(
		`SELECT id, code_hash, attempts_remaining, expires_at, consumed_at
		 FROM password_resets
		 WHERE email = $1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[email],
	);
	const entry = rows[0];
	if (!entry) {
		return { ok: false, reason: 'invalid', attemptsRemaining: 0 };
	}
	if (entry.consumed_at) {
		return { ok: false, reason: 'invalid', attemptsRemaining: 0 };
	}
	if (new Date(entry.expires_at).getTime() <= Date.now()) {
		return { ok: false, reason: 'expired', attemptsRemaining: 0 };
	}
	if (Number(entry.attempts_remaining || 0) <= 0) {
		return { ok: false, reason: 'attempts_exceeded', attemptsRemaining: 0 };
	}

	const expectedHash = String(entry.code_hash || '');
	const providedHash = hashOneTimeCode(code);
	if (expectedHash !== providedHash) {
		const { rows: updatedRows } = await pool.query(
			`UPDATE password_resets
			 SET attempts_remaining = GREATEST(attempts_remaining - 1, 0),
				 last_attempt_at = NOW()
			 WHERE id = $1
			 RETURNING attempts_remaining`,
			[entry.id],
		);
		const attemptsRemaining = Number(updatedRows[0]?.attempts_remaining || 0);
		return {
			ok: false,
			reason: attemptsRemaining <= 0 ? 'attempts_exceeded' : 'invalid',
			attemptsRemaining,
		};
	}

	await pool.query(
		`UPDATE password_resets
		 SET attempts_remaining = GREATEST(attempts_remaining - 1, 0),
			 consumed_at = NOW(),
			 last_attempt_at = NOW()
		 WHERE id = $1`,
		[entry.id],
	);

	return {
		ok: true,
		resetId: entry.id,
		attemptsRemaining: Math.max(Number(entry.attempts_remaining || 0) - 1, 0),
	};
}

async function deleteResetCode(email) {
	await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
}

async function updateUserPassword(email, hashedPassword) {
	await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
		hashedPassword,
		email,
	]);
}

async function createRefreshSessionQuery(payload, executor = pool) {
	const { rows } = await executor.query(
		`INSERT INTO auth_refresh_tokens (
			user_id,
			token_hash,
			expires_at,
			ip_address,
			user_agent,
			rotated_from,
			created_at,
			last_used_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, user_id, expires_at`,
		[
			payload.userId,
			payload.tokenHash,
			payload.expiresAt,
			payload.ipAddress || null,
			payload.userAgent || null,
			payload.rotatedFromId || null,
		],
	);
	return rows[0];
}

async function getActiveRefreshSessionByHashQuery(tokenHash) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM auth_refresh_tokens
		 WHERE token_hash = $1
		 AND revoked_at IS NULL
		 AND expires_at > NOW()
		 LIMIT 1`,
		[tokenHash],
	);
	if (!rows[0]) return null;
	await pool.query(
		'UPDATE auth_refresh_tokens SET last_used_at = NOW() WHERE id = $1',
		[rows[0].id],
	);
	return rows[0];
}

async function revokeRefreshSessionByIdQuery(sessionId, reason = 'revoked', replacedBy = null, executor = pool) {
	await executor.query(
		`UPDATE auth_refresh_tokens
		 SET revoked_at = COALESCE(revoked_at, NOW()),
			 revoked_reason = COALESCE(revoked_reason, $2),
			 replaced_by = COALESCE($3, replaced_by)
		 WHERE id = $1`,
		[sessionId, reason, replacedBy],
	);
}

async function revokeRefreshSessionByHashQuery(tokenHash, reason = 'revoked', replacedBy = null) {
	await pool.query(
		`UPDATE auth_refresh_tokens
		 SET revoked_at = COALESCE(revoked_at, NOW()),
			 revoked_reason = COALESCE(revoked_reason, $2),
			 replaced_by = COALESCE($3, replaced_by)
		 WHERE token_hash = $1`,
		[tokenHash, reason, replacedBy],
	);
}

async function revokeAllRefreshSessionsByUserIdQuery(userId, reason = 'security') {
	await pool.query(
		`UPDATE auth_refresh_tokens
		 SET revoked_at = COALESCE(revoked_at, NOW()),
			 revoked_reason = COALESCE(revoked_reason, $2)
		 WHERE user_id = $1
		 AND revoked_at IS NULL`,
		[userId, reason],
	);
}

module.exports = {
	registerQuery,
	updateUsername,
	deleteUserQuery,
	deleteUserByIdQuery,
	getUserByEmail,
	getUserById,
	updatePasswordQuery,
	verifyResetCode,
	deleteResetCode,
	saveResetCode,
	updateUserPassword,
	getParentProfileByUserId,
	updateParentProfileByUserId,
	listRegistrationClassesQuery,
	upsertTeacherProfileByUserId,
	getTeacherProfileByUserId,
	createRefreshSessionQuery,
	getActiveRefreshSessionByHashQuery,
	revokeRefreshSessionByIdQuery,
	revokeRefreshSessionByHashQuery,
	revokeAllRefreshSessionsByUserIdQuery,
};
