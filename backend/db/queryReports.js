const pool = require('./Pool');

async function getUserScopeQuery(userId) {
	const { rows } = await pool.query(
		`SELECT id, role, institute_id, username, email
		 FROM users
		 WHERE id = $1`,
		[userId],
	);
	return rows[0] || null;
}

async function getTargetUserByIdInInstituteQuery({ targetUserId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT id, username, email, role
		 FROM users
		 WHERE id = $1
		 AND institute_id = $2`,
		[targetUserId, instituteId],
	);
	return rows[0] || null;
}

async function createReportQuery({
	instituteId,
	reporterId,
	reporterRole,
	kind,
	reportType,
	title,
	description,
	targetUserId,
	attachmentUrl,
}) {
	const { rows } = await pool.query(
		`INSERT INTO reports (
			institute_id,
			reporter_id,
			reporter_role,
			kind,
			report_type,
			title,
			description,
			target_user_id,
			attachment_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING *`,
		[
			instituteId,
			reporterId,
			reporterRole,
			kind,
			reportType,
			title,
			description,
			targetUserId,
			attachmentUrl,
		],
	);
	return rows[0];
}

async function listMyReportsQuery({ reporterId, instituteId, limit = 50, offset = 0 }) {
	const { rows } = await pool.query(
		`SELECT
			r.id,
			r.kind,
			r.report_type,
			r.title,
			r.description,
			r.attachment_url,
			r.status,
			r.admin_feedback,
			r.created_at,
			r.updated_at,
			target.username AS target_username,
			target.role AS target_role
		FROM reports r
		LEFT JOIN users target ON target.id = r.target_user_id
		WHERE r.reporter_id = $1
		AND r.institute_id = $2
		ORDER BY r.created_at DESC
		LIMIT $3 OFFSET $4`,
		[reporterId, instituteId, limit, offset],
	);
	return rows;
}

async function listReportTargetsQuery({ instituteId, role, excludeUserId }) {
	const values = [instituteId, excludeUserId];
	let query = `SELECT id, username, email, role
		FROM users
		WHERE institute_id = $1
		AND id <> $2`;

	if (role && role !== 'all') {
		query += ` AND role = $3`;
		values.push(role);
	}

	query += ` ORDER BY username ASC`;

	const { rows } = await pool.query(query, values);
	return rows;
}

async function listInstituteReportsQuery({
	instituteId,
	status,
	kind,
	reportType,
	reporterRole,
	search,
	limit = 50,
	offset = 0,
}) {
	const clauses = ['r.institute_id = $1'];
	const values = [instituteId];
	let paramIndex = 2;

	if (status && status !== 'all') {
		clauses.push(`r.status = $${paramIndex}`);
		values.push(status);
		paramIndex += 1;
	}

	if (kind && kind !== 'all') {
		clauses.push(`r.kind = $${paramIndex}`);
		values.push(kind);
		paramIndex += 1;
	}

	if (reportType && reportType !== 'all') {
		clauses.push(`r.report_type = $${paramIndex}`);
		values.push(reportType);
		paramIndex += 1;
	}

	if (reporterRole && reporterRole !== 'all') {
		clauses.push(`r.reporter_role = $${paramIndex}`);
		values.push(reporterRole);
		paramIndex += 1;
	}

	if (search) {
		clauses.push(`(
			r.title ILIKE $${paramIndex}
			OR r.description ILIKE $${paramIndex}
			OR reporter.username ILIKE $${paramIndex}
			OR reporter.email ILIKE $${paramIndex}
			OR COALESCE(target.username, '') ILIKE $${paramIndex}
		)`);
		values.push(`%${search}%`);
	}

	const limitParam = paramIndex;
	values.push(limit);
	paramIndex += 1;

	const offsetParam = paramIndex;
	values.push(offset);

	const { rows } = await pool.query(
		`SELECT
			r.id,
			r.kind,
			r.report_type,
			r.title,
			r.description,
			r.attachment_url,
			r.status,
			r.admin_feedback,
			r.created_at,
			r.updated_at,
			r.reporter_id,
			r.reporter_role,
			reporter.username AS reporter_username,
			reporter.email AS reporter_email,
			target.username AS target_username,
			target.role AS target_role,
			admin.username AS updated_by_admin_username
		FROM reports r
		JOIN users reporter ON reporter.id = r.reporter_id
		LEFT JOIN users target ON target.id = r.target_user_id
		LEFT JOIN users admin ON admin.id = r.updated_by_admin_id
		WHERE ${clauses.join(' AND ')}
		ORDER BY r.created_at DESC
		LIMIT $${limitParam} OFFSET $${offsetParam}`,
		values,
	);
	return rows;
}

async function getReportByIdInInstituteQuery({ id, instituteId }) {
	const { rows } = await pool.query(
		`SELECT *
		FROM reports
		WHERE id = $1
		AND institute_id = $2`,
		[id, instituteId],
	);
	return rows[0] || null;
}

async function updateReportStatusQuery({
	id,
	instituteId,
	status,
	adminFeedback,
	adminId,
}) {
	const { rows } = await pool.query(
		`UPDATE reports
		SET
			status = $1,
			admin_feedback = $2,
			updated_by_admin_id = $3,
			updated_at = NOW()
		WHERE id = $4
		AND institute_id = $5
		RETURNING *`,
		[status, adminFeedback, adminId, id, instituteId],
	);
	return rows[0] || null;
}

module.exports = {
	getUserScopeQuery,
	getTargetUserByIdInInstituteQuery,
	createReportQuery,
	listMyReportsQuery,
	listReportTargetsQuery,
	listInstituteReportsQuery,
	getReportByIdInInstituteQuery,
	updateReportStatusQuery,
};
