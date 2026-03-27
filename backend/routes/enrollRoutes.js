const express = require('express');
const router = express.Router();
const controller = require('../controllers/enrollControl');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, controller.createEnrollment);
router.get('/class/:id', verifyToken, controller.rooster);
router.get('/student/:id', verifyToken, controller.getStudentSchedule);
router.delete('/student/:studentId/class/:classId', verifyToken, controller.unenrollStudent);

module.exports = router;