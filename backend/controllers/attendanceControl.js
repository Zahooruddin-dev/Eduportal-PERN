const db = require('../db/queryAttendence');
const dbClass = require('../db/queryClasses');
const dbEnroll = require('../db/queryEnrollment');
const { isUuid } = require('../middleware/uuidParamMiddleware');
const { getCacheValue, setCacheValue, deleteCacheByPrefix } = require('../utility/ttlCache');

const ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const ATTENDANCE_SUMMARY_CACHE_MS = Number(process.env.ATTENDANCE_SUMMARY_CACHE_MS || 30 * 1000);

function toDateString(dateObj) {
	const year = dateObj.getUTCFullYear();
	const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
	const day = String(dateObj.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getTodayDateString() {
	return toDateString(new Date());
}

function parseDateInput(value) {
	const text = String(value || '').trim();
	if (!text) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
	if (month < 1 || month > 12) return null;
	if (day < 1 || day > 31) return null;

	const parsed = new Date(Date.UTC(year, month - 1, day));
	if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
		return null;
	}

	return toDateString(parsed);
}

function getCurrentMonthValue() {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
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

function parseMonthBounds(value) {
	const text = String(value || '').trim();
	const match = /^(\d{4})-(\d{2})$/.exec(text);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
	if (month < 1 || month > 12) return null;

	const start = new Date(Date.UTC(year, month - 1, 1));
	const end = new Date(Date.UTC(year, month, 0));

	return {
		month: text,
		startDate: toDateString(start),
		endDate: toDateString(end),
	};
}

async function getTeacherClassOrThrow(classId, teacherId, res) {
	const targetClass = await dbClass.getClassByIdQuery(classId);
	if (!targetClass) {
		res.status(404).json({ error: 'Class not found' });
		return null;
	}

	if (targetClass.teacher_id !== teacherId) {
		res.status(403).json({ error: 'Unauthorized' });
		return null;
	}

	return targetClass;
}

async function getClassAttendance(req, res) {
	const { classId } = req.params;
	const requestedDate = req.query?.date;
	const selectedDate = requestedDate ? parseDateInput(requestedDate) : getTodayDateString();

	if (requestedDate && !selectedDate) {
		return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
	}

	try {
		const targetClass = await getTeacherClassOrThrow(classId, req.user.id, res);
		if (!targetClass) return;

		const roster = await dbEnroll.getClassRosterQuery(classId);
		const attendanceRows = await db.getClassAttendance(classId, selectedDate);
		const attendanceMap = new Map();
		attendanceRows.forEach((row) => {
			attendanceMap.set(row.student_id, row.status);
		});

		const attendanceData = roster.map((student) => ({
			studentId: student.student_id,
			name: student.username,
			status: attendanceMap.get(student.student_id) || 'present',
			isRecorded: attendanceMap.has(student.student_id),
		}));

		res.json({
			date: selectedDate,
			hasRecordedAttendance: attendanceRows.length > 0,
			attendance: attendanceData,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function markBulkAttendance(req, res) {
	const { classId } = req.params;
	const requestedDate = req.body?.date;
	const selectedDate = requestedDate ? parseDateInput(requestedDate) : getTodayDateString();
	if (requestedDate && !selectedDate) {
		return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
	}

	const attendance = req.body?.attendance;
	if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
		return res.status(400).json({ error: 'Invalid attendance data' });
	}

	try {
		const targetClass = await getTeacherClassOrThrow(classId, req.user.id, res);
		if (!targetClass) return;

		const roster = await dbEnroll.getClassRosterQuery(classId);
		const rosterIds = new Set(roster.map((student) => student.student_id));
		const normalizedMap = new Map();

		for (const record of attendance) {
			const studentId = String(record?.studentId || '').trim();
			const status = String(record?.status || '').trim().toLowerCase();

			if (!isUuid(studentId)) {
				return res.status(400).json({ error: `Invalid student id format: ${studentId || 'missing value'}` });
			}

			if (!ATTENDANCE_STATUSES.has(status)) {
				return res.status(400).json({
					error: `Invalid attendance status for student ${studentId}. Allowed: present, absent, late, excused.`,
				});
			}

			if (!rosterIds.has(studentId)) {
				return res.status(400).json({
					error: `Student ${studentId} is not enrolled in this class.`,
				});
			}

			normalizedMap.set(studentId, status);
		}

		const queries = Array.from(normalizedMap.entries()).map(([studentId, status]) =>
			db.markBulkAttendance(classId, studentId, status, selectedDate),
		);
		await Promise.all(queries);

		deleteCacheByPrefix(`attendance-summary:${classId}:`);
		deleteCacheByPrefix('parent-overview:');
		if (targetClass.institute_id) {
			deleteCacheByPrefix(`admin-risk:${targetClass.institute_id}`);
		}

		res.json({
			message: 'Attendance saved successfully',
			date: selectedDate,
			savedCount: normalizedMap.size,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getClassAttendanceSummary(req, res) {
	const { classId } = req.params;
	const requestedMonth = req.query?.month || getCurrentMonthValue();
	const monthBounds = parseMonthBounds(requestedMonth);

	if (!monthBounds) {
		return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
	}

	const cacheKey = `attendance-summary:${classId}:${monthBounds.month}`;
	if (!shouldBypassCache(req)) {
		const cached = getCacheValue(cacheKey);
		if (cached) {
			return res.status(200).json(cached);
		}
	}

	try {
		const targetClass = await getTeacherClassOrThrow(classId, req.user.id, res);
		if (!targetClass) return;

		const rows = await db.getClassAttendanceSummary(
			classId,
			monthBounds.startDate,
			monthBounds.endDate,
		);

		const summary = rows.map((row) => {
			const recordedDays = Number(row.recorded_days || 0);
			const presentCount = Number(row.present_count || 0);
			const absentCount = Number(row.absent_count || 0);
			const lateCount = Number(row.late_count || 0);
			const excusedCount = Number(row.excused_count || 0);
			const attendanceRate = recordedDays > 0
				? Math.round((presentCount / recordedDays) * 100)
				: null;

			let riskLevel = 'no_data';
			if (recordedDays >= 3) {
				if (attendanceRate < 75 || absentCount >= 4) {
					riskLevel = 'high';
				} else if (attendanceRate < 85 || absentCount >= 2 || lateCount >= 3) {
					riskLevel = 'medium';
				} else {
					riskLevel = 'low';
				}
			}

			return {
				studentId: row.student_id,
				name: row.username,
				recordedDays,
				present: presentCount,
				absent: absentCount,
				late: lateCount,
				excused: excusedCount,
				attendanceRate,
				riskLevel,
			};
		});

		const stats = {
			totalStudents: summary.length,
			highRisk: summary.filter((item) => item.riskLevel === 'high').length,
			mediumRisk: summary.filter((item) => item.riskLevel === 'medium').length,
			lowRisk: summary.filter((item) => item.riskLevel === 'low').length,
			noData: summary.filter((item) => item.riskLevel === 'no_data').length,
		};

		const payload = {
			classId,
			month: monthBounds.month,
			startDate: monthBounds.startDate,
			endDate: monthBounds.endDate,
			stats,
			summary,
		};

		setCacheValue(cacheKey, payload, ATTENDANCE_SUMMARY_CACHE_MS);
		return res.status(200).json(payload);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
}

module.exports = { getClassAttendance, markBulkAttendance, getClassAttendanceSummary };
