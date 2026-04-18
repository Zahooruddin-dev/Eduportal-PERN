const db = require('../db/queryEnrollment');
const dbClass = require('../db/queryClasses');
const pool = require('../db/Pool');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const REMOVAL_ACTIONS = new Set(['kick', 'ban']);
const DATA_POLICIES = new Set(['keep', 'delete_grades', 'delete_all']);
const READABLE_STUDENT_ROLES = new Set(['student', 'teacher', 'admin']);

async function getStudentById(studentId) {
  const userResult = await pool.query(
    'SELECT id, role, institute_id FROM users WHERE id = $1',
    [studentId],
  );
  return userResult.rows[0] || null;
}

async function teacherCanAccessStudentSchedule({ teacherId, studentId, instituteId }) {
  const relationResult = await pool.query(
    `SELECT 1
     FROM enrollments e
     JOIN classes c ON c.id = e.class_id
     WHERE e.student_id = $1
     AND c.teacher_id = $2
     AND c.institute_id = $3
     LIMIT 1`,
    [studentId, teacherId, instituteId],
  );
  return relationResult.rows.length > 0;
}

async function teacherCanAccessStudentStatus({ teacherId, studentId, instituteId }) {
  const relationResult = await pool.query(
    `SELECT 1
     FROM class_enrollment_status ces
     JOIN classes c ON c.id = ces.class_id
     WHERE ces.student_id = $1
     AND c.teacher_id = $2
     AND c.institute_id = $3
     LIMIT 1`,
    [studentId, teacherId, instituteId],
  );
  return relationResult.rows.length > 0;
}

async function getClassEnrollmentSummary(classId) {
  const result = await pool.query(
    `SELECT
        c.max_students,
        COUNT(e.student_id)::int AS enrolled_count
     FROM classes c
     LEFT JOIN enrollments e ON e.class_id = c.id
     WHERE c.id = $1
     GROUP BY c.id, c.max_students`,
    [classId],
  );
  return result.rows[0] || null;
}

async function assertTeacherOwnsClass(classId, user) {
  const classObj = await dbClass.getClassByIdQuery(classId);
  if (!classObj) {
    return { ok: false, status: 404, error: 'Class not found.' };
  }

  if (user.role === 'admin') {
    const instituteResult = await pool.query(
      'SELECT institute_id FROM users WHERE id = $1',
      [user.id],
    );
    const adminInstituteId = instituteResult.rows[0]?.institute_id;
    if (!adminInstituteId || adminInstituteId !== classObj.institute_id) {
      return { ok: false, status: 403, error: 'Unauthorized to manage this class.' };
    }
    return { ok: true, classObj };
  }

  if (classObj.teacher_id !== user.id) {
    return { ok: false, status: 403, error: 'Unauthorized to manage this class.' };
  }

  return { ok: true, classObj };
}

function normalizeAction(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!REMOVAL_ACTIONS.has(normalized)) return null;
  return normalized;
}

function normalizeDataPolicy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!DATA_POLICIES.has(normalized)) return 'keep';
  return normalized;
}

async function createEnrollment(req, res) {
  const { student_id, class_id } = req.body;
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterInstituteId = req.user?.instituteId || null;

  if (!student_id || !class_id) {
    return res.status(400).json({ error: 'Student and Class ID are required.' });
  }

  if (!isUuid(student_id) || !isUuid(class_id)) {
    return res.status(400).json({ error: 'Invalid student_id or class_id format.' });
  }

  if (!READABLE_STUDENT_ROLES.has(requesterRole)) {
    return res.status(403).json({ error: 'Unauthorized to enroll students.' });
  }

  if (!requesterInstituteId) {
    return res.status(403).json({ error: 'Requester is not linked to an institute.' });
  }

  if (requesterRole === 'student' && req.user.id !== student_id) {
    return res.status(403).json({ error: 'You can only enroll yourself in a class.' });
  }

  try {
    const user = await getStudentById(student_id);

    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Valid student not found. Cannot enroll.' });
    }

    const classObj = await dbClass.getClassByIdQuery(class_id);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    if (
      user.institute_id !== classObj.institute_id
      || requesterInstituteId !== classObj.institute_id
      || requesterInstituteId !== user.institute_id
    ) {
      return res.status(403).json({ error: 'Cannot enroll outside your institute.' });
    }

    if (requesterRole === 'teacher' && classObj.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only enroll students in their own classes.' });
    }

    const enrollmentSummary = await getClassEnrollmentSummary(class_id);
    const maxStudents = Number(enrollmentSummary?.max_students || 0);
    const enrolledCount = Number(enrollmentSummary?.enrolled_count || 0);
    if (maxStudents > 0 && enrolledCount >= maxStudents) {
      return res.status(409).json({ error: 'Class is at maximum capacity.' });
    }

    const status = await db.getEnrollmentStatusQuery(class_id, student_id);
    if (status?.status === 'banned' || status?.status === 'kicked') {
      return res.status(403).json({ error: 'You are not currently allowed to enroll in this class.' });
    }

    const enrollment = await db.enrollStudentQuery(student_id, class_id);
    res.status(201).json({ message: 'Enrollment successful', data: enrollment });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'You are already enrolled in this class' });
    }
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }
    console.error('createEnrollment error:', err);
    res.status(500).json({ error: 'Failed to create enrollment.' });
  }
}

async function rooster(req, res) {
  try {
    const access = await assertTeacherOwnsClass(req.params.id, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const roster = await db.getClassRosterQuery(req.params.id);
    res.json(roster);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid class id format.' });
    }
    console.error('rooster error:', err);
    res.status(500).json({ error: 'Failed to fetch class roster.' });
  }
}

async function getStudentSchedule(req, res) {
  const { id } = req.params;
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterInstituteId = req.user?.instituteId || null;

  if (!id) {
    return res.status(400).json({ error: 'Id required to be able to get the student schedule' });
  }

  try {
    if (!READABLE_STUDENT_ROLES.has(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized to access student schedule.' });
    }

    const targetStudent = await getStudentById(id);
    if (!targetStudent || targetStudent.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (requesterRole === 'student') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'You can only view your own schedule.' });
      }
    } else {
      if (!requesterInstituteId || requesterInstituteId !== targetStudent.institute_id) {
        return res.status(403).json({ error: 'Unauthorized to access this student schedule.' });
      }

      if (requesterRole === 'teacher') {
        const allowed = await teacherCanAccessStudentSchedule({
          teacherId: req.user.id,
          studentId: id,
          instituteId: requesterInstituteId,
        });
        if (!allowed) {
          return res.status(403).json({ error: 'Unauthorized to access this student schedule.' });
        }
      }
    }

    const schedule = await db.getStudentScheduleQuery(id);
    res.status(200).json(schedule);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid student id format.' });
    }
    console.error('getStudentSchedule error:', err);
    res.status(500).json({ error: 'Failed to fetch student schedule.' });
  }
}

async function unenrollStudent(req, res) {
  const { studentId, classId } = req.params;
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterInstituteId = req.user?.instituteId || null;

  if (!isUuid(studentId) || !isUuid(classId)) {
    return res.status(400).json({ error: 'Invalid student or class id format.' });
  }

  try {
    if (!READABLE_STUDENT_ROLES.has(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized to unenroll students.' });
    }

    const classObj = await dbClass.getClassByIdQuery(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const targetStudent = await getStudentById(studentId);
    if (!targetStudent || targetStudent.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (
      !requesterInstituteId
      || requesterInstituteId !== classObj.institute_id
      || requesterInstituteId !== targetStudent.institute_id
    ) {
      return res.status(403).json({ error: 'Unauthorized to manage this enrollment.' });
    }

    if (requesterRole === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'You can only unenroll yourself.' });
    }

    if (requesterRole === 'teacher') {
      const access = await assertTeacherOwnsClass(classId, req.user);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }
    }

    const deleted = await db.unenrollStudentQuery(studentId, classId);
    if (!deleted) {
      return res.status(404).json({ error: 'Enrollment not found.' });
    }
    res.status(200).json({ message: 'Unenrolled successfully.' });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }
    console.error('unenrollStudent error:', err);
    res.status(500).json({ error: 'Failed to unenroll student.' });
  }
}

async function removeStudentFromClass(req, res) {
  const { classId, studentId } = req.params;
  const action = normalizeAction(req.body?.action || req.body?.action_type);
  const dataPolicy = normalizeDataPolicy(req.body?.data_policy);
  const note = req.body?.note ? String(req.body.note).trim() : null;

  if (!isUuid(classId) || !isUuid(studentId)) {
    return res.status(400).json({ error: 'Invalid student or class id format.' });
  }

  if (!action) {
    return res.status(400).json({ error: 'Action must be either kick or ban.' });
  }

  if (note && note.length > 1000) {
    return res.status(400).json({ error: 'Note cannot exceed 1000 characters.' });
  }

  try {
    const access = await assertTeacherOwnsClass(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const userResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [studentId]);
    const targetStudent = userResult.rows[0];
    if (!targetStudent || targetStudent.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const result = await db.removeStudentFromClassQuery({
      classId,
      studentId,
      teacherId: req.user.id,
      actionType: action,
      dataPolicy,
      note,
    });

    return res.status(200).json({
      message: action === 'ban' ? 'Student banned successfully.' : 'Student removed successfully.',
      action,
      data_policy: dataPolicy,
      summary: {
        unenrolled_count: result.unenrolledCount,
        deleted_grades: result.deletedGrades,
        deleted_attendance: result.deletedAttendance,
        deleted_submissions: result.deletedSubmissions,
      },
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }
    console.error('removeStudentFromClass error:', err);
    return res.status(500).json({ error: 'Failed to update student enrollment status.' });
  }
}

async function listRemovedStudents(req, res) {
  const { classId } = req.params;

  if (!isUuid(classId)) {
    return res.status(400).json({ error: 'Invalid class id format.' });
  }

  try {
    const access = await assertTeacherOwnsClass(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const rows = await db.listRemovedStudentsByClassQuery(classId);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('listRemovedStudents error:', err);
    return res.status(500).json({ error: 'Failed to fetch removed students.' });
  }
}

async function unbanStudent(req, res) {
  const { classId, studentId } = req.params;
  const note = req.body?.note ? String(req.body.note).trim() : null;

  if (!isUuid(classId) || !isUuid(studentId)) {
    return res.status(400).json({ error: 'Invalid student or class id format.' });
  }

  if (note && note.length > 1000) {
    return res.status(400).json({ error: 'Note cannot exceed 1000 characters.' });
  }

  try {
    const access = await assertTeacherOwnsClass(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const updated = await db.unbanStudentQuery({
      classId,
      studentId,
      teacherId: req.user.id,
      note,
    });

    return res.status(200).json({
      message: 'Student can enroll in this class again.',
      status: updated?.status || 'active',
    });
  } catch (err) {
    console.error('unbanStudent error:', err);
    return res.status(500).json({ error: 'Failed to unban student.' });
  }
}

async function getStudentProfileForClass(req, res) {
  const { classId, studentId } = req.params;

  if (!isUuid(classId) || !isUuid(studentId)) {
    return res.status(400).json({ error: 'Invalid student or class id format.' });
  }

  try {
    const access = await assertTeacherOwnsClass(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const profile = await db.getStudentProfileForClassQuery(classId, studentId);
    if (!profile.student || profile.student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    return res.status(200).json(profile);
  } catch (err) {
    console.error('getStudentProfileForClass error:', err);
    return res.status(500).json({ error: 'Failed to fetch student profile.' });
  }
}

async function getBannedClassIdsForStudent(req, res) {
  const { id } = req.params;
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterInstituteId = req.user?.instituteId || null;

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid student id format.' });
  }

  try {
    if (!READABLE_STUDENT_ROLES.has(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized to access banned class list.' });
    }

    const targetStudent = await getStudentById(id);
    if (!targetStudent || targetStudent.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (requesterRole === 'student') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Unauthorized to access banned class list.' });
      }
    } else {
      if (!requesterInstituteId || requesterInstituteId !== targetStudent.institute_id) {
        return res.status(403).json({ error: 'Unauthorized to access banned class list.' });
      }

      if (requesterRole === 'teacher') {
        const allowed = await teacherCanAccessStudentStatus({
          teacherId: req.user.id,
          studentId: id,
          instituteId: requesterInstituteId,
        });
        if (!allowed) {
          return res.status(403).json({ error: 'Unauthorized to access banned class list.' });
        }
      }
    }

    const bannedClassIds = await db.getBannedClassIdsForStudentQuery(id);
    return res.status(200).json({ bannedClassIds });
  } catch (err) {
    console.error('getBannedClassIdsForStudent error:', err);
    return res.status(500).json({ error: 'Failed to fetch banned classes.' });
  }
}

async function getStudentEnrollmentOverview(req, res) {
  const { id } = req.params;
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterInstituteId = req.user?.instituteId || null;

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid student id format.' });
  }

  try {
    if (!READABLE_STUDENT_ROLES.has(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized to access enrollment overview.' });
    }

    const targetStudent = await getStudentById(id);
    if (!targetStudent || targetStudent.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (requesterRole === 'student') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Unauthorized to access enrollment overview.' });
      }
    } else {
      if (!requesterInstituteId || requesterInstituteId !== targetStudent.institute_id) {
        return res.status(403).json({ error: 'Unauthorized to access enrollment overview.' });
      }

      if (requesterRole === 'teacher') {
        const [canReadSchedule, canReadStatus] = await Promise.all([
          teacherCanAccessStudentSchedule({
            teacherId: req.user.id,
            studentId: id,
            instituteId: requesterInstituteId,
          }),
          teacherCanAccessStudentStatus({
            teacherId: req.user.id,
            studentId: id,
            instituteId: requesterInstituteId,
          }),
        ]);

        if (!canReadSchedule && !canReadStatus) {
          return res.status(403).json({ error: 'Unauthorized to access enrollment overview.' });
        }
      }
    }

    const [enrolledClasses, bannedClassIds, classesInInstitute] = await Promise.all([
      db.getStudentScheduleQuery(id),
      db.getBannedClassIdsForStudentQuery(id),
      dbClass.getAllClassesQuery(targetStudent.institute_id),
    ]);

    const enrolledClassIds = new Set(
      enrolledClasses.map((classItem) => classItem.class_id || classItem.id),
    );
    const bannedClassIdSet = new Set(bannedClassIds);
    const availableClasses = classesInInstitute.filter(
      (classItem) =>
        !enrolledClassIds.has(classItem.id) && !bannedClassIdSet.has(classItem.id),
    );

    return res.status(200).json({
      enrolledClasses,
      bannedClassIds,
      availableClasses,
    });
  } catch (err) {
    console.error('getStudentEnrollmentOverview error:', err);
    return res.status(500).json({ error: 'Failed to load enrollment overview.' });
  }
}

module.exports = {
  createEnrollment,
  rooster,
  getStudentSchedule,
  unenrollStudent,
  removeStudentFromClass,
  listRemovedStudents,
  unbanStudent,
  getStudentProfileForClass,
  getBannedClassIdsForStudent,
	getStudentEnrollmentOverview,
};