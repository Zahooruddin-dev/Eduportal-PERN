const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/queryAuth');
const { sendResetEmail } = require('../utility/emailSender');

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
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

		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
				username: user.username,
				email: user.email,
				profile: user.profile_pic,
				createdAt: user.created_at,
				instituteId: user.institute_id,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1d' },
		);

		res.json({
			message: 'Login Successful',
			token,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
				email: user.email,
				profile: user.profile_pic,
				createdAt: user.created_at,
				instituteId: user.institute_id,
			},
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
	if (!['student', 'teacher', 'admin'].includes(normalizedRole)) {
		return res
			.status(403)
			.json({ message: 'Supported account types are student, teacher, and admin.' });
	}
	if (!normalizedUsername || !normalizedEmail || !password) {
		return res
			.status(400)
			.json({ message: 'Username, email, and password are required.' });
	}
	if (password.length < 8) {
		return res
			.status(400)
			.json({ message: 'Password must be at least 8 characters.' });
	}
	try {
		const password_hash = await bcrypt.hash(password, 10);
		const newUser = await db.registerQuery(normalizedUsername, normalizedEmail, password_hash, normalizedRole);

		const token = jwt.sign(
			{
				id: newUser.id,
				role: newUser.role,
				username: newUser.username,
				email: newUser.email,
				profile: newUser.profile_pic,
				createdAt: newUser.created_at,
				instituteId: newUser.institute_id,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1d' },
		);
		res
			.status(201)
			.json({ message: 'User Registered Successfully', token, user: {
				id: newUser.id,
				username: newUser.username,
				role: newUser.role,
				email: newUser.email,
				profile: newUser.profile_pic,
				createdAt: newUser.created_at,
				instituteId: newUser.institute_id,
			} });
	} catch (error) {
		if (error.code === '23505')
			return res.status(400).json({ message: 'Email Already exists' });
		res.status(400).json({ message: error.message });
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

		const token = jwt.sign(
			{
				id: updatedUser.id,
				role: updatedUser.role,
				username: updatedUser.username,
				email: updatedUser.email,
				createdAt: updatedUser.created_at,
				profile: updatedUser.profile_pic,
				instituteId: updatedUser.institute_id,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1d' },
		);

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
	if (newPassword.length < 8)
		return res
			.status(400)
			.json({ message: 'New password must be at least 8 characters.' });

	try {
		const user = await db.getUserByEmail(req.user.email);
		if (!user) return res.status(404).json({ message: 'User not found.' });

		const match = await bcrypt.compare(currentPassword, user.password_hash);
		if (!match)
			return res
				.status(401)
				.json({ message: 'Current password is incorrect.' });

		const newHash = await bcrypt.hash(newPassword, 10);
		await db.updatePasswordQuery(userId, newHash);

		res.status(200).json({ message: 'Password changed successfully.' });
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
	if (newPassword.length < 8) {
		return res.status(400).json({ message: 'New password must be at least 8 characters.' });
	}

	try {
		const resetEntry = await db.verifyResetCode(email, code);

		if (!resetEntry) {
			return res.status(400).json({ message: 'Invalid or expired code.' });
		}
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);
		await db.updateUserPassword(email, hashedPassword);
		await db.deleteResetCode(email);
		return res.status(200).json({ message: 'reset password done' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}
async function requestPasswordReset(req, res) {
	const email = normalizeEmail(req.body?.email);

	if (!email) {
		return res.status(400).json({ message: 'Email is required.' });
	}

	try {
		const user = await db.getUserByEmail(email);
		if (!user) {
			return res
				.status(200)
				.json({ message: 'If an account exists, a code was send' });
		} // we send 200 even if the user doesn't exist to stopp hackers from guessing the emails
		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const expires = new Date(Date.now() + 15 * 60000);
		await db.saveResetCode(email, code, expires);
		await sendResetEmail(user.email, code);

		return res.status(200).json({ message: 'reset code sent' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}
module.exports = {
	login,
	register,
	changeUsername,
	changePassword,
	deleteUser,
	resetPassword,
	requestPasswordReset,
};
