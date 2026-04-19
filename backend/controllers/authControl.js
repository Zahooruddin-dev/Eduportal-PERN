const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db/queryAuth');
const { sendResetEmail } = require('../utility/emailSender');
const { deleteCacheByPrefix } = require('../utility/ttlCache');
const { validatePasswordStrength } = require('../utility/passwordPolicy');
const {
	clearRefreshCookie,
	getRefreshTokenFromRequest,
	issueAuthSession,
	revokeAuthSessionByToken,
	rotateAuthSession,
	signAccessToken,
	getRequestIp,
} = require('../utility/authSession');

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function normalizeParentProfile(rawProfile) {
	const profile = rawProfile || {};
	return {
		childFullName: String(profile.childFullName || '').trim(),
		childGrade: String(profile.childGrade || '').trim(),
		relationshipToChild: String(profile.relationshipToChild || '').trim(),
		parentPhone: String(profile.parentPhone || '').trim(),
		alternatePhone: String(profile.alternatePhone || '').trim(),
		address: String(profile.address || '').trim(),
		notes: String(profile.notes || '').trim(),
	};
}

function normalizeTeacherProfile(rawProfile) {
	const profile = rawProfile || {};
	const rawSubjects = Array.isArray(profile.subjects)
		? profile.subjects
		: String(profile.subjects || '').split(',');
	const subjects = [];
	for (let i = 0; i < rawSubjects.length; i += 1) {
		const value = String(rawSubjects[i] || '').trim();
		if (!value) continue;
		if (!subjects.includes(value)) {
			subjects.push(value);
		}
	}

	const classId = String(profile.selectedClassId || profile.classId || '').trim();
	const otherGrade = String(profile.otherGrade || '').trim();

	return {
		subjects,
		classId: classId || null,
		otherGrade: otherGrade || null,
	};
}

function validateRequiredParentProfile(profile) {
	if (!profile.childFullName) {
		return 'Child full name is required for parent accounts.';
	}
	if (!profile.childGrade) {
		return 'Child grade is required for parent accounts.';
	}
	if (!profile.relationshipToChild) {
		return 'Relationship to child is required for parent accounts.';
	}
	if (!profile.parentPhone) {
		return 'Parent phone is required for parent accounts.';
	}
	return null;
}

function validateTeacherProfile(profile) {
	if (!Array.isArray(profile.subjects) || profile.subjects.length === 0) {
		return 'At least one subject is required for teacher accounts.';
	}
	if (!profile.classId && !profile.otherGrade) {
		return null;
	}
	if (!profile.classId && profile.otherGrade.length < 2) {
		return 'Other grade must be at least 2 characters.';
	}
	return null;
}

function toUserPayload(user, { parentProfile = null, teacherProfile = null } = {}) {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		email: user.email,
		profile: user.profile_pic,
		createdAt: user.created_at,
		instituteId: user.institute_id,
		parentProfile,
		teacherProfile,
	};
}

async function getRegisterOptions(req, res) {
	try {
		const classes = await db.listRegistrationClassesQuery();
		return res.status(200).json({ classes });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function login(req, res) {
	const email = normalizeEmail(req.body?.email);
	const password = String(req.body?.password || '');

	if (!email || !password) {
		return res.status(400).json({ message: 'Email and password are required.' });
	}

	try {
		const user = await db.getUserByEmail(email);
		if (!user)
			return res.status(401).json({ message: 'Invalid Email or Password' });

		const actualMatch = await bcrypt.compare(password, user.password_hash);
		if (!actualMatch)
			return res.status(401).json({ message: 'Invalid Email or Password' });

		const parentProfile = user.role === 'parent'
			? await db.getParentProfileByUserId(user.id)
			: null;
		const teacherProfile = user.role === 'teacher'
			? await db.getTeacherProfileByUserId(user.id)
			: null;
		const session = await issueAuthSession(res, user, req);

		res.json({
			message: 'Login Successful',
			token: session.accessToken,
			user: toUserPayload(user, { parentProfile, teacherProfile }),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function register(req, res) {
	const { username, email, password, role } = req.body;
	const normalizedRole = String(role || 'student').trim().toLowerCase();
	const normalizedUsername = String(username || '').trim();
	const normalizedEmail = normalizeEmail(email);
	if (!['student', 'teacher', 'parent'].includes(normalizedRole)) {
		return res
			.status(403)
			.json({ message: 'Supported account types are student, teacher, and parent.' });
	}
	if (!normalizedUsername || !normalizedEmail || !password) {
		return res
			.status(400)
			.json({ message: 'Username, email, and password are required.' });
	}

	const parentProfile =
		normalizedRole === 'parent'
			? normalizeParentProfile(req.body?.parentProfile)
			: null;
	const teacherProfile =
		normalizedRole === 'teacher'
			? normalizeTeacherProfile(req.body?.teacherProfile)
			: null;

	if (normalizedRole === 'parent') {
		const parentProfileValidationMessage = validateRequiredParentProfile(parentProfile);
		if (parentProfileValidationMessage) {
			return res.status(400).json({ message: parentProfileValidationMessage });
		}
	}

	if (normalizedRole === 'teacher') {
		const teacherProfileValidationMessage = validateTeacherProfile(teacherProfile);
		if (teacherProfileValidationMessage) {
			return res.status(400).json({ message: teacherProfileValidationMessage });
		}
	}

	const passwordValidation = validatePasswordStrength(password, normalizedRole);
	if (!passwordValidation.ok) {
		return res.status(400).json({ message: passwordValidation.message });
	}
	try {
		const password_hash = await bcrypt.hash(password, 10);
		const newUser = await db.registerQuery(
			normalizedUsername,
			normalizedEmail,
			password_hash,
			normalizedRole,
			null,
			parentProfile,
			teacherProfile,
		);
		const savedParentProfile = normalizedRole === 'parent'
			? await db.getParentProfileByUserId(newUser.id)
			: null;
		const savedTeacherProfile = normalizedRole === 'teacher'
			? await db.getTeacherProfileByUserId(newUser.id)
			: null;
		const session = await issueAuthSession(res, newUser, req);
		res
			.status(201)
			.json({
				message: 'User Registered Successfully',
				token: session.accessToken,
				user: toUserPayload(newUser, {
					parentProfile: savedParentProfile,
					teacherProfile: savedTeacherProfile,
				}),
			});
	} catch (error) {
		if (error.code === '23505')
			return res.status(400).json({ message: 'Email Already exists' });
		res.status(400).json({ message: error.message });
	}
}

async function getMyParentProfile(req, res) {
	if (req.user?.role !== 'parent') {
		return res.status(403).json({ message: 'Only parent accounts can access parent profile details.' });
	}

	try {
		const parentProfile = await db.getParentProfileByUserId(req.user.id);
		if (!parentProfile) {
			return res.status(404).json({ message: 'Parent profile not found.' });
		}

		return res.status(200).json(parentProfile);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function updateMyParentProfile(req, res) {
	if (req.user?.role !== 'parent') {
		return res.status(403).json({ message: 'Only parent accounts can update parent profile details.' });
	}

	const normalizedParentProfile = normalizeParentProfile(req.body);
	const parentProfileValidationMessage = validateRequiredParentProfile(normalizedParentProfile);
	if (parentProfileValidationMessage) {
		return res.status(400).json({ message: parentProfileValidationMessage });
	}

	try {
		const updatedProfile = await db.updateParentProfileByUserId(req.user.id, normalizedParentProfile);
		if (!updatedProfile) {
			return res.status(404).json({ message: 'Parent profile not found.' });
		}
		deleteCacheByPrefix(`parent-overview:${req.user.id}:`);

		return res.status(200).json({
			message: 'Parent profile updated successfully.',
			parentProfile: updatedProfile,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function changeUsername(req, res) {
	const id = req.user.id;
	const { newUsername } = req.body;
	const imagePath = req.file ? req.file.path : null;

	if (!newUsername)
		return res.status(400).json({ message: 'Username cannot be empty' });
	try {
		const updatedUser = await db.updateUsername(id, newUsername, imagePath);
		if (!updatedUser) return res.status(404).json({ message: 'User not found' });

		const token = signAccessToken(updatedUser);

		res.json({
			message: 'Profile updated!',
			token,
			user: {
				id: updatedUser.id,
				username: updatedUser.username,
				email: updatedUser.email,
				role: updatedUser.role,
				createdAt: updatedUser.created_at,
				profile: updatedUser.profile_pic,
				instituteId: updatedUser.institute_id,
			},
		});
	} catch (error) {
		console.error('changeUsername error:', error);
		res.status(500).json({ message: 'Failed to update profile.' });
	}
}

async function changePassword(req, res) {
	const userId = req.user.id;
	const { currentPassword, newPassword } = req.body;

	if (!currentPassword || !newPassword)
		return res
			.status(400)
			.json({ message: 'Both current and new password are required.' });

	try {
		const user = await db.getUserByEmail(req.user.email);
		if (!user) return res.status(404).json({ message: 'User not found.' });

		const passwordValidation = validatePasswordStrength(newPassword, user.role);
		if (!passwordValidation.ok) {
			return res.status(400).json({ message: passwordValidation.message });
		}

		const match = await bcrypt.compare(currentPassword, user.password_hash);
		if (!match)
			return res
				.status(401)
				.json({ message: 'Current password is incorrect.' });

		const newHash = await bcrypt.hash(newPassword, 10);
		await db.updatePasswordQuery(userId, newHash);
		await db.revokeAllRefreshSessionsByUserIdQuery(userId, 'password_changed');
		clearRefreshCookie(res);

		res.status(200).json({ message: 'Password changed successfully. Please sign in again.' });
	} catch (error) {
		console.error('changePassword error:', error);
		res.status(500).json({ message: 'Failed to change password.' });
	}
}

async function deleteUser(req, res) {
	const password = String(req.body?.password || '');
	const requestedEmail = normalizeEmail(req.body?.email || req.user?.email);
	const authenticatedEmail = normalizeEmail(req.user?.email);

	if (!password) {
		return res.status(400).json({ message: 'Password is required.' });
	}

	if (!authenticatedEmail || requestedEmail !== authenticatedEmail) {
		return res.status(403).json({ message: 'You can only delete your own account.' });
	}

	try {
		const user = await db.getUserByEmail(authenticatedEmail);
		if (!user)
			return res.status(401).json({ message: 'Invalid Email or Password' });

		const actualMatch = await bcrypt.compare(password, user.password_hash);
		if (!actualMatch)
			return res.status(401).json({ message: 'Invalid Email or Password' });

		await db.revokeAllRefreshSessionsByUserIdQuery(req.user.id, 'account_deleted');
		await revokeAuthSessionByToken(getRefreshTokenFromRequest(req), 'account_deleted');
		clearRefreshCookie(res);

		const deleted = await db.deleteUserByIdQuery(req.user.id);
		res.status(200).json({ message: 'User Deleted', deleted });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function resetPassword(req, res) {
	const email = normalizeEmail(req.body?.email);
	const code = String(req.body?.code || '').trim();
	const newPassword = String(req.body?.newPassword || '');

	if (!email || !code || !newPassword) {
		return res.status(400).json({ message: 'Email, code, and new password are required.' });
	}
	try {
		const user = await db.getUserByEmail(email);
		if (!user) {
			return res.status(400).json({ message: 'Invalid or expired code.' });
		}

		const passwordValidation = validatePasswordStrength(newPassword, user.role);
		if (!passwordValidation.ok) {
			return res.status(400).json({ message: passwordValidation.message });
		}

		const resetResult = await db.verifyResetCode(email, code);
		if (!resetResult.ok) {
			if (resetResult.reason === 'attempts_exceeded') {
				return res.status(400).json({ message: 'Code invalid or expired. Request a new code.' });
			}
			return res.status(400).json({ message: 'Invalid or expired code.' });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);
		await db.updateUserPassword(email, hashedPassword);
		await db.deleteResetCode(email);
		await db.revokeAllRefreshSessionsByUserIdQuery(user.id, 'password_reset');
		return res.status(200).json({ message: 'Password reset done' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function requestPasswordReset(req, res) {
	const email = normalizeEmail(req.body?.email);

	if (!email) {
		return res.status(400).json({ message: 'Email is required.' });
	}

	const genericResponse = { message: 'If an account exists, a code has been sent.' };

	try {
		const user = await db.getUserByEmail(email);
		if (!user) {
			return res.status(200).json(genericResponse);
		}
		const code = crypto.randomInt(100000, 1000000).toString();
		const expires = new Date(Date.now() + 15 * 60000);
		await db.saveResetCode(email, code, expires, getRequestIp(req));
		await sendResetEmail(user.email, code);

		return res.status(200).json(genericResponse);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function refreshSession(req, res) {
	try {
		const rawRefreshToken = getRefreshTokenFromRequest(req);
		const rotated = await rotateAuthSession(res, req, rawRefreshToken);
		if (!rotated) {
			clearRefreshCookie(res);
			return res.status(401).json({ message: 'Unauthorized' });
		}

		return res.status(200).json({ token: rotated.accessToken });
	} catch (error) {
		clearRefreshCookie(res);
		return res.status(500).json({ message: error.message });
	}
}

async function logout(req, res) {
	try {
		const rawRefreshToken = getRefreshTokenFromRequest(req);
		await revokeAuthSessionByToken(rawRefreshToken, 'logout');
		clearRefreshCookie(res);
		return res.status(200).json({ message: 'Logged out successfully.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getRegisterOptions,
	login,
	register,
	changeUsername,
	changePassword,
	deleteUser,
	resetPassword,
	requestPasswordReset,
	refreshSession,
	logout,
	getMyParentProfile,
	updateMyParentProfile,
};
