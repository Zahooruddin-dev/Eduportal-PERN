const crypto = require('crypto');
const pool = require('../db/Pool');
const calendarDb = require('../db/queryCalendar');
const { buildCalendarData, buildIcsCalendar } = require('../utility/calendarFeed');

const TOKEN_TTL_DAYS = 90;

function isSupportedRole(role) {
	return role === 'student' || role === 'teacher';
}

function buildBaseUrl(req) {
	const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
	const host = req.get('host');
	return `${protocol}://${host}`;
}

function hashToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function createRawToken() {
	return crypto.randomBytes(32).toString('hex');
}

function buildSubscriptionPayload(req, rawToken, tokenRecord) {
	const baseUrl = buildBaseUrl(req);
	const path = `/api/calendar/public/${encodeURIComponent(rawToken)}.ics`;
	const subscribeUrl = `${baseUrl}${path}`;
	const webcalUrl = subscribeUrl.replace(/^https?:\/\//i, 'webcal://');
	return {
		subscribeUrl,
		webcalUrl,
		expiresAt: tokenRecord.expires_at,
		createdAt: tokenRecord.created_at,
		ttlDays: TOKEN_TTL_DAYS,
	};
}

async function issueCalendarToken(user) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await calendarDb.revokeActiveCalendarFeedTokensByUserId(user.id, client);
		const rawToken = createRawToken();
		const tokenHash = hashToken(rawToken);
		const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
		const record = await calendarDb.createCalendarFeedToken(
			{
				userId: user.id,
				instituteId: user.instituteId,
				tokenHash,
				expiresAt,
			},
			client,
		);
		await client.query('COMMIT');
		return { rawToken, record };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getCalendarCoreForUser(user) {
	if (!isSupportedRole(user.role)) {
		return {
			errorCode: 403,
			error: 'Calendar feed is available only for student and teacher roles.',
		};
	}

	let classes = [];
	let assignments = [];

	if (user.role === 'student') {
		classes = await calendarDb.getStudentCalendarClasses(user.id);
		assignments = await calendarDb.getStudentCalendarAssignments(user.id);
	}
	if (user.role === 'teacher') {
		classes = await calendarDb.getTeacherCalendarClasses(user.id);
		assignments = await calendarDb.getTeacherCalendarAssignments(user.id);
	}

	const instituteId = user.instituteId || classes[0]?.institute_id || assignments[0]?.institute_id;
	if (!instituteId) {
		return {
			errorCode: 404,
			error: 'Institute not found for calendar user.',
		};
	}

	const term = await calendarDb.getPreferredAcademicTermForInstitute(instituteId);
	const classIds = classes.map((item) => item.class_id).filter(Boolean);
	const exceptions = await calendarDb.listAcademicExceptionsForInstitute(instituteId, {
		termId: term?.id || null,
		classIds,
		onlyInstructional: false,
	});
	const calendarData = buildCalendarData({ classes, assignments, exceptions, term });
	return {
		instituteId,
		calendarData,
	};
}

async function getMyCalendarEvents(req, res) {
	try {
		const result = await getCalendarCoreForUser(req.user);
		if (result.error) {
			return res.status(result.errorCode).json({ message: result.error });
		}
		return res.status(200).json({
			term: result.calendarData.term,
			events: result.calendarData.events,
			classSessions: result.calendarData.classSessions,
			deadlines: result.calendarData.deadlines,
			exceptions: result.calendarData.exceptions,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getMyCalendarIcs(req, res) {
	try {
		const result = await getCalendarCoreForUser(req.user);
		if (result.error) {
			return res.status(result.errorCode).json({ message: result.error });
		}
		const ics = buildIcsCalendar({
			calendarName: `${req.user.username || 'User'} Academic Calendar`,
			events: [
				...result.calendarData.classSessions,
				...result.calendarData.deadlines,
				...result.calendarData.exceptions,
			],
		});
		res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
		res.setHeader('Content-Disposition', 'attachment; filename="academic-calendar.ics"');
		return res.status(200).send(ics);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getMyCalendarSubscription(req, res) {
	try {
		if (!isSupportedRole(req.user.role)) {
			return res.status(403).json({ message: 'Calendar subscription is available only for student and teacher roles.' });
		}

		const activeToken = await calendarDb.getActiveCalendarFeedTokenByUserId(req.user.id);
		return res.status(200).json({
			hasActiveSubscription: Boolean(activeToken),
			expiresAt: activeToken?.expires_at || null,
			createdAt: activeToken?.created_at || null,
			ttlDays: TOKEN_TTL_DAYS,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function createMyCalendarSubscription(req, res) {
	try {
		if (!isSupportedRole(req.user.role)) {
			return res.status(403).json({ message: 'Calendar subscription is available only for student and teacher roles.' });
		}

		const { rawToken, record } = await issueCalendarToken(req.user);
		return res.status(201).json(buildSubscriptionPayload(req, rawToken, record));
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function rotateMyCalendarSubscription(req, res) {
	try {
		if (!isSupportedRole(req.user.role)) {
			return res.status(403).json({ message: 'Calendar subscription is available only for student and teacher roles.' });
		}

		const { rawToken, record } = await issueCalendarToken(req.user);
		return res.status(200).json(buildSubscriptionPayload(req, rawToken, record));
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getPublicCalendarIcs(req, res) {
	try {
		const rawToken = String(req.params.token || '').trim();
		if (!rawToken || rawToken.length < 16) {
			return res.status(404).json({ message: 'Calendar feed not found.' });
		}

		const tokenHash = hashToken(rawToken);
		const tokenRecord = await calendarDb.getCalendarFeedTokenByHash(tokenHash);
		if (!tokenRecord) {
			return res.status(404).json({ message: 'Calendar feed not found.' });
		}
		if (tokenRecord.revoked_at) {
			return res.status(410).json({ message: 'Calendar feed revoked.' });
		}
		if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
			return res.status(410).json({ message: 'Calendar feed expired.' });
		}

		const result = await getCalendarCoreForUser({
			id: tokenRecord.user_id,
			role: tokenRecord.role,
			instituteId: tokenRecord.user_institute_id || tokenRecord.institute_id,
			username: tokenRecord.username,
		});
		if (result.error) {
			return res.status(404).json({ message: 'Calendar feed not found.' });
		}

		const ics = buildIcsCalendar({
			calendarName: `${tokenRecord.username || 'Academic'} Calendar`,
			events: [
				...result.calendarData.classSessions,
				...result.calendarData.deadlines,
				...result.calendarData.exceptions,
			],
		});
		res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
		res.setHeader('Content-Disposition', 'inline; filename="academic-calendar.ics"');
		return res.status(200).send(ics);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getMyCalendarEvents,
	getMyCalendarIcs,
	getMyCalendarSubscription,
	createMyCalendarSubscription,
	rotateMyCalendarSubscription,
	getPublicCalendarIcs,
};
