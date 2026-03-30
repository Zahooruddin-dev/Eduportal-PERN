const db = require('../db/queryEnrollment');
const dbClass = require('../db/queryClasses');
const pool = require('../db/Pool');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const REMOVAL_ACTIONS = new Set(['kick', 'ban']);
const DATA_POLICIES = new Set(['keep', 'delete_grades', 'delete_all']);

async function assertTeacherOwnsClass(classId, user) {
  const classObj = await dbClass.getClassByIdQuery(classId);
  if (!classObj) {
    return { ok: false, status: 404, error: 'Class not found.' };
  }

  if (user.role !== 'admin' && classObj.teacher_id !== user.id) {
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

  if (!student_id || !class_id) {
    return res.status(400).json({ error: 'Student and Class ID are required.' });
  }

  if (!isUuid(student_id) || !isUuid(class_id)) {
    return res.status(400).json({ error: 'Invalid student_id or class_id format.' });
  }

  if (req.user.role === 'student' && req.user.id !== student_id) {
    return res.status(403).json({ error: 'You can only enroll yourself in a class.' });
  }

  try {
    const userResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [student_id]);
    const user = userResult.rows[0];

    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Valid student not found. Cannot enroll.' });
    }

    const classObj = await dbClass.getClassByIdQuery(class_id);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found.' });
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
  if (!id) {
    return res.status(400).json({ error: 'Id required to be able to get the student schedule' });
  }

  if (req.user.role === 'student' && req.user.id !== id) {
    return res.status(403).json({ error: 'You can only view your own schedule.' });
  }

  try {
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

  if (!isUuid(studentId) || !isUuid(classId)) {
    return res.status(400).json({ error: 'Invalid student or class id format.' });
  }

  try {
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'You can only unenroll yourself.' });
    }

    if (req.user.role === 'teacher') {
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
  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid student id format.' });
  }

  if (req.user.role === 'student' && req.user.id !== id) {
    return res.status(403).json({ error: 'Unauthorized to access banned class list.' });
  }

  try {
    const bannedClassIds = await db.getBannedClassIdsForStudentQuery(id);
    return res.status(200).json({ bannedClassIds });
  } catch (err) {
    console.error('getBannedClassIdsForStudent error:', err);
    return res.status(500).json({ error: 'Failed to fetch banned classes.' });
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
};