const express = require('express');
const router = express.Router();
const {
	getGradesForClass,
	insertGrades,
	uploadCsv,
	releaseClassGrades,
	getMyGrades,
} = require('../controllers/gradebookControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param('classId', validateUuidParam('classId', 'class id'));

router.get('/grades/:classId', verifyToken, isTeacher, getGradesForClass);
router.post('/grades', verifyToken, isTeacher, insertGrades);
router.post('/upload', verifyToken, isTeacher, uploadCsv);
router.patch('/release', verifyToken, isTeacher, releaseClassGrades);
router.get('/my-grades', verifyToken, getMyGrades);

module.exports = router;
