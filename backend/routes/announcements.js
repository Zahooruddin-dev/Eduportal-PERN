const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/announcementControl');
const { isTeacher, verifyToken } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

router.param(
	'announcementId',
	validateUuidParam('announcementId', 'announcement id'),
);

router.post('/', verifyToken, isTeacher, controller.postAnnouncement);

router.get('/', controller.getClassAnnouncements);

router.get('/my', verifyToken, controller.getStudentAnnouncements);
router.get('/notifications/my', verifyToken, controller.getUserAdminAnnouncements);
router.get('/notifications/unread-summary', verifyToken, controller.getAdminAnnouncementUnreadSummary);
router.patch('/notifications/:announcementId/read', verifyToken, controller.markAdminAnnouncementRead);
router.post('/notifications/read-all', verifyToken, controller.markAllAdminAnnouncementsRead);

router.get('/:announcementId', verifyToken, controller.getAnnouncementById);
router.delete('/:announcementId', verifyToken, controller.deleteAnnouncement);

module.exports = router;
