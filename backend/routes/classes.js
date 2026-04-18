const express = require('express');
const router = express.Router();
const controller = require('../controllers/classControl');
const { isTeacher, verifyToken } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

require('dotenv').config;

router.param('id', validateUuidParam('id', 'class id'));

router.get('/', verifyToken, controller.getClasses);
router.post('/', verifyToken, isTeacher, controller.createClasses);
router.get('/mine', verifyToken, isTeacher, controller.getMyClasses);
router.get('/:id', controller.getSpecificClass);
router.put('/:id', verifyToken, isTeacher, controller.updateClass);
router.delete('/:id', verifyToken, isTeacher, controller.deleteClass);

module.exports = router;
