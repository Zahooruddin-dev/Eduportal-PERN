const express = require('express');
const router = express.Router();
const { getGradesForClass, insertGrades, uploadCsv } = require('../controllers/gradebookControl');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param('classId', validateUuidParam('classId', 'class id'));

router.get('/grades/:classId', getGradesForClass);
router.post('/grades', insertGrades);
router.post('/upload', uploadCsv);

module.exports = router;
