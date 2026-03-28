const db = require('../db/queryAttendence');
const dbClass = require('../db/queryClasses');
const dbEnroll = require('../db/queryEnrollment');

async function getClassAttendance(req, res) {
	const { classId } = req.params;
	const { date } = req.query; // optional: defaults to today
	const today = new Date().toISOString().split('T')[0];
	const selectedDate = date || today;

	try {
		// Verify teacher has access to this class (optional, but good)
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== req.user.id) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		// Fetch the roster
		const roster = await dbEnroll.getClassRosterQuery(classId);
		// Fetch existing attendance for the date
		const attendanceRows = await db.getClassAttendance(classId, selectedDate);
		const attendanceMap = new Map();
		attendanceRows.forEach((row) => {
			attendanceMap.set(row.student_id, row.status);
		});

		// Merge: for each student, add status (default to 'present' if not set)
		const attendanceData = roster.map((student) => ({
			studentId: student.student_id,
			name: student.username,
			status: attendanceMap.get(student.student_id) || 'present',
		}));

		res.json({ date: selectedDate, attendance: attendanceData });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function markBulkAttendance(req, res) {
	const { classId } = req.params;
	const { date, attendance } = req.body; // attendance: [{ studentId, status }]
	if (!attendance || !Array.isArray(attendance)) {
		return res.status(400).json({ error: 'Invalid attendance data' });
	}

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== req.user.id) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const queries = attendance.map((record) =>
			db.markBulkAttendance(classId, record.studentId, record.status, date),
		);
		await Promise.all(queries);
		res.json({ message: 'Attendance saved successfully' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

module.exports = { getClassAttendance, markBulkAttendance };
