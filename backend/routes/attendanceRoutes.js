const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControl');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/:classId', verifyToken, attendanceController.getAttendance);
router.post('/bulk', verifyToken, attendanceController.markBulkAttendance);

module.exports = router;
