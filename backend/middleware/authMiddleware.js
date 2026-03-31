const jwt = require('jsonwebtoken');
const pool = require('../db/Pool');

function getBearerToken(authHeader) {
	if (typeof authHeader !== 'string') return null;
	const [scheme, token] = authHeader.trim().split(/\s+/);
	if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
		return null;
	}
	return token;
}

const verifyToken = (req, res, next) => {
	const authHeader = req.headers.authorization;
	const token = getBearerToken(authHeader);
	if (!token) {
		return res.status(403).json({ message: 'No token provided' });
	}

	let decoded;
	try {
		decoded = jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	pool.query(
		`SELECT id, role, username, email, profile_pic, created_at, institute_id
		 FROM users
		 WHERE id = $1`,
		[decoded.id],
	)
		.then(({ rows }) => {
			const currentUser = rows[0];
			if (!currentUser) {
				return res.status(401).json({ message: 'Unauthorized' });
			}

			req.user = {
				id: currentUser.id,
				role: currentUser.role,
				username: currentUser.username,
				email: currentUser.email,
				profile: currentUser.profile_pic,
				createdAt: currentUser.created_at,
				instituteId: currentUser.institute_id,
			};
			return next();
		})
		.catch(() => {
			return res.status(500).json({ message: 'Failed to validate user session.' });
		});
};
const isTeacher = (req, res, next) => {
	if (!req.user) {
		return res
			.status(403)
			.json({ message: 'Require Teacher or Admin Role to have access!' });
	}
	if (req.user.role === 'teacher' || req.user.role === 'admin') {
		next();
	} else {
		return res
			.status(403)
			.json({ message: 'Require Teacher or Admin Role to have access!' });
	}
};
const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return res.status(403).json({ message: 'Require Admin Role to have access!' });
	}
	next();
};
module.exports = { verifyToken, isTeacher, isAdmin };
