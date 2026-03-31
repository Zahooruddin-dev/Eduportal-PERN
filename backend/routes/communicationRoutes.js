const express = require('express');
const controller = require('../controllers/communicationControl');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateUuidParam } = require('../middleware/uuidParamMiddleware');

const router = express.Router();

router.param('teacherId', validateUuidParam('teacherId', 'teacher id'));
router.param('conversationId', validateUuidParam('conversationId', 'conversation id'));
router.param('messageId', validateUuidParam('messageId', 'message id'));

router.use(verifyToken);

router.get('/contacts', controller.searchContacts);
router.get('/teachers/:teacherId/profile', controller.getTeacherProfile);
router.post('/conversations/direct', controller.openDirectConversation);
router.get('/inbox', controller.getInbox);
router.get('/conversations/:conversationId/messages', controller.getConversationMessages);
router.post('/conversations/:conversationId/read', controller.markConversationRead);
router.get('/unread-count', controller.getUnreadCount);
router.post('/messages', controller.sendMessage);
router.patch('/messages/:messageId', controller.editMessage);
router.delete('/messages/:messageId', controller.deleteMessage);

module.exports = router;
