const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/commentControl');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, controller.createComment);
router.get('/', verifyToken, controller.getComments);
router.put('/:commentId', verifyToken, controller.updateComment);
router.delete('/:commentId', verifyToken, controller.deleteComment);

module.exports = router;
