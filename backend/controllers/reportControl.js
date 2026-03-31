const db = require('../db/queryReports');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const REPORT_KINDS = ['report', 'complaint'];
const REPORT_TYPES = [
	'technical_issue',
	'teacher_conduct',
	'schedule_issue',
	'fees_issue',
	'academic_issue',
	'attendance_issue',
	'bullying_harassment',
	'infrastructure_issue',
	'other',
];
const REPORT_STATUSES = [
	'submitted',
	'under_process',
	'resolved',
	'rejected',
	'closed',
];
const TARGET_ROLES = ['all', 'admin', 'teacher', 'student'];
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SEARCH_LENGTH = 120;
const MAX_FEEDBACK_LENGTH = 2000;

function parsePositiveInt(value, fallback, min, max) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	const integer = Math.trunc(numeric);
	if (integer < min) return min;
	if (integer > max) return max;
	return integer;
}

function normalizeText(value) {
	return String(value || '').trim();
}

function getAttachmentUrl(file) {
	if (!file) return null;
	return file.path || file.url || file.secure_url || null;
}

async function getUserScope(req, res) {
	const scope = await db.getUserScopeQuery(req.user.id);
	if (!scope || !scope.institute_id) {
		res.status(403).json({ message: 'User is not linked to an institute.' });
		return null;
	}
	return scope;
}

function reportTypeMeta() {
	return [
		{ value: 'technical_issue', label: 'Technical issue' },
		{ value: 'teacher_conduct', label: 'Teacher conduct' },
		{ value: 'schedule_issue', label: 'Schedule issue' },
		{ value: 'fees_issue', label: 'Fees issue' },
		{ value: 'academic_issue', label: 'Academic issue' },
		{ value: 'attendance_issue', label: 'Attendance issue' },
		{ value: 'bullying_harassment', label: 'Bullying or harassment' },
		{ value: 'infrastructure_issue', label: 'Infrastructure issue' },
		{ value: 'other', label: 'Other' },
	];
}

function statusMeta() {
	return [
		{ value: 'submitted', label: 'Submitted' },
		{ value: 'under_process', label: 'Under process' },
		{ value: 'resolved', label: 'Resolved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'closed', label: 'Closed' },
	];
}

function kindMeta() {
	return [
		{ value: 'report', label: 'Report' },
		{ value: 'complaint', label: 'Complaint' },
	];
}

async function getReportMeta(req, res) {
	return res.status(200).json({
		kinds: kindMeta(),
		types: reportTypeMeta(),
		statuses: statusMeta(),
	});
}

async function listReportTargets(req, res) {
	const scope = await getUserScope(req, res);
	if (!scope) return;

	const requestedRole = normalizeText(req.query?.role || 'all').toLowerCase();
	if (!TARGET_ROLES.includes(requestedRole)) {
		return res.status(400).json({ message: 'Invalid role filter.' });
	}

	const role =
		scope.role === 'student' && requestedRole === 'all'
			? 'teacher'
			: requestedRole;

	try {
		const targets = await db.listReportTargetsQuery({
			instituteId: scope.institute_id,
			role,
			excludeUserId: scope.id,
		});
		return res.status(200).json(targets);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function createReport(req, res) {
	const scope = await getUserScope(req, res);
	if (!scope) return;

	const kind = normalizeText(req.body?.kind || 'report').toLowerCase();
	const reportType = normalizeText(req.body?.reportType || 'other').toLowerCase();
	const title = normalizeText(req.body?.title);
	const description = normalizeText(req.body?.description);
	const targetUserId = normalizeText(req.body?.targetUserId) || null;
	const attachmentUrl = getAttachmentUrl(req.file);

	if (!REPORT_KINDS.includes(kind)) {
		return res.status(400).json({ message: 'Invalid report kind.' });
	}
	if (!REPORT_TYPES.includes(reportType)) {
		return res.status(400).json({ message: 'Invalid report type.' });
	}
	if (!title) {
		return res.status(400).json({ message: 'Title is required.' });
	}
	if (!description) {
		return res.status(400).json({ message: 'Description is required.' });
	}
	if (title.length > MAX_TITLE_LENGTH) {
		return res.status(400).json({ message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.` });
	}
	if (description.length > MAX_DESCRIPTION_LENGTH) {
		return res.status(400).json({ message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.` });
	}

	let target = null;
	if (targetUserId) {
		if (!isUuid(targetUserId)) {
			return res.status(400).json({ message: 'Invalid target user id format.' });
		}
		if (targetUserId === scope.id) {
			return res.status(400).json({ message: 'You cannot submit against your own account.' });
		}
		target = await db.getTargetUserByIdInInstituteQuery({
			targetUserId,
			instituteId: scope.institute_id,
		});
		if (!target) {
			return res.status(404).json({ message: 'Target user not found in your institute.' });
		}
	}

	try {
		const report = await db.createReportQuery({
			instituteId: scope.institute_id,
			reporterId: scope.id,
			reporterRole: scope.role,
			kind,
			reportType,
			title,
			description,
			targetUserId: target?.id || null,
			attachmentUrl,
		});
		return res.status(201).json(report);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getMyReports(req, res) {
	const scope = await getUserScope(req, res);
	if (!scope) return;
	const limit = parsePositiveInt(req.query?.limit, 50, 1, 100);
	const page = parsePositiveInt(req.query?.page, 1, 1, 1000);
	const offset = (page - 1) * limit;

	try {
		const reports = await db.listMyReportsQuery({
			reporterId: scope.id,
			instituteId: scope.institute_id,
			limit,
			offset,
		});
		return res.status(200).json(reports);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getInstituteReports(req, res) {
	const scope = await getUserScope(req, res);
	if (!scope) return;

	const status = normalizeText(req.query?.status || 'all').toLowerCase();
	const kind = normalizeText(req.query?.kind || 'all').toLowerCase();
	const reportType = normalizeText(req.query?.reportType || 'all').toLowerCase();
	const reporterRole = normalizeText(req.query?.reporterRole || 'all').toLowerCase();
	const search = normalizeText(req.query?.search || '');
	const limit = parsePositiveInt(req.query?.limit, 50, 1, 100);
	const page = parsePositiveInt(req.query?.page, 1, 1, 1000);
	const offset = (page - 1) * limit;

	if (status !== 'all' && !REPORT_STATUSES.includes(status)) {
		return res.status(400).json({ message: 'Invalid status filter.' });
	}
	if (kind !== 'all' && !REPORT_KINDS.includes(kind)) {
		return res.status(400).json({ message: 'Invalid kind filter.' });
	}
	if (reportType !== 'all' && !REPORT_TYPES.includes(reportType)) {
		return res.status(400).json({ message: 'Invalid report type filter.' });
	}
	if (reporterRole !== 'all' && !['admin', 'teacher', 'student', 'parent'].includes(reporterRole)) {
		return res.status(400).json({ message: 'Invalid reporter role filter.' });
	}
	if (search.length > MAX_SEARCH_LENGTH) {
		return res.status(400).json({ message: `Search cannot exceed ${MAX_SEARCH_LENGTH} characters.` });
	}

	try {
		const reports = await db.listInstituteReportsQuery({
			instituteId: scope.institute_id,
			status,
			kind,
			reportType,
			reporterRole,
			search,
			limit,
			offset,
		});
		return res.status(200).json(reports);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function updateReportStatus(req, res) {
	const scope = await getUserScope(req, res);
	if (!scope) return;

	const reportId = req.params.id;
	const status = normalizeText(req.body?.status).toLowerCase();
	const adminFeedback = normalizeText(req.body?.adminFeedback || '');

	if (!REPORT_STATUSES.includes(status)) {
		return res.status(400).json({ message: 'Invalid status value.' });
	}
	if (adminFeedback.length > MAX_FEEDBACK_LENGTH) {
		return res.status(400).json({ message: `Feedback cannot exceed ${MAX_FEEDBACK_LENGTH} characters.` });
	}

	try {
		const existing = await db.getReportByIdInInstituteQuery({
			id: reportId,
			instituteId: scope.institute_id,
		});
		if (!existing) {
			return res.status(404).json({ message: 'Report not found.' });
		}

		const updated = await db.updateReportStatusQuery({
			id: reportId,
			instituteId: scope.institute_id,
			status,
			adminFeedback: adminFeedback || null,
			adminId: scope.id,
		});

		return res.status(200).json(updated);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getReportMeta,
	listReportTargets,
	createReport,
	getMyReports,
	getInstituteReports,
	updateReportStatus,
};
