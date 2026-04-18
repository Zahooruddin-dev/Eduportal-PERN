const express = require('express');
const controller = require('../controllers/adminControl');
const announcementController = require('../controllers/announcementControl');
const academicCalendarController = require('../controllers/adminAcademicCalendarControl');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

const router = express.Router();

router.param('userId', validateUuidParam('userId', 'user id'));
router.param('termId', validateUuidParam('termId', 'term id'));
router.param('exceptionId', validateUuidParam('exceptionId', 'exception id'));
router.param('classId', validateUuidParam('classId', 'class id'));

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
router.get('/academic/terms', academicCalendarController.listAcademicTerms);
router.post('/academic/terms', academicCalendarController.createAcademicTerm);
router.patch('/academic/terms/:termId', academicCalendarController.updateAcademicTerm);
router.delete('/academic/terms/:termId', academicCalendarController.deleteAcademicTerm);
router.get('/academic/exceptions', academicCalendarController.listAcademicExceptions);
router.post('/academic/exceptions', academicCalendarController.createAcademicException);
router.patch('/academic/exceptions/:exceptionId', academicCalendarController.updateAcademicException);
router.delete('/academic/exceptions/:exceptionId', academicCalendarController.deleteAcademicException);

module.exports = router;
