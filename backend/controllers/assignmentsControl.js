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

function normalizeDueDate(value) {
	if (value === undefined || value === null || value === '') return null;
	const text = String(value).trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
	return text;
}

function normalizeDueAt(value) {
	if (value === undefined || value === null || value === '') return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
}

function resolveDueFields(payload = {}) {
	const hasDueDate = payload.dueDate !== undefined;
	const hasDueAt = payload.dueAt !== undefined;
	if (!hasDueDate && !hasDueAt) {
		return { dueDate: undefined, dueAt: undefined, error: null };
	}

	const normalizedDate = normalizeDueDate(payload.dueDate);
	const normalizedAt = normalizeDueAt(payload.dueAt);

	if (hasDueDate && !normalizedDate) {
		return { dueDate: null, dueAt: null, error: 'dueDate must be in YYYY-MM-DD format.' };
	}
	if (hasDueAt && !normalizedAt) {
		return { dueDate: null, dueAt: null, error: 'dueAt must be a valid date-time.' };
	}

	if (normalizedAt) {
		return {
			dueDate: normalizedDate || normalizedAt.slice(0, 10),
			dueAt: normalizedAt,
			error: null,
		};
	}

	if (normalizedDate) {
		return {
			dueDate: normalizedDate,
			dueAt: `${normalizedDate}T23:59:00.000Z`,
			error: null,
		};
	}

	return { dueDate: null, dueAt: null, error: null };
}

function canManageClass(user, targetClass) {
	if (!user || !targetClass) return false;
	if (user.role === 'teacher') {
		return targetClass.teacher_id === user.id;
	}
	if (user.role === 'admin') {
		return targetClass.institute_id === user.instituteId;
	}
	return false;
}

async function addAttachment(req, res) {
	const { assignmentId } = req.params;
	const { title, type, content } = req.body;
	let fileUrl = null;
	if (type === 'file') {
		if (!req.file) return res.status(400).json({ error: 'File required' });
		// If multer-storage-cloudinary was used, the file is already uploaded and
		// the URL is available on req.file.path (or req.file.url). Otherwise,
		// fall back to streaming the buffer to Cloudinary.
		if (req.file.path || req.file.url || req.file.secure_url) {
			fileUrl = req.file.path || req.file.url || req.file.secure_url;
		} else if (req.file.buffer) {
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
		} else {
			return res.status(400).json({ error: 'Uploaded file not found' });
		}
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
	const { type, content } = req.body; // type: 'file' | 'link' | 'text'

	let submissionUrl = null;
	if (type === 'file') {
		if (!req.file) return res.status(400).json({ error: 'File required' });
		if (req.file.path || req.file.url || req.file.secure_url) {
			submissionUrl = req.file.path || req.file.url || req.file.secure_url;
		} else if (req.file.buffer) {
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
		} else {
			return res.status(400).json({ error: 'Uploaded file not found' });
		}
	} else if (type === 'link') {
		if (!content) return res.status(400).json({ error: 'Link required' });
		submissionUrl = content;
	} else if (type === 'text') {
		if (!content) return res.status(400).json({ error: 'Text content required' });
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
	try {
		const assignment = await db.getAssignmentByIdQuery(assignmentId);
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
		const targetClass = await dbClass.getClassByIdQuery(assignment.class_id);
		if (!canManageClass(req.user, targetClass)) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const submissions =
			await db.getSubmissionsByAssignmentQuery(assignmentId);
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
		if (req.user.role === 'teacher' || req.user.role === 'admin') {
			const targetClass = await dbClass.getClassByIdQuery(classId);
			if (!canManageClass(req.user, targetClass)) {
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
	const { title, description, type, maxScore } = req.body;
	if (!title || maxScore === undefined) {
		return res.status(400).json({ error: 'Title and max score required' });
	}
	try {
		const dueFields = resolveDueFields(req.body);
		if (dueFields.error) {
			return res.status(400).json({ error: dueFields.error });
		}

		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!canManageClass(req.user, targetClass)) {
			return res.status(403).json({ error: 'Unauthorized' });
		}
		const assignment = await db.createAssignmentQuery({
			classId,
			title,
			description,
			type: type || 'assignment',
			maxScore,
			dueDate: dueFields.dueDate || null,
			dueAt: dueFields.dueAt || null,
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
	const { title, description, type, maxScore } = req.body;
	try {
		const existing = await db.getAssignmentByIdQuery(assignmentId);
		if (!existing)
			return res.status(404).json({ error: 'Assignment not found' });

		const targetClass = await dbClass.getClassByIdQuery(existing.class_id);
		if (!canManageClass(req.user, targetClass)) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const dueFields = resolveDueFields(req.body);
		if (dueFields.error) {
			return res.status(400).json({ error: dueFields.error });
		}

		const assignment = await db.updateAssignmentQuery(assignmentId, {
			title,
			description,
			type,
			maxScore,
			dueDate: dueFields.dueDate,
			dueAt: dueFields.dueAt,
		});
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
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
		const assignment = await db.getAssignmentByIdQuery(assignmentId);
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
		const targetClass = await dbClass.getClassByIdQuery(assignment.class_id);
		if (!canManageClass(req.user, targetClass)) {
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
		const assignment = await db.getAssignmentByIdQuery(assignmentId);
		if (!assignment)
			return res.status(404).json({ error: 'Assignment not found' });
		const targetClass = await dbClass.getClassByIdQuery(assignment.class_id);
		if (!canManageClass(req.user, targetClass)) {
			return res.status(403).json({ error: 'Unauthorized' });
		}
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
		const rows = await pool.query(
			'SELECT class_id, max_score FROM assignments WHERE id = $1',
			[assignmentId],
		);
		if (rows.rows.length === 0)
			return res.status(404).json({ error: 'Assignment not found' });
		const classId = rows.rows[0].class_id;
		const assignmentMaxScore = rows.rows[0].max_score;
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!canManageClass(req.user, targetClass)) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const promises = grades.map((g) =>
			db.upsertGradeQuery(
				assignmentId,
				g.studentId,
				g.score,
				g.feedback,
				{
					classId,
					teacherId: req.user.id,
					maxScore: g.maxScore ?? assignmentMaxScore,
					gradeType: 'assignment',
					released: false,
				},
			),
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
