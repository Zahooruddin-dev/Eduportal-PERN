const pool = require('./Pool');

async function markBulkAttendance(classId, studentId, status, date) {
    const { rows } = await pool.query(
        `INSERT INTO attendance (class_id, student_id, status, date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, class_id, date) DO UPDATE
         SET status = EXCLUDED.status, updated_at = NOW()
         RETURNING *`,
        [classId, studentId, status, date]
    );
    return rows[0];
}

async function getClassAttendance(classId, date) {
    const { rows } = await pool.query(
        `SELECT student_id, status FROM attendance WHERE class_id = $1 AND date = $2`,
        [classId, date]
    );
    return rows;
}

async function getClassAttendanceSummary(classId, startDate, endDate) {
    const { rows } = await pool.query(
        `SELECT
            e.student_id,
            u.username,
            COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0)::int AS present_count,
            COALESCE(SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END), 0)::int AS absent_count,
            COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0)::int AS late_count,
            COALESCE(SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END), 0)::int AS excused_count,
            COUNT(a.student_id)::int AS recorded_days
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
         LEFT JOIN attendance a
         	ON a.class_id = e.class_id
         	AND a.student_id = e.student_id
         	AND a.date BETWEEN $2::date AND $3::date
         WHERE e.class_id = $1
         GROUP BY e.student_id, u.username
         ORDER BY u.username ASC`,
        [classId, startDate, endDate],
    );

    return rows;
}

module.exports = {
    markBulkAttendance,
    getClassAttendance,
    getClassAttendanceSummary,
};