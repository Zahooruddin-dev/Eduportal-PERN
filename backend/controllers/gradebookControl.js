const pool = require('../db/Pool');
const db = require('../db/queryGrades');
const dbClass = require('../db/queryClasses');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const ALLOWED_GRADE_TYPES = new Set([
  'all',
  'assignment',
  'exam',
  'quiz',
  'manual',
  'csv',
]);

function normalizeGradeType(value, defaultValue = 'all') {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (!ALLOWED_GRADE_TYPES.has(normalized)) return null;
  return normalized;
}

function parseNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

async function assertClassOwnership(classId, user) {
  const targetClass = await dbClass.getClassByIdQuery(classId);
  if (!targetClass) {
    return { ok: false, status: 404, error: 'Class not found.' };
  }

  if (user.role !== 'admin' && targetClass.teacher_id !== user.id) {
    return { ok: false, status: 403, error: 'Unauthorized to manage this class.' };
  }

  return { ok: true };
}

function normalizeGradeEntries(grades) {
  if (!Array.isArray(grades) || grades.length === 0) {
    return { ok: false, error: 'Grades must be a non-empty array.' };
  }

  const normalized = [];

  for (let index = 0; index < grades.length; index += 1) {
    const item = grades[index] || {};
    const studentId = String(item.student_id || '').trim();
    if (!isUuid(studentId)) {
      return {
        ok: false,
        error: `Invalid student_id at row ${index + 1}.`,
      };
    }

    const gradeValue = parseNumber(item.grade);
    if (gradeValue === null || gradeValue < 0) {
      return {
        ok: false,
        error: `Invalid grade at row ${index + 1}.`,
      };
    }

    const maxGradeRaw =
      item.max_grade === undefined || item.max_grade === null || item.max_grade === ''
        ? 100
        : item.max_grade;
    const maxGrade = parseNumber(maxGradeRaw);
    if (maxGrade === null || maxGrade <= 0) {
      return {
        ok: false,
        error: `Invalid max_grade at row ${index + 1}.`,
      };
    }

    const gradeType = normalizeGradeType(item.grade_type, 'exam');
    if (!gradeType || gradeType === 'all') {
      return {
        ok: false,
        error: `Invalid grade_type at row ${index + 1}.`,
      };
    }

    const assignmentId = item.assignment_id ? String(item.assignment_id).trim() : null;
    if (assignmentId && !isUuid(assignmentId)) {
      return {
        ok: false,
        error: `Invalid assignment_id at row ${index + 1}.`,
      };
    }

    normalized.push({
      student_id: studentId,
      grade: gradeValue,
      max_grade: maxGrade,
      grade_type: gradeType,
      assignment_id: assignmentId,
      feedback: item.feedback ? String(item.feedback).trim() : '',
      released: Boolean(item.released),
    });
  }

  return { ok: true, grades: normalized };
}

async function persistGrades(classId, teacherId, grades) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await db.insertGradesQuery(client, classId, teacherId, grades);
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function parseCsvRows(csvText) {
  const rows = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) return [];

  let startIndex = 0;
  const firstParts = rows[0].split(',').map((part) => part.trim().toLowerCase());
  if (firstParts[0] === 'student_id' || firstParts[0] === 'studentid') {
    startIndex = 1;
  }

  const parsed = [];
  for (let index = startIndex; index < rows.length; index += 1) {
    const parts = rows[index].split(',').map((part) => part.trim());
    if (!parts[0] || !parts[1]) continue;

    parsed.push({
      student_id: parts[0],
      grade: parts[1],
      max_grade: parts[2] || 100,
      grade_type: parts[3] || 'exam',
      feedback: parts.slice(4).join(','),
    });
  }

  return parsed;
}

async function getGradesForClass(req, res) {
  const { classId } = req.params;
  const gradeType = normalizeGradeType(req.query.type, 'all');
  if (!gradeType) {
    return res.status(400).json({ error: 'Invalid grade type filter.' });
  }

  const releasedFilter =
    req.query.released === undefined ? 'all' : String(req.query.released).toLowerCase();
  if (!['all', 'true', 'false'].includes(releasedFilter)) {
    return res.status(400).json({ error: 'Invalid released filter.' });
  }

  try {
    const access = await assertClassOwnership(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const rows = await db.getGradesForClassQuery(classId, {
      gradeType,
      released: releasedFilter,
    });

    return res.status(200).json(rows);
  } catch (error) {
    console.error('getGradesForClass error:', error);
    return res.status(500).json({ error: 'Failed to fetch grades.' });
  }
}

async function insertGrades(req, res) {
  const { class_id: classId, grades } = req.body;
  if (!isUuid(String(classId || ''))) {
    return res.status(400).json({ error: 'Invalid class_id format.' });
  }

  try {
    const access = await assertClassOwnership(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const normalized = normalizeGradeEntries(grades);
    if (!normalized.ok) {
      return res.status(400).json({ error: normalized.error });
    }

    const inserted = await persistGrades(classId, req.user.id, normalized.grades);
    return res.status(201).json({ inserted });
  } catch (error) {
    console.error('insertGrades error:', error);
    return res.status(500).json({ error: 'Failed to insert grades.' });
  }
}

async function uploadCsv(req, res) {
  const { csv, class_id: classId } = req.body;
  if (!isUuid(String(classId || ''))) {
    return res.status(400).json({ error: 'Invalid class_id format.' });
  }

  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'CSV content is required.' });
  }

  try {
    const access = await assertClassOwnership(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const rawRows = parseCsvRows(csv);
    const normalized = normalizeGradeEntries(rawRows);
    if (!normalized.ok) {
      return res.status(400).json({ error: normalized.error });
    }

    const inserted = await persistGrades(classId, req.user.id, normalized.grades);
    return res.status(201).json({ inserted });
  } catch (error) {
    console.error('uploadCsv error:', error);
    return res.status(500).json({ error: 'Failed to upload grades CSV.' });
  }
}

async function releaseClassGrades(req, res) {
  const { class_id: classId, released = true, grade_type: gradeTypeInput } = req.body;
  if (!isUuid(String(classId || ''))) {
    return res.status(400).json({ error: 'Invalid class_id format.' });
  }

  const gradeType = normalizeGradeType(gradeTypeInput, 'all');
  if (!gradeType) {
    return res.status(400).json({ error: 'Invalid grade_type filter.' });
  }

  try {
    const access = await assertClassOwnership(classId, req.user);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await db.setClassReleaseStatusQuery(
        client,
        classId,
        Boolean(released),
        gradeType,
      );
      await client.query('COMMIT');
      return res.status(200).json({ updated, released: Boolean(released) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('releaseClassGrades error:', error);
    return res.status(500).json({ error: 'Failed to update release status.' });
  }
}

async function getMyGrades(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can access this endpoint.' });
  }

  const classId = req.query.classId ? String(req.query.classId) : null;
  if (classId && !isUuid(classId)) {
    return res.status(400).json({ error: 'Invalid classId format.' });
  }

  const gradeType = normalizeGradeType(req.query.type, 'all');
  if (!gradeType) {
    return res.status(400).json({ error: 'Invalid grade type filter.' });
  }

  try {
    const grades = await db.getStudentReleasedGradesQuery(req.user.id, {
      classId,
      gradeType,
    });
    return res.status(200).json(grades);
  } catch (error) {
    console.error('getMyGrades error:', error);
    return res.status(500).json({ error: 'Failed to fetch student grades.' });
  }
}

module.exports = {
  getGradesForClass,
  insertGrades,
  uploadCsv,
  releaseClassGrades,
  getMyGrades,
};
