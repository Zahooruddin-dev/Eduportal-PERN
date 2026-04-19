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
}, executor = pool) {
	const { rows } = await executor.query(
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

async function listInstituteUsersQuery({
	instituteId,
	role,
	search,
	limit = 25,
	offset = 0,
	compact = false,
}) {
	const clauses = ['u.institute_id = $1'];
	const values = [instituteId];
	let paramIndex = 2;

	if (role && role !== 'all') {
		clauses.push(`u.role = $${paramIndex}`);
		values.push(role);
		paramIndex += 1;
	}

	if (search) {
		clauses.push(compact
			? `(
				u.username ILIKE $${paramIndex}
				OR u.email ILIKE $${paramIndex}
			)`
			: `(
				u.username ILIKE $${paramIndex}
				OR u.email ILIKE $${paramIndex}
				OR COALESCE(pp.child_full_name, '') ILIKE $${paramIndex}
				OR COALESCE(tp.preferred_grade_label, '') ILIKE $${paramIndex}
				OR COALESCE(array_to_string(tp.subjects, ', '), '') ILIKE $${paramIndex}
			)`);
		values.push(`%${search}%`);
		paramIndex += 1;
	}

	const fromClause = compact
		? 'FROM users u'
		: `FROM users u
		   LEFT JOIN parent_profiles pp ON pp.user_id = u.id
		   LEFT JOIN users linked ON linked.id = pp.child_student_id
		   LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
		   LEFT JOIN classes tpc ON tpc.id = tp.preferred_class_id`;

	const whereClause = clauses.join(' AND ');

	const countResult = await pool.query(
		`SELECT COUNT(*)::int AS total
		 ${fromClause}
		 WHERE ${whereClause}`,
		values,
	);

	const selectColumns = compact
		? `u.id,
		   u.username,
		   u.email,
		   u.role,
		   u.created_at`
		: `u.id,
		   u.username,
		   u.email,
		   u.role,
		   u.profile_pic,
		   u.created_at,
		   tp.subjects AS teacher_subjects,
		   tp.preferred_class_id AS teacher_preferred_class_id,
		   tp.preferred_grade_label AS teacher_preferred_grade_label,
		   tpc.class_name AS teacher_preferred_class_name,
		   pp.child_full_name,
		   pp.child_grade,
		   pp.relationship_to_child,
		   pp.child_student_id,
		   pp.parent_phone,
		   pp.alternate_phone,
		   pp.address,
		   pp.notes,
		   linked.username AS linked_student_username,
		   linked.email AS linked_student_email`;

	const dataValues = [...values, limit, offset];

	const { rows } = await pool.query(
		`SELECT
			${selectColumns}
		 ${fromClause}
		 WHERE ${whereClause}
		 ORDER BY u.created_at DESC
		 LIMIT $${paramIndex}
		 OFFSET $${paramIndex + 1}`,
		dataValues,
	);

	return {
		items: rows,
		total: Number(countResult.rows[0]?.total || 0),
	};
}

async function getInstituteUserRoleCountsQuery(instituteId) {
	const { rows } = await pool.query(
		`SELECT role, COUNT(*)::int AS count
		 FROM users
		 WHERE institute_id = $1
		 GROUP BY role`,
		[instituteId],
	);

	const summary = {
		total: 0,
		admin: 0,
		teacher: 0,
		student: 0,
		parent: 0,
	};

	for (const row of rows) {
		const role = String(row.role || '').toLowerCase();
		const count = Number(row.count || 0);
		if (!Number.isFinite(count)) continue;
		summary.total += count;
		if (summary[role] !== undefined) {
			summary[role] = count;
		}
	}

	return summary;
}

async function updateParentLinkedStudentQuery({ parentUserId, instituteId, studentId = null }) {
	const { rows } = await pool.query(
		`UPDATE parent_profiles pp
		 SET child_student_id = $3,
		 	 updated_at = NOW()
		 FROM users parent_user
		 WHERE pp.user_id = parent_user.id
		 	AND parent_user.id = $1
		 	AND parent_user.institute_id = $2
		 	AND parent_user.role = 'parent'
		 RETURNING pp.user_id, pp.child_student_id`,
		[parentUserId, instituteId, studentId],
	);

	return rows[0] || null;
}

async function getParentProfileWithLinkedStudentQuery({ parentUserId, instituteId }) {
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
			linked.email AS linked_student_email
		 FROM parent_profiles pp
		 JOIN users parent_user ON parent_user.id = pp.user_id
		 LEFT JOIN users linked ON linked.id = pp.child_student_id
		 WHERE pp.user_id = $1
		 	AND parent_user.role = 'parent'
		 	AND parent_user.institute_id = $2`,
		[parentUserId, instituteId],
	);

	return rows[0] || null;
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

async function getInstituteRiskOverviewQuery(instituteId) {
	const [atRiskStudentsResult, lowAttendanceClassesResult, unresolvedReportsResult, totalsResult] = await Promise.all([
		pool.query(
			`SELECT
				a.student_id,
				u.username AS student_name,
				COUNT(*)::int AS recorded_days,
				SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
				SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
				SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)::int AS late_count,
				ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS attendance_rate
			 FROM attendance a
			 JOIN classes c ON c.id = a.class_id
			 JOIN users u ON u.id = a.student_id
			 WHERE c.institute_id = $1
			 AND a.date >= date_trunc('month', CURRENT_DATE)::date
			 AND a.date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
			 GROUP BY a.student_id, u.username
			 HAVING COUNT(*) >= 3
			 ORDER BY attendance_rate ASC, absent_count DESC, late_count DESC
			 LIMIT 12`,
			[instituteId],
		),
		pool.query(
			`SELECT
				c.id AS class_id,
				c.class_name,
				COUNT(*)::int AS recorded_entries,
				SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
				SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
				ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS attendance_rate
			 FROM attendance a
			 JOIN classes c ON c.id = a.class_id
			 WHERE c.institute_id = $1
			 AND a.date >= date_trunc('month', CURRENT_DATE)::date
			 AND a.date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
			 GROUP BY c.id, c.class_name
			 HAVING COUNT(*) >= 5
			 ORDER BY attendance_rate ASC, absent_count DESC
			 LIMIT 10`,
			[instituteId],
		),
		pool.query(
			`SELECT status, COUNT(*)::int AS count
			 FROM reports
			 WHERE institute_id = $1
			 AND status IN ('submitted', 'under_process')
			 GROUP BY status`,
			[instituteId],
		),
		pool.query(
			`SELECT
				(SELECT COUNT(*)::int FROM users WHERE institute_id = $1 AND role = 'student') AS total_students,
				(SELECT COUNT(*)::int FROM classes WHERE institute_id = $1) AS total_classes,
				(SELECT COUNT(*)::int FROM reports WHERE institute_id = $1 AND status IN ('submitted', 'under_process')) AS unresolved_reports`,
			[instituteId],
		),
	]);

	return {
		atRiskStudents: atRiskStudentsResult.rows,
		lowAttendanceClasses: lowAttendanceClassesResult.rows,
		unresolvedReportsByStatus: unresolvedReportsResult.rows,
		totals: totalsResult.rows[0] || {
			total_students: 0,
			total_classes: 0,
			unresolved_reports: 0,
		},
	};
}

module.exports = {
	countAdminsQuery,
	createInstituteQuery,
	createUserInInstituteQuery,
	getInstituteByUserIdQuery,
	listInstituteUsersQuery,
	getInstituteUserRoleCountsQuery,
	listInstituteClassesQuery,
	createAdminInviteQuery,
	getPendingInviteByTokenHashQuery,
	markInviteAcceptedQuery,
	getUserByIdInInstituteQuery,
	validateClassIdsForInstituteQuery,
	updateParentLinkedStudentQuery,
	getParentProfileWithLinkedStudentQuery,
	getInstituteRiskOverviewQuery,
};
