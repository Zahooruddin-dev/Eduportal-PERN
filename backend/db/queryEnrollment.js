const pool = require('./Pool');

const DATA_POLICIES = new Set(['keep', 'delete_grades', 'delete_all']);

function normalizeDataPolicy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!DATA_POLICIES.has(normalized)) return 'keep';
  return normalized;
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function getClassRosterQuery(classId) {
  const { rows } = await pool.query(
    `SELECT 
        users.id AS student_id, 
        users.username,
        users.email,
        users.profile_pic,
        classes.class_name,
        enrollments.enrollment_date
     FROM classes
     JOIN enrollments ON classes.id = enrollments.class_id
     JOIN users ON enrollments.student_id = users.id
     WHERE classes.id = $1 AND users.role = 'student'`,
    [classId],
  );
  return rows;
}

async function getEnrollmentStatusQuery(classId, studentId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM class_enrollment_status
     WHERE class_id = $1 AND student_id = $2`,
    [classId, studentId],
  );
  return rows[0] || null;
}

async function upsertEnrollmentStatusQuery({
  classId,
  studentId,
  status,
  dataPolicy,
  note,
  updatedBy,
  client,
}) {
  const executor = client || pool;
  const normalizedDataPolicy = normalizeDataPolicy(dataPolicy);

  const { rows } = await executor.query(
    `INSERT INTO class_enrollment_status (
       class_id,
       student_id,
       status,
       data_policy,
       note,
       updated_by,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (class_id, student_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       data_policy = EXCLUDED.data_policy,
       note = EXCLUDED.note,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [
      classId,
      studentId,
      status,
      normalizedDataPolicy,
      note || null,
      updatedBy || null,
    ],
  );

  return rows[0];
}

async function enrollStudentQuery(studentId, classId) {
  const { rows } = await pool.query(
    `INSERT INTO enrollments (student_id, class_id)
     VALUES ($1, $2)
     RETURNING *`,
    [studentId, classId],
  );

  await upsertEnrollmentStatusQuery({
    classId,
    studentId,
    status: 'active',
    dataPolicy: 'keep',
    note: null,
    updatedBy: null,
  });

  return rows[0];
}

async function getStudentScheduleQuery(studentId) {
  const { rows } = await pool.query(
    `SELECT 
        users.username as student_name,
        classes.id as id,
        classes.id as class_id,
        classes.class_name,
        classes.schedule_days,
        classes.start_time,
        classes.end_time,
        classes.schedule_blocks,
        classes.schedule_timezone,
        classes.meeting_link,
        classes.subject,
        classes.room_number,
        classes.grade_level,
        teacher.username AS teacher_name,
        teacher.profile_pic AS teacher_profile_pic,
        enrollments.enrollment_date
     FROM users
     JOIN enrollments ON users.id = enrollments.student_id
     JOIN classes ON enrollments.class_id = classes.id
     LEFT JOIN users AS teacher ON teacher.id = classes.teacher_id
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

async function removeStudentFromClassQuery({
  classId,
  studentId,
  teacherId,
  actionType,
  dataPolicy,
  note,
}) {
  const status = actionType === 'ban' ? 'banned' : 'kicked';
  const normalizedDataPolicy = normalizeDataPolicy(dataPolicy);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const membership = await upsertEnrollmentStatusQuery({
      classId,
      studentId,
      status,
      dataPolicy: normalizedDataPolicy,
      note,
      updatedBy: teacherId,
      client,
    });

    const unenrolled = await client.query(
      `DELETE FROM enrollments
       WHERE student_id = $1 AND class_id = $2`,
      [studentId, classId],
    );

    let deletedGrades = 0;
    let deletedAttendance = 0;
    let deletedSubmissions = 0;

    const gradesExists = await tableExists(client, 'grades');
    if (gradesExists && (normalizedDataPolicy === 'delete_grades' || normalizedDataPolicy === 'delete_all')) {
      const gradeResult = await client.query(
        `DELETE FROM grades
         WHERE class_id::text = $1::text
           AND student_id::text = $2::text`,
        [classId, studentId],
      );
      deletedGrades = gradeResult.rowCount;
    }

    if (normalizedDataPolicy === 'delete_all') {
      const attendanceExists = await tableExists(client, 'attendance');
      if (attendanceExists) {
        const attendanceResult = await client.query(
          `DELETE FROM attendance
           WHERE class_id = $1 AND student_id = $2`,
          [classId, studentId],
        );
        deletedAttendance = attendanceResult.rowCount;
      }

      const assignmentsExists = await tableExists(client, 'assignments');
      const submissionsExists = await tableExists(client, 'assignment_submissions');
      if (assignmentsExists && submissionsExists) {
        const submissionsResult = await client.query(
          `DELETE FROM assignment_submissions s
           USING assignments a
           WHERE s.assignment_id = a.id
             AND a.class_id = $1
             AND s.student_id = $2`,
          [classId, studentId],
        );
        deletedSubmissions = submissionsResult.rowCount;
      }
    }

    await client.query('COMMIT');

    return {
      membership,
      unenrolledCount: unenrolled.rowCount,
      deletedGrades,
      deletedAttendance,
      deletedSubmissions,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listRemovedStudentsByClassQuery(classId) {
  const { rows } = await pool.query(
    `SELECT
        s.class_id,
        s.student_id,
        s.status,
        s.data_policy,
        s.note,
        s.updated_at,
        u.username,
        u.email,
        u.profile_pic,
        EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.class_id = s.class_id AND e.student_id = s.student_id
        ) AS currently_enrolled
     FROM class_enrollment_status s
     JOIN users u ON u.id = s.student_id
     WHERE s.class_id = $1
       AND s.status IN ('kicked', 'banned')
     ORDER BY s.updated_at DESC`,
    [classId],
  );
  return rows;
}

async function unbanStudentQuery({ classId, studentId, teacherId, note }) {
  return upsertEnrollmentStatusQuery({
    classId,
    studentId,
    status: 'active',
    dataPolicy: 'keep',
    note,
    updatedBy: teacherId,
  });
}

async function getStudentProfileForClassQuery(classId, studentId) {
  const [studentResult, enrolledClassesResult, statusResult] = await Promise.all([
    pool.query(
      `SELECT id, username, email, profile_pic, role, created_at
       FROM users
       WHERE id = $1`,
      [studentId],
    ),
    pool.query(
      `SELECT
          c.id,
          c.class_name,
          c.subject,
          c.grade_level,
          c.schedule_days,
          c.start_time,
          c.end_time,
          c.schedule_blocks,
          c.meeting_link,
          c.schedule_timezone,
          e.enrollment_date
       FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       WHERE e.student_id = $1
       ORDER BY c.class_name ASC`,
      [studentId],
    ),
    pool.query(
      `SELECT status, data_policy, note, updated_at
       FROM class_enrollment_status
       WHERE class_id = $1 AND student_id = $2`,
      [classId, studentId],
    ),
  ]);

  return {
    student: studentResult.rows[0] || null,
    enrolledClasses: enrolledClassesResult.rows,
    classStatus: statusResult.rows[0] || null,
  };
}

async function getBannedClassIdsForStudentQuery(studentId) {
  const { rows } = await pool.query(
    `SELECT class_id
     FROM class_enrollment_status
     WHERE student_id = $1 AND status IN ('banned', 'kicked')`,
    [studentId],
  );
  return rows.map((row) => row.class_id);
}

module.exports = {
  enrollStudentQuery,
  getClassRosterQuery,
  getStudentScheduleQuery,
  getEnrollmentStatusQuery,
  upsertEnrollmentStatusQuery,
  unenrollStudentQuery,
  removeStudentFromClassQuery,
  listRemovedStudentsByClassQuery,
  unbanStudentQuery,
  getStudentProfileForClassQuery,
  getBannedClassIdsForStudentQuery,
};