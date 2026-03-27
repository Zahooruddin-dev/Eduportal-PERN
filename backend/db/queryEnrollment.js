const pool = require('./Pool');

async function getClassRosterQuery(classId) {
  const { rows } = await pool.query(
    `SELECT 
        users.id AS student_id, 
        users.username, 
        users.profile_pic,
        classes.class_name
     FROM classes
     JOIN enrollments ON classes.id = enrollments.class_id
     JOIN users ON enrollments.student_id = users.id
     WHERE classes.id = $1 AND users.role = 'student'`,
    [classId],
  );
  return rows;
}
async function enrollStudentQuery(studentId, classId) {
  const { rows } = await pool.query(
    `INSERT INTO enrollments (student_id, class_id)
     VALUES ($1, $2)
     RETURNING *`,
    [studentId, classId],
  );
  return rows[0];
}
async function getStudentScheduleQuery(studentId) {
  const { rows } = await pool.query(
    `SELECT 
        users.username as student_name,
        classes.id as class_id,
        classes.class_name,
        classes.schedule_days,
        classes.start_time,
        classes.end_time,
        enrollments.enrollment_date
     FROM users
     JOIN enrollments ON users.id = enrollments.student_id
     JOIN classes ON enrollments.class_id = classes.id
     WHERE users.id = $1`,
    [studentId],
  );
  return rows;
}


async function unenrollStudentQuery(studentId, classId) {
  const { rowCount } = await pool.query(
    `DELETE FROM enrollments
     WHERE student_id = $1 AND class_id = $2`,
    [studentId, classId],
  );
  return rowCount;
}

module.exports = {
  enrollStudentQuery,
  getClassRosterQuery,
  getStudentScheduleQuery,
  unenrollStudentQuery,
};