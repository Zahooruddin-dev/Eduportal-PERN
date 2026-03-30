const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControl');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param('classId', validateUuidParam('classId', 'class id'));

router.get('/:classId', verifyToken, attendanceController.getClassAttendance);
router.post('/:classId', verifyToken, attendanceController.markBulkAttendance);

module.exports = router;