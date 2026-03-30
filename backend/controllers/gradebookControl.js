const pool = require('../db/Pool');

const getGradesForClass = async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM grades WHERE class_id = $1 ORDER BY created_at DESC', [classId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('gradebook:getGradesForClass error:', err && err.message ? err.message : err);
    try {
      const fallback = await pool.query('SELECT * FROM grades WHERE class_id::text = $1::text ORDER BY created_at DESC', [classId]);
      return res.json(fallback.rows);
    } catch (err2) {
      console.error('gradebook:getGradesForClass fallback error:', err2 && err2.message ? err2.message : err2);
      return res.status(500).json({ error: 'Failed to fetch grades', message: err2 && err2.message ? err2.message : '' });
    }
  }
};

const insertGrades = async (req, res) => {
  const { class_id, teacher_id, grades } = req.body;
  if (!class_id || !grades || !Array.isArray(grades)) return res.status(400).json({ error: 'Invalid payload' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = 'INSERT INTO grades(class_id, teacher_id, student_id, assignment_id, grade, max_grade, grade_type, feedback, released, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *';
    const inserted = [];
    for (const g of grades) {
      const values = [
        class_id != null ? String(class_id) : null,
        teacher_id != null ? String(teacher_id) : null,
        g.student_id != null ? String(g.student_id) : null,
        g.assignment_id != null ? String(g.assignment_id) : null,
        g.grade != null ? Number(g.grade) : null,
        g.max_grade != null ? Number(g.max_grade) : null,
        g.grade_type || 'manual',
        g.feedback || '',
        !!g.released,
      ];
      const r = await client.query(insertText, values);
      inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    return res.json({ inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('gradebook:insertGrades error:', err && err.message ? err.message : err);

    const msg = err && err.message ? err.message : '';
    if (!req._gradeRetry && /column .* of relation .* does not exist/i.test(msg)) {
      req._gradeRetry = true;
      try {
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS class_id text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS teacher_id text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS student_id text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS assignment_id text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade numeric`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_grade numeric`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_type text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS feedback text`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS released boolean DEFAULT false`);
        await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
      } catch (alterErr) {
        console.error('gradebook:failed to add missing columns', alterErr && alterErr.message ? alterErr.message : alterErr);
        return res.status(500).json({ error: 'Failed to ensure grades schema', message: alterErr && alterErr.message ? alterErr.message : '' });
      }
      try {
        const retryRes = await insertGrades(req, res);
        return retryRes;
      } catch (retryErr) {
        console.error('gradebook:retry insert failed', retryErr && retryErr.message ? retryErr.message : retryErr);
        return res.status(500).json({ error: 'Failed to insert grades after schema fix', message: retryErr && retryErr.message ? retryErr.message : '' });
      }
    }

    return res.status(500).json({ error: 'Failed to insert grades', message: msg });
  } finally {
    client.release();
  }
};

const uploadCsv = async (req, res) => {
  const { csv, class_id, teacher_id } = req.body;
  if (!csv || !class_id) return res.status(400).json({ error: 'Invalid payload' });
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const grades = [];
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    const student_id = parts[0] || null;
    const grade = parts[1] ? Number(parts[1]) : null;
    const max_grade = parts[2] ? Number(parts[2]) : null;
    const feedback = parts[3] || '';
    grades.push({ student_id, grade, max_grade, feedback, grade_type: 'csv' });
  }
  req.body.grades = grades;
  return insertGrades(req, res);
};

module.exports = { getGradesForClass, insertGrades, uploadCsv };
