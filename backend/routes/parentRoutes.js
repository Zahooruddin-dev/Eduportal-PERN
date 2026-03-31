const express = require('express');
const controller = require('../controllers/parentControl');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/linked-student', controller.getLinkedStudentOverview);

module.exports = router;
