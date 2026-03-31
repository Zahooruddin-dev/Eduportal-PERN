const pool = require('../db/Pool');
const authDb = require('../db/queryAuth');

function withSafeLinkedStudent(parentProfile, linkedStudent) {
	return {
		...parentProfile,
		child_student_id: linkedStudent?.id || null,
		linked_student_username: linkedStudent?.username || null,
		linked_student_email: linkedStudent?.email || null,
		linked_student_profile_pic: linkedStudent?.profile_pic || null,
	};
}

function toDateOnly(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

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
		const rawParentProfile = await authDb.getParentProfileByUserId(req.user.id);
		if (!rawParentProfile) {
			return res.status(404).json({ message: 'Parent profile not found.' });
		}
		const parentProfile = withSafeLinkedStudent(rawParentProfile, null);

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

		const instituteScopedParentProfile = withSafeLinkedStudent(parentProfile, linkedStudent);

		const [
			scheduleResult,
			gradesResult,
			attendanceByStatusResult,
			attendanceByClassResult,
			weeklyAttendanceByDayResult,
			weeklyGradesResult,
		] = await Promise.all([
			pool.query(
				`SELECT
					u.username AS student_name,
					c.id,
					c.id AS class_id,
					c.class_name,
					c.schedule_days,
					c.start_time,
					c.end_time,
					c.schedule_blocks,
					c.schedule_timezone,
					c.meeting_link,
					c.subject,
					c.room_number,
					c.grade_level,
					teacher.username AS teacher_name,
					e.enrollment_date
				 FROM enrollments e
				 JOIN classes c ON c.id = e.class_id
				 JOIN users u ON u.id = e.student_id
				 LEFT JOIN users teacher ON teacher.id = c.teacher_id
				 WHERE e.student_id = $1
				 AND c.institute_id = $2
				 ORDER BY c.class_name ASC`,
				[linkedStudent.id, req.user.instituteId],
			),
			pool.query(
				`SELECT
					g.id,
					g.class_id,
					g.teacher_id,
					g.student_id,
					g.assignment_id,
					g.grade,
					g.max_grade,
					g.grade_type,
					g.feedback,
					g.released,
					g.created_at,
					COALESCE(c.class_name, g.class_id) AS class_name,
					COALESCE(t.username, '') AS teacher_name
				 FROM grades g
				 LEFT JOIN classes c ON c.id::text = g.class_id
				 LEFT JOIN users t ON t.id::text = g.teacher_id
				 WHERE g.student_id = $1
				 AND g.released = true
				 AND c.institute_id = $2
				 ORDER BY g.created_at DESC`,
				[linkedStudent.id, req.user.instituteId],
			),
			pool.query(
				`SELECT status, COUNT(*)::int AS count
				 FROM attendance a
				 JOIN classes c ON c.id = a.class_id
				 WHERE a.student_id = $1
				 AND c.institute_id = $2
				 GROUP BY status`,
				[linkedStudent.id, req.user.instituteId],
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
				 JOIN classes c ON c.id = a.class_id
				 WHERE a.student_id = $1
				 AND c.institute_id = $2
				 GROUP BY a.class_id, c.class_name
				 ORDER BY c.class_name ASC`,
				[linkedStudent.id, req.user.instituteId],
			),
			pool.query(
				`SELECT
					a.date,
					SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
					SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
					SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)::int AS late_count,
					SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END)::int AS excused_count,
					COUNT(*)::int AS total_count
				 FROM attendance a
				 JOIN classes c ON c.id = a.class_id
				 WHERE a.student_id = $1
				 AND c.institute_id = $2
				 AND a.date >= (CURRENT_DATE - INTERVAL '6 days')::date
				 GROUP BY a.date
				 ORDER BY a.date ASC`,
				[linkedStudent.id, req.user.instituteId],
			),
			pool.query(
				`SELECT
					g.id,
					g.class_id,
					COALESCE(c.class_name, g.class_id) AS class_name,
					g.grade,
					g.max_grade,
					g.grade_type,
					g.created_at
				 FROM grades g
				 LEFT JOIN classes c ON c.id::text = g.class_id
				 WHERE g.student_id = $1
				 AND g.released = true
				 AND c.institute_id = $2
				 AND g.created_at >= (NOW() - INTERVAL '14 days')
				 ORDER BY g.created_at DESC
				 LIMIT 8`,
				[linkedStudent.id, req.user.instituteId],
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

		const weeklyAttendanceByDay = weeklyAttendanceByDayResult.rows.map((row) => ({
			date: toDateOnly(row.date),
			present: Number(row.present_count || 0),
			absent: Number(row.absent_count || 0),
			late: Number(row.late_count || 0),
			excused: Number(row.excused_count || 0),
			total: Number(row.total_count || 0),
		}));

		const weeklyTotals = weeklyAttendanceByDay.reduce(
			(accumulator, day) => ({
				total: accumulator.total + day.total,
				present: accumulator.present + day.present,
				absent: accumulator.absent + day.absent,
				late: accumulator.late + day.late,
				excused: accumulator.excused + day.excused,
			}),
			{ total: 0, present: 0, absent: 0, late: 0, excused: 0 },
		);

		const weeklyAttendanceRate = weeklyTotals.total > 0
			? Math.round((weeklyTotals.present / weeklyTotals.total) * 100)
			: null;

		const weeklyRecentGrades = weeklyGradesResult.rows.map((row) => {
			const grade = Number(row.grade || 0);
			const maxGrade = Number(row.max_grade || 0);
			const percentage = maxGrade > 0 ? Math.round((grade / maxGrade) * 100) : null;
			return {
				id: row.id,
				classId: row.class_id,
				className: row.class_name,
				gradeType: row.grade_type,
				grade,
				maxGrade,
				percentage,
				createdAt: row.created_at,
			};
		});

		const weeklyAlerts = [];
		if (weeklyTotals.total === 0) {
			weeklyAlerts.push({
				type: 'info',
				message: 'No attendance records were captured in the last 7 days.',
			});
		} else {
			if (weeklyTotals.absent >= 2) {
				weeklyAlerts.push({
					type: 'warning',
					message: `${weeklyTotals.absent} absence entries were recorded this week.`,
				});
			}
			if (weeklyAttendanceRate !== null && weeklyAttendanceRate < 80) {
				weeklyAlerts.push({
					type: 'warning',
					message: `Weekly attendance is ${weeklyAttendanceRate}%, which is below the healthy threshold.`,
				});
			}
		}

		const lowRecentGrades = weeklyRecentGrades.filter((item) => item.percentage !== null && item.percentage < 50);
		if (lowRecentGrades.length > 0) {
			weeklyAlerts.push({
				type: 'warning',
				message: `${lowRecentGrades.length} recent grade entries were below 50%.`,
			});
		}

		return res.status(200).json({
			parentProfile: instituteScopedParentProfile,
			linkedStudent,
			schedule: scheduleResult.rows,
			grades: gradesResult.rows,
			attendanceSummary: {
				totals,
				byClass: attendanceByClassResult.rows,
			},
			weeklySnapshot: {
				startDate: toDateOnly(new Date(Date.now() - (6 * 24 * 60 * 60 * 1000))),
				endDate: toDateOnly(new Date()),
				attendanceByDay: weeklyAttendanceByDay,
				totals: weeklyTotals,
				attendanceRate: weeklyAttendanceRate,
				recentGrades: weeklyRecentGrades,
				alerts: weeklyAlerts,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getLinkedStudentOverview,
};
