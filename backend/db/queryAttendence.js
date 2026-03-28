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

module.exports = {
    markBulkAttendance,
    getClassAttendance,
};