const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/gradesControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');

// All endpoints under /api/class/:classId/grades or /api/class/:classId/assignments .
// Teacher routes
router.get('/assignments', verifyToken, controller.getAssignments);
router.post('/assignments', verifyToken, isTeacher, controller.createAssignment);
router.put('/assignments/:assignmentId', verifyToken, isTeacher, controller.updateAssignment);
router.delete('/assignments/:assignmentId', verifyToken, isTeacher, controller.deleteAssignment);

router.get('/assignments/:assignmentId/grades', verifyToken, isTeacher, controller.getAssignmentGrades);
router.post('/assignments/:assignmentId/grades', verifyToken, isTeacher, controller.submitGrades);

// Student view (for a specific class)
router.get('/my-grades', verifyToken, controller.getStudentGradesForClass);

module.exports = router;