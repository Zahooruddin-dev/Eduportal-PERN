const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/resourceControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); 

// POST - upload file or create link
router.post('/', verifyToken, isTeacher, upload.single('file'), controller.createResource);

// GET - list resources for class (respects publish flag)
router.get('/', verifyToken, controller.getClassResources);

// PUT - update resource
router.put('/:resourceId', verifyToken, isTeacher, controller.updateResource);

// DELETE - delete resource
router.delete('/:resourceId', verifyToken, isTeacher, controller.deleteResource);

module.exports = router;