const express = require('express');
const router = express.Router();
const controller = require('../controllers/enrollControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param('id', validateUuidParam('id'));
router.param('studentId', validateUuidParam('studentId', 'student id'));
router.param('classId', validateUuidParam('classId', 'class id'));

router.post('/', verifyToken, controller.createEnrollment);
router.get('/class/:id', verifyToken, isTeacher, controller.rooster);
router.get('/class/:classId/removed', verifyToken, isTeacher, controller.listRemovedStudents);
router.get('/class/:classId/student/:studentId/details', verifyToken, isTeacher, controller.getStudentProfileForClass);
router.post('/class/:classId/student/:studentId/remove', verifyToken, isTeacher, controller.removeStudentFromClass);
router.patch('/class/:classId/student/:studentId/unban', verifyToken, isTeacher, controller.unbanStudent);
router.get('/student/:id', verifyToken, controller.getStudentSchedule);
router.get('/student/:id/banned-classes', verifyToken, controller.getBannedClassIdsForStudent);
router.delete('/student/:studentId/class/:classId', verifyToken, controller.unenrollStudent);

module.exports = router;