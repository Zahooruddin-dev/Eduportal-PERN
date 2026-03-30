const express = require('express');
const controller = require('../controllers/adminControl');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

const router = express.Router();

router.param('userId', validateUuidParam('userId', 'user id'));

router.post('/bootstrap', controller.bootstrapAdmin);
router.post('/invites/accept', controller.acceptAdminInvite);

router.use(verifyToken, isAdmin);

router.get('/classes', controller.getInstituteClasses);
router.get('/users', controller.listInstituteUsers);
router.post('/teachers', controller.createTeacher);
router.post('/students/bulk', controller.bulkCreateStudents);
router.post('/invites', controller.createAdminInvite);
router.post('/users/:userId/reset-password', controller.resetUserPasswordByAdmin);

module.exports = router;
