const db = require('../db/queryEnrollment');
const dbClass = require('../db/queryClasses');
const pool = require('../db/Pool');
const { isUuid } = require('../middleware/uuidParamMiddleware');

async function createEnrollment(req, res) {
  const { student_id, class_id } = req.body;

  if (!student_id || !class_id) {
    return res.status(400).json({ error: 'Student and Class ID are required.' });
  }

  if (!isUuid(student_id) || !isUuid(class_id)) {
    return res.status(400).json({ error: 'Invalid student_id or class_id format.' });
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

module.exports = { createEnrollment, rooster, getStudentSchedule, unenrollStudent };