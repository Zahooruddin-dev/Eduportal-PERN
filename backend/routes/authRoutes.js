const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControl');
const upload = require('../middleware/uploadMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

function getIdentifier(req) {
	const email = String(req.body?.email || '').trim().toLowerCase();
	return `${req.ip || 'unknown'}:${email}`;
}

const loginLimiter = createRateLimiter({
	windowMs: 10 * 60 * 1000,
	max: 8,
	getIdentifier,
});

const registerLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 6,
	getIdentifier,
});

const resetRequestLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 6,
	getIdentifier,
});

const resetConfirmLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 8,
	getIdentifier,
});

const refreshLimiter = createRateLimiter({
	windowMs: 60 * 1000,
	max: 20,
	getIdentifier: (req) => req.ip || 'unknown',
});

router.get('/register/options', authController.getRegisterOptions);
router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/refresh', refreshLimiter, authController.refreshSession);
router.post('/logout', authController.logout);
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
router.get('/teacher-profile', verifyToken, authController.getMyTeacherProfile);
router.put('/teacher-profile', verifyToken, authController.updateMyTeacherProfile);

router.post('/request-reset', resetRequestLimiter, authController.requestPasswordReset);
router.post('/reset-password', resetConfirmLimiter, authController.resetPassword);

module.exports = router;
