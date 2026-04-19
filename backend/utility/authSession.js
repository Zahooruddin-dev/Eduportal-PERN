const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authDb = require('../db/queryAuth');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'mizuka_refresh_token';
const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || 15);
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 14);

function normalizeRole(role) {
	return String(role || '').trim().toLowerCase();
}

function buildTokenPayload(user) {
	return {
		id: user.id,
		role: normalizeRole(user.role),
		username: user.username,
		email: user.email,
		profile: user.profile_pic || user.profile || null,
		createdAt: user.created_at || user.createdAt,
		instituteId: user.institute_id || user.instituteId || null,
	};
}

function signAccessToken(user) {
	return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
		expiresIn: `${ACCESS_TOKEN_MINUTES}m`,
	});
}

function getRefreshCookieOptions() {
	const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	return {
		httpOnly: true,
		secure: isProduction,
		sameSite: isProduction ? 'none' : 'lax',
		path: '/api/auth',
		maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
	};
}

function parseCookies(cookieHeader) {
	const result = {};
	if (!cookieHeader || typeof cookieHeader !== 'string') {
		return result;
	}
	const parts = cookieHeader.split(';');
	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		const separatorIndex = part.indexOf('=');
		if (separatorIndex === -1) continue;
		const key = part.slice(0, separatorIndex).trim();
		const value = part.slice(separatorIndex + 1).trim();
		if (!key) continue;
		result[key] = decodeURIComponent(value);
	}
	return result;
}

function getRefreshTokenFromRequest(req) {
	const cookies = parseCookies(req.headers?.cookie || '');
	return cookies[REFRESH_COOKIE_NAME] || null;
}

function clearRefreshCookie(res) {
	res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

function hashRefreshToken(rawToken) {
	return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

function getRequestIp(req) {
	const forwarded = req.headers?.['x-forwarded-for'];
	if (typeof forwarded === 'string' && forwarded.trim()) {
		return forwarded.split(',')[0].trim();
	}
	return req.ip || req.socket?.remoteAddress || null;
}

function getRequestUserAgent(req) {
	return String(req.headers?.['user-agent'] || '').slice(0, 512);
}

function makeRefreshToken() {
	return crypto.randomBytes(64).toString('hex');
}

function getRefreshExpiryDate() {
	return new Date(Date.now() + (REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000));
}

async function createRefreshSession({ userId, req, rotatedFromId = null }) {
	const rawRefreshToken = makeRefreshToken();
	const tokenHash = hashRefreshToken(rawRefreshToken);
	const expiresAt = getRefreshExpiryDate();
	const created = await authDb.createRefreshSessionQuery({
		userId,
		tokenHash,
		expiresAt,
		ipAddress: getRequestIp(req),
		userAgent: getRequestUserAgent(req),
		rotatedFromId,
	});
	return {
		rawRefreshToken,
		expiresAt,
		sessionId: created.id,
	};
}

async function issueAuthSession(res, user, req) {
	const accessToken = signAccessToken(user);
	const refresh = await createRefreshSession({ userId: user.id, req });
	res.cookie(REFRESH_COOKIE_NAME, refresh.rawRefreshToken, getRefreshCookieOptions());
	return {
		accessToken,
	};
}

async function rotateAuthSession(res, req, rawRefreshToken) {
	if (!rawRefreshToken) return null;
	const tokenHash = hashRefreshToken(rawRefreshToken);
	const existingSession = await authDb.getActiveRefreshSessionByHashQuery(tokenHash);
	if (!existingSession) return null;

	const user = await authDb.getUserById(existingSession.user_id);
	if (!user) {
		await authDb.revokeRefreshSessionByIdQuery(existingSession.id, 'missing_user', null);
		return null;
	}

	const nextSession = await createRefreshSession({
		userId: user.id,
		req,
		rotatedFromId: existingSession.id,
	});
	await authDb.revokeRefreshSessionByIdQuery(
		existingSession.id,
		'rotated',
		nextSession.sessionId,
	);
	res.cookie(REFRESH_COOKIE_NAME, nextSession.rawRefreshToken, getRefreshCookieOptions());

	return {
		accessToken: signAccessToken(user),
		user,
	};
}

async function revokeAuthSessionByToken(rawRefreshToken, reason = 'logout') {
	if (!rawRefreshToken) return;
	const tokenHash = hashRefreshToken(rawRefreshToken);
	await authDb.revokeRefreshSessionByHashQuery(tokenHash, reason, null);
}

module.exports = {
	clearRefreshCookie,
	getRefreshTokenFromRequest,
	issueAuthSession,
	revokeAuthSessionByToken,
	rotateAuthSession,
	signAccessToken,
	getRequestIp,
};
