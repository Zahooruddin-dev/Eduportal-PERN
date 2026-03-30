const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (!token) {
		return res.status(403).json({ message: 'No token provided' });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded; //Can add {id,role} if it requests object in future
		next();
	} catch (error) {
		return res.status(401).json({ message: 'Unauthorized' });
	}
};
const isTeacher = (req, res, next) => {
	if(!req.user) {return res
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
