const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/assignmentsControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const uploadResource = require('../middleware/uploadResourceMiddleware');

// All endpoints under /api/class/:classId/grades or /api/class/:classId/assignments .
// Teacher routes
router.get('/assignments', verifyToken, controller.getAssignments);
router.post(
	'/assignments',
	verifyToken,
	isTeacher,
	controller.createAssignment,
);
router.put(
	'/assignments/:assignmentId',
	verifyToken,
	isTeacher,
	controller.updateAssignment,
);
router.delete(
	'/assignments/:assignmentId',
	verifyToken,
	isTeacher,
	controller.deleteAssignment,
);

router.get(
	'/assignments/:assignmentId/grades',
	verifyToken,
	isTeacher,
	controller.getAssignmentGrades,
);
router.post(
	'/assignments/:assignmentId/grades',
	verifyToken,
	isTeacher,
	controller.submitGrades,
);

// Student view (for a specific class)
router.get('/my-grades', verifyToken, controller.getStudentGradesForClass);
router.post(
	'/assignments/:assignmentId/attachments',
	verifyToken,
	isTeacher,
	uploadResource.single('file'),
	controller.addAttachment,
);
router.get(
	'/assignments/:assignmentId/attachments',
	verifyToken,
	controller.getAttachments,
);
router.delete(
	'/assignments/:assignmentId/attachments/:attachmentId',
	verifyToken,
	isTeacher,
	controller.deleteAttachment,
);

// Submissions (student)
router.post(
	'/assignments/:assignmentId/submit',
	verifyToken,
	uploadResource.single('file'),
	controller.submitAssignment,
);
router.get(
	'/assignments/:assignmentId/my-submission',
	verifyToken,
	controller.getMySubmission,
);
router.get(
	'/assignments/:assignmentId/submissions',
	verifyToken,
	isTeacher,
	controller.getSubmissionsForTeacher,
);

module.exports = router;
