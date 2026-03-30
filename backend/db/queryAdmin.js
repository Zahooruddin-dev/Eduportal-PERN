const pool = require('./Pool');

async function countAdminsQuery() {
	const { rows } = await pool.query(
		`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`,
	);
	return rows[0]?.count || 0;
}

async function createInstituteQuery(name) {
	const { rows } = await pool.query(
		`INSERT INTO institutes(name) VALUES ($1) RETURNING id, name, created_at`,
		[name],
	);
	return rows[0];
}

async function createUserInInstituteQuery({
	username,
	email,
	passwordHash,
	role,
	instituteId,
}) {
	const { rows } = await pool.query(
		`INSERT INTO users (username, email, password_hash, role, institute_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, username, email, role, institute_id, created_at, profile_pic`,
		[username, email, passwordHash, role, instituteId],
	);
	return rows[0];
}

async function getInstituteByUserIdQuery(userId) {
	const { rows } = await pool.query(
		`SELECT i.id, i.name
		 FROM users u
		 JOIN institutes i ON i.id = u.institute_id
		 WHERE u.id = $1`,
		[userId],
	);
	return rows[0] || null;
}

async function listInstituteUsersQuery({ instituteId, role, search }) {
	const clauses = ['institute_id = $1'];
	const values = [instituteId];
	let paramIndex = 2;

	if (role && role !== 'all') {
		clauses.push(`role = $${paramIndex}`);
		values.push(role);
		paramIndex += 1;
	}

	if (search) {
		clauses.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
		values.push(`%${search}%`);
	}

	const { rows } = await pool.query(
		`SELECT id, username, email, role, profile_pic, created_at
		 FROM users
		 WHERE ${clauses.join(' AND ')}
		 ORDER BY created_at DESC`,
		values,
	);
	return rows;
}

async function listInstituteClassesQuery(instituteId) {
	const { rows } = await pool.query(
		`SELECT c.id, c.class_name, c.subject, c.grade_level, c.teacher_id, u.username AS teacher_name
		 FROM classes c
		 LEFT JOIN users u ON u.id = c.teacher_id
		 WHERE c.institute_id = $1
		 ORDER BY c.class_name ASC`,
		[instituteId],
	);
	return rows;
}

async function createAdminInviteQuery({
	instituteId,
	email,
	tokenHash,
	requestedBy,
	expiresAt,
}) {
	await pool.query(
		`UPDATE admin_invites
		 SET status = 'revoked'
		 WHERE institute_id = $1
		 AND LOWER(email) = LOWER($2)
		 AND status = 'pending'`,
		[instituteId, email],
	);

	const { rows } = await pool.query(
		`INSERT INTO admin_invites (
			institute_id,
			email,
			invite_token_hash,
			requested_by,
			expires_at,
			status
		)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, institute_id, email, expires_at, created_at`,
		[instituteId, email, tokenHash, requestedBy, expiresAt],
	);
	return rows[0];
}

async function getPendingInviteByTokenHashQuery(tokenHash) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM admin_invites
		 WHERE invite_token_hash = $1
		 AND status = 'pending'
		 AND expires_at > NOW()
		 LIMIT 1`,
		[tokenHash],
	);
	return rows[0] || null;
}

async function markInviteAcceptedQuery({ inviteId, acceptedBy }) {
	await pool.query(
		`UPDATE admin_invites
		 SET status = 'accepted', accepted_by = $2, accepted_at = NOW()
		 WHERE id = $1`,
		[inviteId, acceptedBy],
	);
}

async function getUserByIdInInstituteQuery({ userId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT id, username, email, role
		 FROM users
		 WHERE id = $1
		 AND institute_id = $2`,
		[userId, instituteId],
	);
	return rows[0] || null;
}

async function validateClassIdsForInstituteQuery({ instituteId, classIds }) {
	if (!classIds.length) return [];
	const { rows } = await pool.query(
		`SELECT id
		 FROM classes
		 WHERE institute_id = $1
		 AND id = ANY($2::uuid[])`,
		[instituteId, classIds],
	);
	return rows.map((row) => row.id);
}

module.exports = {
	countAdminsQuery,
	createInstituteQuery,
	createUserInInstituteQuery,
	getInstituteByUserIdQuery,
	listInstituteUsersQuery,
	listInstituteClassesQuery,
	createAdminInviteQuery,
	getPendingInviteByTokenHashQuery,
	markInviteAcceptedQuery,
	getUserByIdInInstituteQuery,
	validateClassIdsForInstituteQuery,
};
