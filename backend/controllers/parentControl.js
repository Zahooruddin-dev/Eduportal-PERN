const pool = require('../db/Pool');
const authDb = require('../db/queryAuth');
const enrollmentDb = require('../db/queryEnrollment');
const gradesDb = require('../db/queryGrades');

function emptyOverview(parentProfile) {
	return {
		parentProfile,
		linkedStudent: null,
		schedule: [],
		grades: [],
		attendanceSummary: {
			totals: {
				total: 0,
				present: 0,
				absent: 0,
				late: 0,
				excused: 0,
			},
			byClass: [],
		},
	};
}

async function getLinkedStudentOverview(req, res) {
	if (req.user?.role !== 'parent') {
		return res.status(403).json({ message: 'Only parent accounts can access linked student data.' });
	}

	try {
		const parentProfile = await authDb.getParentProfileByUserId(req.user.id);
		if (!parentProfile) {
			return res.status(404).json({ message: 'Parent profile not found.' });
		}

		if (!parentProfile.child_student_id) {
			return res.status(200).json(emptyOverview(parentProfile));
		}

		const linkedStudentResult = await pool.query(
			`SELECT id, username, email, profile_pic, created_at
			 FROM users
			 WHERE id = $1
			 AND role = 'student'
			 AND institute_id = $2`,
			[parentProfile.child_student_id, req.user.instituteId],
		);
		const linkedStudent = linkedStudentResult.rows[0];
		if (!linkedStudent) {
			return res.status(200).json(emptyOverview(parentProfile));
		}

		const [schedule, grades, attendanceByStatusResult, attendanceByClassResult] = await Promise.all([
			enrollmentDb.getStudentScheduleQuery(linkedStudent.id),
			gradesDb.getStudentReleasedGradesQuery(linkedStudent.id, { gradeType: 'all' }),
			pool.query(
				`SELECT status, COUNT(*)::int AS count
				 FROM attendance
				 WHERE student_id = $1
				 GROUP BY status`,
				[linkedStudent.id],
			),
			pool.query(
				`SELECT
					a.class_id,
					COALESCE(c.class_name, a.class_id::text) AS class_name,
					SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
					SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
					SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)::int AS late_count,
					SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END)::int AS excused_count
				 FROM attendance a
				 LEFT JOIN classes c ON c.id = a.class_id
				 WHERE a.student_id = $1
				 GROUP BY a.class_id, c.class_name
				 ORDER BY c.class_name ASC`,
				[linkedStudent.id],
			),
		]);

		const totals = {
			total: 0,
			present: 0,
			absent: 0,
			late: 0,
			excused: 0,
		};

		for (const row of attendanceByStatusResult.rows) {
			const status = String(row.status || '').toLowerCase();
			const count = Number(row.count || 0);
			if (!Number.isFinite(count)) continue;
			totals.total += count;
			if (status === 'present' || status === 'absent' || status === 'late' || status === 'excused') {
				totals[status] = count;
			}
		}

		return res.status(200).json({
			parentProfile,
			linkedStudent,
			schedule,
			grades,
			attendanceSummary: {
				totals,
				byClass: attendanceByClassResult.rows,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getLinkedStudentOverview,
};
