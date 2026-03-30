const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/resourceControl');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');
const uploadResource = require('../middleware/uploadResourceMiddleware'); 
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param('resourceId', validateUuidParam('resourceId', 'resource id'));

// POST – upload file (file field name "file") or create link (JSON)
router.post('/', verifyToken, isTeacher, uploadResource.single('file'), controller.createResource);

// GET – list resources (respects publish flag)
router.get('/', verifyToken, controller.getClassResources);

// PUT – update resource (JSON)
router.put('/:resourceId', verifyToken, isTeacher, controller.updateResource);

// DELETE – delete resource
router.delete('/:resourceId', verifyToken, isTeacher, controller.deleteResource);

module.exports = router;