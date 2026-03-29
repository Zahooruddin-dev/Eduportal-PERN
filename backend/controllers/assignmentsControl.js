const db = require('../db/queryAssignment');
const dbClass = require('../db/queryClasses');
const pool = require('../db/Pool');
const cloudinary = require('cloudinary').v2;

function isValidUUID(id) {
	if (!id) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		String(id),
	);
}
async function addAttachment(req, res) {
	const { assignmentId } = req.params;
	const { title, type, content } = req.body;
	let fileUrl = null;
	if (type === 'file') {
		if (!req.file) return res.status(400).json({ error: 'File required' });
		const uploadResult = await new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{
					folder: 'assignment_attachments',
					resource_type: 'auto',
					access_mode: 'public',
				},
				(err, result) => (err ? reject(err) : resolve(result)),
			);
			uploadStream.end(req.file.buffer);
		});
		fileUrl = uploadResult.secure_url;
	} else if (type === 'link') {
		if (!content) return res.status(400).json({ error: 'Link required' });
		fileUrl = content;
	} else {
		return res.status(400).json({ error: 'Invalid type' });
	}

	try {
		const attachment = await db.addAttachmentQuery(
			assignmentId,
			title,
			type,
			fileUrl,
		);
		res.status(201).json(attachment);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getAttachments(req, res) {
	const { assignmentId } = req.params;
	if (!isValidUUID(assignmentId))
		return res.status(400).json({ error: 'Invalid or missing assignmentId' });
	try {
		const attachments =
			await db.getAttachmentsByAssignmentQuery(assignmentId);
		res.json(attachments);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function deleteAttachment(req, res) {
	const { assignmentId, attachmentId } = req.params;
	if (!isValidUUID(assignmentId) || !isValidUUID(attachmentId))
		return res.status(400).json({ error: 'Invalid or missing id(s)' });
	try {
		const deleted = await db.deleteAttachmentQuery(
			attachmentId,
			assignmentId,
		);
		if (!deleted)
			return res.status(404).json({ error: 'Attachment not found' });
		res.json({ message: 'Attachment deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

// ---- Student Submissions ----
async function submitAssignment(req, res) {
	const { assignmentId } = req.params;
	const studentId = req.user && req.user.id;
	if (!isValidUUID(assignmentId) || !isValidUUID(studentId))
		return res.status(400).json({ error: 'Invalid or missing id(s)' });
	const { type, content } = req.body; // type: 'file' or 'link'

	let submissionUrl = null;
	if (type === 'file') {
		if (!req.file) return res.status(400).json({ error: 'File required' });
		const uploadResult = await new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{
					folder: 'assignment_submissions',
					resource_type: 'auto',
					access_mode: 'public',
				},
				(err, result) => (err ? reject(err) : resolve(result)),
			);
			uploadStream.end(req.file.buffer);
		});
		submissionUrl = uploadResult.secure_url;
	} else if (type === 'link') {
		if (!content) return res.status(400).json({ error: 'Link required' });
		submissionUrl = content;
	} else {
		return res.status(400).json({ error: 'Invalid submission type' });
	}

	try {
		const submission = await db.upsertSubmissionQuery(
			assignmentId,
			studentId,
			type,
			submissionUrl,
		);
		res.status(201).json(submission);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getSubmissionsForTeacher(req, res) {
	const { assignmentId } = req.params;
	if (!isValidUUID(assignmentId))
		return res.status(400).json({ error: 'Invalid or missing assignmentId' });
	// teacher only – check permission via assignment's class
	try {
		const submissions =
			await db.getSubmissionsByAssignmentQuery(assignmentId);
		// Also include existing grades from `grades` table for each student
		// We can merge later in frontend, or here
		const grades = await db.getGradesForAssignmentQuery(assignmentId);
		const gradeMap = {};
		grades.forEach((g) => (gradeMap[g.student_id] = g));

		const result = submissions.map((sub) => ({
			...sub,
			score: gradeMap[sub.student_id]?.score,
			feedback: gradeMap[sub.student_id]?.feedback,
		}));
		res.json(result);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getMySubmission(req, res) {
	const { assignmentId } = req.params;
	const studentId = req.user && req.user.id;
	if (!isValidUUID(assignmentId) || !isValidUUID(studentId))
		return res.status(400).json({ error: 'Invalid or missing id(s)' });
	try {
		const submission = await db.getStudentSubmissionQuery(
			assignmentId,
			studentId,
		);
		if (!submission)
			return res.status(404).json({ error: 'No submission found' });
		// Also get grade and feedback from grades table
		const grades = await db.getGradesForAssignmentQuery(assignmentId);
		const grade = grades.find((g) => g.student_id === studentId);
		res.json({ ...submission, score: grade?.score, feedback: grade?.feedback });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getAssignments(req, res) {
	const { classId } = req.params;
	if (!isValidUUID(classId))
		return res.status(400).json({ error: 'Invalid or missing classId' });
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
	if (!isValidUUID(classId))
		return res.status(400).json({ error: 'Invalid or missing classId' });
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
			dueDate,
		});
		res.status(201).json(assignment);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function updateAssignment(req, res) {
	const { assignmentId } = req.params;
	if (!isValidUUID(assignmentId))
		return res.status(400).json({ error: 'Invalid or missing assignmentId' });
	const { title, description, type, maxScore, dueDate } = req.body;
	try {
		const assignment = await db.updateAssignmentQuery(assignmentId, {
			title,
			description,
			type,
			maxScore,
			dueDate,
		});
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
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
	if (!isValidUUID(assignmentId))
		return res.status(400).json({ error: 'Invalid or missing assignmentId' });
	try {
		// Fetch assignment first to check permission
		const assignment = await db.getAssignmentByIdQuery(assignmentId);
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
		const rows = await pool.query(
			'SELECT class_id FROM assignments WHERE id = $1',
			[assignmentId],
		);
		if (rows.rows.length === 0)
			return res.status(404).json({ error: 'Assignment not found' });
		const classId = rows.rows[0].class_id;
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass || targetClass.teacher_id !== req.user.id) {
			return res.status(403).json({ error: 'Unauthorized' });
		}
		const deleted = await db.deleteAssignmentQuery(assignmentId);
		if (!deleted)
			return res.status(404).json({ error: 'Assignment not found' });
		res.json({ message: 'Assignment deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getAssignmentGrades(req, res) {
	const { assignmentId } = req.params;
	if (!isValidUUID(assignmentId))
		return res.status(400).json({ error: 'Invalid or missing assignmentId' });
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
		if (!isValidUUID(assignmentId))
			return res.status(400).json({ error: 'Invalid or missing assignmentId' });
		// Verify assignment exists and teacher has permission (using assignment's class)
		const rows = await pool.query(
			'SELECT class_id FROM assignments WHERE id = $1',
			[assignmentId],
		);
		if (rows.rows.length === 0)
			return res.status(404).json({ error: 'Assignment not found' });
		const classId = rows.rows[0].class_id;
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass || targetClass.teacher_id !== req.user.id) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const promises = grades.map((g) =>
			db.upsertGradeQuery(assignmentId, g.studentId, g.score, g.feedback),
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
	const studentId = req.user && req.user.id;
	if (!isValidUUID(classId) || !isValidUUID(studentId))
		return res.status(400).json({ error: 'Invalid or missing id(s)' });
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
	addAttachment,
	getAttachments,
	deleteAttachment,
	submitAssignment,
	getSubmissionsForTeacher,
	getMySubmission,
};
