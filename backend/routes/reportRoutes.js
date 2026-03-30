const express = require('express');
const controller = require('../controllers/reportControl');
const uploadResource = require('../middleware/uploadResourceMiddleware');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

const router = express.Router();

router.param('id', validateUuidParam('id', 'report id'));

router.use(verifyToken);

router.get('/meta', controller.getReportMeta);
router.get('/targets', controller.listReportTargets);
router.get('/my', controller.getMyReports);
router.post('/', uploadResource.single('attachment'), controller.createReport);
router.get('/institute', isAdmin, controller.getInstituteReports);
router.patch('/:id/status', isAdmin, controller.updateReportStatus);

module.exports = router;
