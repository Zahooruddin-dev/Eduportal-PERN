const express = require('express');
const controller = require('../controllers/adminControl');
const announcementController = require('../controllers/announcementControl');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

const router = express.Router();

router.param('userId', validateUuidParam('userId', 'user id'));

router.post('/bootstrap', controller.bootstrapAdmin);
router.post('/invites/accept', controller.acceptAdminInvite);

router.use(verifyToken, isAdmin);

router.get('/classes', controller.getInstituteClasses);
router.get('/users', controller.listInstituteUsers);
router.get('/risk-overview', controller.getRiskOverview);
router.post('/teachers', controller.createTeacher);
router.post('/students/bulk', controller.bulkCreateStudents);
router.post('/invites', controller.createAdminInvite);
router.post('/users/:userId/reset-password', controller.resetUserPasswordByAdmin);
router.patch('/parents/:userId/link-student', controller.linkParentStudent);
router.get('/announcements', announcementController.listAdminAnnouncements);
router.post('/announcements', announcementController.createAdminAnnouncement);
router.delete('/announcements/:announcementId', announcementController.deleteAdminAnnouncement);

module.exports = router;
