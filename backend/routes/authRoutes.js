const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControl');
const upload = require('../middleware/uploadMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.put(
	'/update-profile',
	verifyToken,
	upload.single('image'),
	authController.changeUsername,
);
router.put('/change-password', verifyToken, authController.changePassword);
router.delete('/delete', verifyToken, authController.deleteUser);
router.get('/parent-profile', verifyToken, authController.getMyParentProfile);
router.put('/parent-profile', verifyToken, authController.updateMyParentProfile);

router.post('/request-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
