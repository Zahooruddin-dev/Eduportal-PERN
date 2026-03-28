const db = require('../db/queryGrades');
const dbClass = require('../db/queryClasses');
const dbEnroll = require('../db/queryEnrollment');

async function getAssignments(req, res) {
    const { classId } = req.params;
    try {
        // Check teacher permission (if user is teacher, ensure they teach this class)
        if (req.user.role === 'teacher') {
            const targetClass = await dbClass.getClassByIdQuery(classId);
            if (!targetClass || targetClass.teacher_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        const assignments = await db.getAssignmentsByClassQuery(classId);
        res.json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function createAssignment(req, res) {
    const { classId } = req.params;
    const { title, description, type, maxScore, dueDate } = req.body;
    if (!title || maxScore === undefined) {
        return res.status(400).json({ error: 'Title and max score required' });
    }
    try {
        const targetClass = await dbClass.getClassByIdQuery(classId);
        if (!targetClass || targetClass.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const assignment = await db.createAssignmentQuery({
            classId,
            title,
            description,
            type: type || 'assignment',
            maxScore,
            dueDate
        });
        res.status(201).json(assignment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function updateAssignment(req, res) {
    const { assignmentId } = req.params;
    const { title, description, type, maxScore, dueDate } = req.body;
    try {
        const assignment = await db.updateAssignmentQuery(assignmentId, { title, description, type, maxScore, dueDate });
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        // Ensure teacher owns the class (via assignment's class)
        const classId = assignment.class_id;
        const targetClass = await dbClass.getClassByIdQuery(classId);
        if (!targetClass || targetClass.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        res.json(assignment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function deleteAssignment(req, res) {
    const { assignmentId } = req.params;
    try {
        // Fetch assignment first to check permission
        const assignment = await db.getAssignmentsByClassQuery(assignmentId); // get one? Better: get by ID
        // Let's create a helper to get assignment by ID (we'll add it later)
        // For now, assume the teacher is authorized via route middleware (already checks teacher role)
        // We'll also verify that the class belongs to the teacher
        const rows = await pool.query('SELECT class_id FROM assignments WHERE id = $1', [assignmentId]);
        if (rows.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
        const classId = rows.rows[0].class_id;
        const targetClass = await dbClass.getClassByIdQuery(classId);
        if (!targetClass || targetClass.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const deleted = await db.deleteAssignmentQuery(assignmentId);
        if (!deleted) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getAssignmentGrades(req, res) {
    const { assignmentId } = req.params;
    try {
        const grades = await db.getGradesForAssignmentQuery(assignmentId);
        res.json(grades);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function submitGrades(req, res) {
    const { assignmentId } = req.params;
    const { grades } = req.body; // array of { studentId, score, feedback? }
    if (!Array.isArray(grades)) {
        return res.status(400).json({ error: 'Grades must be an array' });
    }
    try {
        // Verify assignment exists and teacher has permission (using assignment's class)
        const rows = await pool.query('SELECT class_id FROM assignments WHERE id = $1', [assignmentId]);
        if (rows.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
        const classId = rows.rows[0].class_id;
        const targetClass = await dbClass.getClassByIdQuery(classId);
        if (!targetClass || targetClass.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const promises = grades.map(g =>
            db.upsertGradeQuery(assignmentId, g.studentId, g.score, g.feedback)
        );
        await Promise.all(promises);
        res.json({ message: 'Grades saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getStudentGradesForClass(req, res) {
    const { classId } = req.params;
    const studentId = req.user.id; 
    try {
        const grades = await db.getStudentGradesForClassQuery(studentId, classId);
        res.json(grades);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentGrades,
    submitGrades,
    getStudentGradesForClass,
};