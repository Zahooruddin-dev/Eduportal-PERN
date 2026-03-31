const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/Pool');
const adminDb = require('../db/queryAdmin');
const authDb = require('../db/queryAuth');
const { sendResetEmail } = require('../utility/emailSender');
const { isUuid } = require('../middleware/uuidParamMiddleware');
const { getCacheValue, setCacheValue, deleteCacheByPrefix } = require('../utility/ttlCache');

const MAX_USER_SEARCH_LENGTH = 120;
const DEFAULT_USER_LIST_LIMIT = 25;
const MAX_USER_LIST_LIMIT = 100;
const RISK_OVERVIEW_CACHE_MS = Number(process.env.RISK_OVERVIEW_CACHE_MS || 45 * 1000);

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function signToken(user) {
	return jwt.sign(
		{
			id: user.id,
			role: user.role,
			username: user.username,
			email: user.email,
			profile: user.profile_pic || null,
			createdAt: user.created_at,
			instituteId: user.institute_id,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '1d' },
	);
}

function toUserPayload(user) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		profile: user.profile_pic || null,
		createdAt: user.created_at,
		instituteId: user.institute_id,
	};
}

function generateTempPassword(length = 12) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*';
	let password = '';
	for (let i = 0; i < length; i += 1) {
		const index = crypto.randomInt(0, alphabet.length);
		password += alphabet[index];
	}
	return password;
}

function toNumber(value, fallback = 0) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function parsePositiveInt(value, fallback, min, max) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	const integer = Math.trunc(numeric);
	if (integer < min) return min;
	if (integer > max) return max;
	return integer;
}

function toBooleanFlag(value) {
	const text = String(value || '').trim().toLowerCase();
	return text === '1' || text === 'true' || text === 'yes' || text === 'y';
}

function shouldBypassCache(req) {
	const refreshFlag = req.query?.refresh;
	const cacheFlag = req.query?.cache;
	const refreshText = String(refreshFlag || '').trim().toLowerCase();
	const cacheText = String(cacheFlag || '').trim().toLowerCase();

	if (toBooleanFlag(refreshFlag)) return true;
	if (cacheText === 'skip' || cacheText === 'bypass' || cacheText === 'off') return true;
	if (refreshText === 'force') return true;
	return false;
}

async function getAdminInstituteOr404(userId, res) {
	const institute = await adminDb.getInstituteByUserIdQuery(userId);
	if (!institute) {
		res.status(404).json({ message: 'Institute not found for this admin account.' });
		return null;
	}
	return institute;
}

async function bootstrapAdmin(req, res) {
	const setupSecret = req.headers['x-admin-setup-secret'];
	if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
		return res.status(500).json({ message: 'ADMIN_BOOTSTRAP_SECRET is not configured.' });
	}
	if (!setupSecret || setupSecret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
		return res.status(403).json({ message: 'Invalid bootstrap secret.' });
	}

	const adminCount = await adminDb.countAdminsQuery();
	if (adminCount > 0) {
		return res.status(409).json({ message: 'Admin bootstrap already completed.' });
	}

	const instituteName = String(req.body?.instituteName || '').trim();
	const username = String(req.body?.username || '').trim();
	const email = normalizeEmail(req.body?.email);
	const password = String(req.body?.password || '');

	if (!instituteName || !username || !email || !password) {
		return res.status(400).json({ message: 'Institute name, username, email, and password are required.' });
	}

	if (password.length < 8) {
		return res.status(400).json({ message: 'Password must be at least 8 characters.' });
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const instituteResult = await client.query(
			`INSERT INTO institutes(name)
			 VALUES ($1)
			 RETURNING id, name, created_at`,
			[instituteName],
		);

		const institute = instituteResult.rows[0];
		const userResult = await client.query(
			`INSERT INTO users (username, email, password_hash, role, institute_id)
			 VALUES ($1, $2, $3, 'admin', $4)
			 RETURNING id, username, email, role, profile_pic, created_at, institute_id`,
			[username, email, passwordHash, institute.id],
		);

		await client.query('COMMIT');
		const user = userResult.rows[0];
		const token = signToken(user);
		return res.status(201).json({
			message: 'Admin bootstrap completed.',
			token,
			user: toUserPayload(user),
			institute,
		});
	} catch (error) {
		await client.query('ROLLBACK');
		if (error.code === '23505') {
			return res.status(400).json({ message: 'Email or institute name already exists.' });
		}
		return res.status(500).json({ message: error.message });
	} finally {
		client.release();
	}
}

async function createTeacher(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const username = String(req.body?.username || '').trim();
	const email = normalizeEmail(req.body?.email);
	const password = String(req.body?.password || '');

	if (!username || !email || !password) {
		return res.status(400).json({ message: 'Username, email, and password are required.' });
	}

	if (password.length < 8) {
		return res.status(400).json({ message: 'Password must be at least 8 characters.' });
	}

	try {
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await adminDb.createUserInInstituteQuery({
			username,
			email,
			passwordHash,
			role: 'teacher',
			instituteId: institute.id,
		});
		return res.status(201).json({
			message: 'Teacher account created.',
			user: toUserPayload(user),
		});
	} catch (error) {
		if (error.code === '23505') {
			return res.status(400).json({ message: 'Email already exists.' });
		}
		return res.status(500).json({ message: error.message });
	}
}

async function bulkCreateStudents(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const students = Array.isArray(req.body?.students) ? req.body.students : [];
	const classIds = Array.isArray(req.body?.classIds) ? req.body.classIds : [];

	if (!students.length) {
		return res.status(400).json({ message: 'At least one student row is required.' });
	}

	if (classIds.some((id) => !isUuid(id))) {
		return res.status(400).json({ message: 'One or more class IDs are invalid.' });
	}

	const validClassIds = await adminDb.validateClassIdsForInstituteQuery({
		instituteId: institute.id,
		classIds,
	});

	if (validClassIds.length !== classIds.length) {
		return res.status(400).json({ message: 'One or more selected classes are outside your institute.' });
	}

	const created = [];
	const skipped = [];

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		for (let i = 0; i < students.length; i += 1) {
			const raw = students[i] || {};
			const username = String(raw.username || '').trim();
			const email = normalizeEmail(raw.email);
			const providedPassword = String(raw.password || '').trim();
			const generatedPassword = providedPassword ? null : generateTempPassword();
			const password = providedPassword || generatedPassword;

			if (!username || !email) {
				skipped.push({
					row: i + 1,
					email,
					reason: 'username and email are required',
				});
				continue;
			}

			if (!password || password.length < 8) {
				skipped.push({
					row: i + 1,
					email,
					reason: 'password must be at least 8 characters',
				});
				continue;
			}

			const passwordHash = await bcrypt.hash(password, 10);
			const insertResult = await client.query(
				`INSERT INTO users (username, email, password_hash, role, institute_id)
				 VALUES ($1, $2, $3, 'student', $4)
				 ON CONFLICT (email) DO NOTHING
				 RETURNING id, username, email, role, created_at, profile_pic, institute_id`,
				[username, email, passwordHash, institute.id],
			);

			const user = insertResult.rows[0];
			if (!user) {
				skipped.push({
					row: i + 1,
					email,
					reason: 'email already exists',
				});
				continue;
			}

			for (let j = 0; j < validClassIds.length; j += 1) {
				const classId = validClassIds[j];
				await client.query(
					`INSERT INTO enrollments (student_id, class_id)
					 VALUES ($1, $2)
					 ON CONFLICT (student_id, class_id) DO NOTHING`,
					[user.id, classId],
				);
				await client.query(
					`INSERT INTO class_enrollment_status (
						class_id,
						student_id,
						status,
						data_policy,
						updated_by,
						updated_at
					)
					VALUES ($1, $2, 'active', 'keep', $3, NOW())
					ON CONFLICT (class_id, student_id)
					DO UPDATE SET
						status = EXCLUDED.status,
						data_policy = EXCLUDED.data_policy,
						updated_by = EXCLUDED.updated_by,
						updated_at = NOW()`,
					[classId, user.id, req.user.id],
				);
			}

			created.push({
				user: toUserPayload(user),
				temporaryPassword: generatedPassword,
				enrolledClassCount: validClassIds.length,
			});
		}

		await client.query('COMMIT');

		return res.status(201).json({
			message: 'Bulk student creation completed.',
			summary: {
				totalRows: students.length,
				createdCount: created.length,
				skippedCount: skipped.length,
			},
			created,
			skipped,
		});
	} catch (error) {
		await client.query('ROLLBACK');
		return res.status(500).json({ message: error.message });
	} finally {
		client.release();
	}
}

async function createAdminInvite(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const email = normalizeEmail(req.body?.email);
	if (!email) {
		return res.status(400).json({ message: 'Invite email is required.' });
	}

	const existing = await authDb.getUserByEmail(email);
	if (existing) {
		if (existing.institute_id === institute.id && existing.role === 'admin') {
			return res.status(400).json({ message: 'This user is already an admin in your institute.' });
		}
		return res.status(400).json({ message: 'A user with this email already exists.' });
	}

	const token = crypto.randomBytes(24).toString('hex');
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	try {
		const invite = await adminDb.createAdminInviteQuery({
			instituteId: institute.id,
			email,
			tokenHash,
			requestedBy: req.user.id,
			expiresAt,
		});

		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
		const inviteUrl = `${frontendUrl}/register?adminInvite=${token}`;

		return res.status(201).json({
			message: 'Admin invitation created.',
			invite: {
				id: invite.id,
				email: invite.email,
				expiresAt: invite.expires_at,
				inviteUrl,
				token,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function acceptAdminInvite(req, res) {
	const token = String(req.body?.token || '').trim();
	const username = String(req.body?.username || '').trim();
	const password = String(req.body?.password || '');

	if (!token || !username || !password) {
		return res.status(400).json({ message: 'Token, username, and password are required.' });
	}

	if (password.length < 8) {
		return res.status(400).json({ message: 'Password must be at least 8 characters.' });
	}

	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const invite = await adminDb.getPendingInviteByTokenHashQuery(tokenHash);
	if (!invite) {
		return res.status(400).json({ message: 'Invite is invalid or expired.' });
	}

	const existing = await authDb.getUserByEmail(invite.email);
	if (existing) {
		return res.status(409).json({ message: 'A user with this email already exists.' });
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const userResult = await client.query(
			`INSERT INTO users (username, email, password_hash, role, institute_id)
			 VALUES ($1, $2, $3, 'admin', $4)
			 RETURNING id, username, email, role, profile_pic, created_at, institute_id`,
			[username, invite.email, passwordHash, invite.institute_id],
		);
		const user = userResult.rows[0];

		await client.query(
			`UPDATE admin_invites
			 SET status = 'accepted', accepted_by = $2, accepted_at = NOW()
			 WHERE id = $1`,
			[invite.id, user.id],
		);

		await client.query('COMMIT');
		const signedToken = signToken(user);
		return res.status(201).json({
			message: 'Admin account created from invite.',
			token: signedToken,
			user: toUserPayload(user),
		});
	} catch (error) {
		await client.query('ROLLBACK');
		if (error.code === '23505') {
			return res.status(400).json({ message: 'Account already exists.' });
		}
		return res.status(500).json({ message: error.message });
	} finally {
		client.release();
	}
}

async function getInstituteClasses(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;
	try {
		const classes = await adminDb.listInstituteClassesQuery(institute.id);
		return res.status(200).json(classes);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function listInstituteUsers(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const role = String(req.query?.role || 'all').trim().toLowerCase();
	const search = String(req.query?.search || '').trim();
	const compact = toBooleanFlag(req.query?.compact);
	const limit = parsePositiveInt(
		req.query?.limit,
		compact ? 200 : DEFAULT_USER_LIST_LIMIT,
		1,
		compact ? 500 : MAX_USER_LIST_LIMIT,
	);
	const page = parsePositiveInt(req.query?.page, 1, 1, 5000);
	const offset = (page - 1) * limit;

	if (!['all', 'admin', 'teacher', 'student', 'parent'].includes(role)) {
		return res.status(400).json({ message: 'Invalid role filter.' });
	}

	if (search.length > MAX_USER_SEARCH_LENGTH) {
		return res.status(400).json({ message: `Search cannot exceed ${MAX_USER_SEARCH_LENGTH} characters.` });
	}

	try {
		const [result, roleSummary] = await Promise.all([
			adminDb.listInstituteUsersQuery({
				instituteId: institute.id,
				role,
				search,
				limit,
				offset,
				compact,
			}),
			compact
				? Promise.resolve(null)
				: adminDb.getInstituteUserRoleCountsQuery(institute.id),
		]);

		const total = toNumber(result.total, 0);
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return res.status(200).json({
			items: result.items,
			summary: roleSummary,
			pagination: {
				total,
				page,
				limit,
				totalPages,
				hasNext: page < totalPages,
				hasPrevious: page > 1,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getRiskOverview(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;
	const cacheKey = `admin-risk:${institute.id}`;

	if (!shouldBypassCache(req)) {
		const cached = getCacheValue(cacheKey);
		if (cached) {
			return res.status(200).json(cached);
		}
	}

	try {
		const overview = await adminDb.getInstituteRiskOverviewQuery(institute.id);
		const unresolved = {
			submitted: 0,
			under_process: 0,
		};

		overview.unresolvedReportsByStatus.forEach((row) => {
			const status = String(row.status || '').toLowerCase();
			if (status === 'submitted' || status === 'under_process') {
				unresolved[status] = toNumber(row.count, 0);
			}
		});

		const atRiskStudents = overview.atRiskStudents.map((row) => {
			const attendanceRate = toNumber(row.attendance_rate, 0);
			const absentCount = toNumber(row.absent_count, 0);
			const lateCount = toNumber(row.late_count, 0);

			let riskLevel = 'low';
			if (attendanceRate < 75 || absentCount >= 4) {
				riskLevel = 'high';
			} else if (attendanceRate < 85 || absentCount >= 2 || lateCount >= 3) {
				riskLevel = 'medium';
			}

			return {
				studentId: row.student_id,
				studentName: row.student_name,
				recordedDays: toNumber(row.recorded_days, 0),
				presentCount: toNumber(row.present_count, 0),
				absentCount,
				lateCount,
				attendanceRate,
				riskLevel,
			};
		});

		const lowAttendanceClasses = overview.lowAttendanceClasses.map((row) => ({
			classId: row.class_id,
			className: row.class_name,
			recordedEntries: toNumber(row.recorded_entries, 0),
			presentCount: toNumber(row.present_count, 0),
			absentCount: toNumber(row.absent_count, 0),
			attendanceRate: toNumber(row.attendance_rate, 0),
		}));

		const payload = {
			institute: {
				id: institute.id,
				name: institute.name,
			},
			totals: {
				totalStudents: toNumber(overview.totals.total_students, 0),
				totalClasses: toNumber(overview.totals.total_classes, 0),
				unresolvedReports: toNumber(overview.totals.unresolved_reports, 0),
			},
			unresolvedReportsByStatus: unresolved,
			atRiskStudents,
			lowAttendanceClasses,
		};

		setCacheValue(cacheKey, payload, RISK_OVERVIEW_CACHE_MS);
		return res.status(200).json(payload);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function resetUserPasswordByAdmin(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const { userId } = req.params;
	if (!isUuid(userId)) {
		return res.status(400).json({ message: 'Invalid user id format.' });
	}

	const method = String(req.body?.method || '').trim().toLowerCase();
	if (!['temporary', 'email'].includes(method)) {
		return res.status(400).json({ message: 'Method must be temporary or email.' });
	}

	try {
		const targetUser = await adminDb.getUserByIdInInstituteQuery({
			userId,
			instituteId: institute.id,
		});
		if (!targetUser) {
			return res.status(404).json({ message: 'User not found in your institute.' });
		}

		if (method === 'temporary') {
			const newPassword = String(req.body?.newPassword || '');
			if (newPassword.length < 8) {
				return res.status(400).json({ message: 'New password must be at least 8 characters.' });
			}
			const passwordHash = await bcrypt.hash(newPassword, 10);
			await pool.query(
				`UPDATE users SET password_hash = $1 WHERE id = $2`,
				[passwordHash, targetUser.id],
			);
			await authDb.deleteResetCode(targetUser.email);
			return res.status(200).json({ message: 'Temporary password set successfully.' });
		}

		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const expires = new Date(Date.now() + 15 * 60000);
		await authDb.saveResetCode(targetUser.email, code, expires);
		await sendResetEmail(targetUser.email, code);
		return res.status(200).json({ message: 'Reset code sent successfully.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function linkParentStudent(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const parentUserId = String(req.params?.userId || '').trim();
	const rawStudentId = req.body?.studentId;
	const studentId = rawStudentId ? String(rawStudentId).trim() : null;

	if (!isUuid(parentUserId)) {
		return res.status(400).json({ message: 'Invalid parent user id format.' });
	}
	if (studentId && !isUuid(studentId)) {
		return res.status(400).json({ message: 'Invalid student id format.' });
	}

	try {
		const parentUser = await adminDb.getUserByIdInInstituteQuery({
			userId: parentUserId,
			instituteId: institute.id,
		});
		if (!parentUser || parentUser.role !== 'parent') {
			return res.status(404).json({ message: 'Parent account not found in your institute.' });
		}

		const existingParentProfile = await adminDb.getParentProfileWithLinkedStudentQuery({
			parentUserId,
			instituteId: institute.id,
		});
		if (!existingParentProfile) {
			return res.status(404).json({ message: 'Parent profile details are missing for this account.' });
		}

		if (studentId) {
			const studentUser = await adminDb.getUserByIdInInstituteQuery({
				userId: studentId,
				instituteId: institute.id,
			});
			if (!studentUser || studentUser.role !== 'student') {
				return res.status(404).json({ message: 'Student account not found in your institute.' });
			}
		}

		const linked = await adminDb.updateParentLinkedStudentQuery({
			parentUserId,
			instituteId: institute.id,
			studentId,
		});
		if (!linked) {
			return res.status(404).json({ message: 'Unable to update parent link.' });
		}

		const updatedParentProfile = await adminDb.getParentProfileWithLinkedStudentQuery({
			parentUserId,
			instituteId: institute.id,
		});

		deleteCacheByPrefix('parent-overview:');

		return res.status(200).json({
			message: studentId
				? 'Student linked to parent profile successfully.'
				: 'Linked student removed from parent profile successfully.',
			parentProfile: updatedParentProfile,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	bootstrapAdmin,
	createTeacher,
	bulkCreateStudents,
	createAdminInvite,
	acceptAdminInvite,
	getInstituteClasses,
	listInstituteUsers,
	getRiskOverview,
	resetUserPasswordByAdmin,
	linkParentStudent,
};
