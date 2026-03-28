const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/assignmentsControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const uploadResource = require('../middleware/uploadResourceMiddleware');

// All endpoints under /api/class/:classId/grades or /api/class/:classId/assignments .
// Teacher routes
router.get('/', verifyToken, controller.getAssignments);
router.post('/', verifyToken, isTeacher, controller.createAssignment);
router.put('/:assignmentId', verifyToken, isTeacher, controller.updateAssignment);
router.delete('/:assignmentId', verifyToken, isTeacher, controller.deleteAssignment);

router.get('/:assignmentId/grades', verifyToken, isTeacher, controller.getAssignmentGrades);
router.post('/:assignmentId/grades', verifyToken, isTeacher, controller.submitGrades);

// Student view (for a specific class)
router.get('/my-grades', verifyToken, controller.getStudentGradesForClass);
router.post('/:assignmentId/attachments', verifyToken, isTeacher, uploadResource.single('file'), controller.addAttachment);
router.get('/:assignmentId/attachments', verifyToken, controller.getAttachments);
router.delete('/:assignmentId/attachments/:attachmentId', verifyToken, isTeacher, controller.deleteAttachment);

// Submissions (student)
router.post(
	'/:assignmentId/submit',
	verifyToken,
	uploadResource.single('file'),
	controller.submitAssignment,
);
router.get(
	'/:assignmentId/my-submission',
	verifyToken,
	controller.getMySubmission,
);
router.get(
	'/:assignmentId/submissions',
	verifyToken,
	isTeacher,
	controller.getSubmissionsForTeacher,
);

module.exports = router;
