const db = require('../db/queryResources');
const dbClass = require('../db/queryClasses');
const dbEnroll = require('../db/queryEnrollment');
const dbAttendance = require('../db/queryAttendence');
const dbProgress = require('../db/queryResourceProgress');

const cloudinary = require('cloudinary').v2;

function extractYouTubeVideoId(rawUrl) {
	try {
		const parsed = new URL(String(rawUrl || '').trim());
		const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

		if (host === 'youtu.be') {
			const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
			return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
		}

		if (
			host === 'youtube.com' ||
			host === 'm.youtube.com' ||
			host === 'music.youtube.com'
		) {
			const queryId = parsed.searchParams.get('v');
			if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) {
				return queryId;
			}

			const segments = parsed.pathname.split('/').filter(Boolean);
			if (
				(segments[0] === 'embed' || segments[0] === 'shorts') &&
				segments[1] &&
				/^[a-zA-Z0-9_-]{11}$/.test(segments[1])
			) {
				return segments[1];
			}
		}
	} catch {
		return null;
	}

	return null;
}

function normalizeYouTubeUrl(rawUrl) {
	const videoId = extractYouTubeVideoId(rawUrl);
	if (!videoId) return null;
	return `https://www.youtube.com/watch?v=${videoId}`;
}

function toDateString(dateObj) {
	const year = dateObj.getUTCFullYear();
	const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
	const day = String(dateObj.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getTodayDateString() {
	return toDateString(new Date());
}

function parseDateInput(value) {
	const text = String(value || '').trim();
	if (!text) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null;
	}
	if (month < 1 || month > 12) return null;
	if (day < 1 || day > 31) return null;

	const parsed = new Date(Date.UTC(year, month - 1, day));
	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() + 1 !== month ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}

	return toDateString(parsed);
}

function toNonNegativeNumber(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric < 0) return null;
	return numeric;
}

function isExpired(value) {
	if (!value) return false;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return false;
	return date.getTime() < Date.now();
}

const ALLOWED_CONTENT_MODES = new Set(['view', 'read']);
const ALLOWED_MATERIAL_CATEGORIES = new Set([
	'lecture',
	'reading',
	'glossary',
	'notice',
	'info',
	'download',
	'assessment',
]);

function normalizeContentMode(value, type) {
	const fallback = type === 'youtube' ? 'view' : 'read';
	const normalized = String(value || fallback).trim().toLowerCase();
	if (!ALLOWED_CONTENT_MODES.has(normalized)) return null;
	return normalized;
}

function normalizeMaterialCategory(value, contentMode) {
	const fallback = contentMode === 'view' ? 'lecture' : 'reading';
	const normalized = String(value || fallback).trim().toLowerCase();
	if (!ALLOWED_MATERIAL_CATEGORIES.has(normalized)) return null;
	return normalized;
}

function normalizeTags(value) {
	if (value === undefined || value === null || value === '') return null;
	if (Array.isArray(value)) {
		const tags = value
			.map((tag) => String(tag || '').trim())
			.filter(Boolean);
		return tags.length ? tags : null;
	}
	const tags = String(value)
		.split(',')
		.map((tag) => String(tag || '').trim())
		.filter(Boolean);
	return tags.length ? tags : null;
}

async function createResource(req, res) {
	const { classId } = req.params;
	const teacherId = req.user.id;
	const {
		title,
		type,
		content,
		description,
		tags,
		isPublished,
		expiresAt,
		contentMode,
		materialCategory,
		meta,
	} = req.body;
	let fileUrl = null;
	let normalizedContent = null;
	let youtubeVideoId = null;
	let parsedMeta = {};

	try {
		if (meta && typeof meta === 'string') {
			parsedMeta = JSON.parse(meta);
		} else if (meta && typeof meta === 'object') {
			parsedMeta = meta;
		}
	} catch {
		return res.status(400).json({ error: 'meta must be valid JSON.' });
	}

	if (type === 'file') {
		if (!req.file)
			return res
				.status(400)
				.json({ error: 'File is required for type "file".' });
		fileUrl = req.file.path; // Cloudinary URL
	} else if (type === 'link') {
		if (!content)
			return res
				.status(400)
				.json({ error: 'Content (URL) is required for type "link".' });
		normalizedContent = String(content).trim();
	} else if (type === 'youtube') {
		normalizedContent = normalizeYouTubeUrl(content);
		if (!normalizedContent) {
			return res.status(400).json({
				error: 'A valid YouTube URL is required for type "youtube".',
			});
		}
		youtubeVideoId = extractYouTubeVideoId(normalizedContent);
	} else {
		return res.status(400).json({ error: 'Invalid resource type.' });
	}

	const normalizedContentMode = normalizeContentMode(contentMode, type);
	if (!normalizedContentMode) {
		return res.status(400).json({ error: 'Invalid content mode.' });
	}

	const normalizedMaterialCategory = normalizeMaterialCategory(
		materialCategory,
		normalizedContentMode,
	);
	if (!normalizedMaterialCategory) {
		return res.status(400).json({ error: 'Invalid material category.' });
	}

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });
		if (targetClass.teacher_id !== teacherId) {
			return res
				.status(403)
				.json({ error: 'Unauthorized: you do not teach this class' });
		}

		const resource = await db.createResourceQuery({
			classId,
			teacherId,
			title,
			type,
			content: fileUrl || normalizedContent,
			description,
			tags: normalizeTags(tags),
			isPublished: isPublished === 'true',
			expiresAt: expiresAt || null,
			youtubeVideoId,
			contentMode: normalizedContentMode,
			materialCategory: normalizedMaterialCategory,
			meta: parsedMeta,
		});
		res.status(201).json(resource);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function getClassResources(req, res) {
	const { classId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });

		let teacherId = null;
		if (userRole === 'teacher') {
			if (targetClass.teacher_id !== userId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
			teacherId = userId;
		} else if (userRole === 'admin') {
			if (!req.user.instituteId || targetClass.institute_id !== req.user.instituteId) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
			teacherId = targetClass.teacher_id;
		} else if (userRole === 'student') {
			const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, userId);
			if (!isEnrolled) {
				return res.status(403).json({ error: 'Unauthorized' });
			}
		} else {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const filters = {
			materialCategory: req.query?.category,
			contentMode: req.query?.mode,
			type: req.query?.type,
			search: req.query?.search,
			limit: req.query?.limit,
			offset: req.query?.offset,
		};

		const resources = await db.getResourcesByClassQuery(classId, teacherId, filters);
		res.json(resources);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getResourceProgressSummary(req, res) {
	const { classId, resourceId } = req.params;
	const userId = req.user.id;
	const userRole = req.user.role;

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return res.status(403).json({ error: 'Unauthorized' });
	}

	try {
		const targetClass = await dbClass.getClassByIdQuery(classId);
		if (!targetClass) return res.status(404).json({ error: 'Class not found' });

		if (userRole === 'teacher' && targetClass.teacher_id !== userId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		if (
			userRole === 'admin' &&
			(!req.user.instituteId || targetClass.institute_id !== req.user.instituteId)
		) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const resource = await db.getResourceByIdInClassQuery(resourceId, classId);
		if (!resource) return res.status(404).json({ error: 'Resource not found' });

		const summary = await dbProgress.getResourceProgressSummary(resourceId, classId);

		return res.status(200).json({
			resourceId,
			classId,
			summary,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
}

async function trackResourceProgress(req, res) {
	const { classId, resourceId } = req.params;
	const studentId = req.user.id;
	const {
		watchedSeconds,
		durationSeconds,
		currentTimeSeconds,
		attendanceDate,
	} = req.body || {};

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can track progress.' });
	}

	const duration = toNonNegativeNumber(durationSeconds);
	const watched = toNonNegativeNumber(watchedSeconds);
	const current = toNonNegativeNumber(currentTimeSeconds);

	if (!Number.isFinite(duration) || duration <= 0) {
		return res
			.status(400)
			.json({ error: 'durationSeconds must be a positive number.' });
	}

	if (watched === null && current === null) {
		return res.status(400).json({
			error: 'Provide watchedSeconds or currentTimeSeconds to track progress.',
		});
	}

	const lastPositionSeconds = current === null ? watched : current;
	const safeWatchSeconds = watched === null ? lastPositionSeconds : watched;
	const progressPercent = Math.min(
		100,
		Math.max(0, Number(((lastPositionSeconds / duration) * 100).toFixed(2))),
	);

	const thresholdReached = progressPercent >= 25;

	const selectedDate =
		attendanceDate === undefined
			? getTodayDateString()
			: parseDateInput(attendanceDate);

	if (!selectedDate) {
		return res.status(400).json({ error: 'Invalid attendanceDate format. Use YYYY-MM-DD.' });
	}

	try {
		const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, studentId);
		if (!isEnrolled) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const resource = await db.getResourceByIdInClassQuery(resourceId, classId);
		if (!resource) {
			return res.status(404).json({ error: 'Resource not found' });
		}

		if (resource.type !== 'youtube') {
			return res.status(400).json({
				error: 'Progress tracking is only enabled for YouTube resources.',
			});
		}

		if (!resource.is_published || isExpired(resource.expires_at)) {
			return res.status(403).json({ error: 'Resource is not available.' });
		}

		const progress = await dbProgress.upsertResourceProgress({
			resourceId,
			classId,
			studentId,
			watchSeconds: safeWatchSeconds,
			durationSeconds: duration,
			lastPositionSeconds,
			progressPercent,
			thresholdReached,
		});

		let attendanceMarked = false;
		const newlyReachedThreshold =
			!progress.previous_threshold && progress.threshold_25_reached;

		if (newlyReachedThreshold) {
			const attendanceEvent = await dbProgress.createAttendanceEventIfMissing({
				resourceId,
				classId,
				studentId,
				attendanceDate: selectedDate,
				progressPercent: progress.progress_percent,
			});

			if (attendanceEvent) {
				await dbAttendance.markBulkAttendance(
					classId,
					studentId,
					'present',
					selectedDate,
				);
				attendanceMarked = true;
			}
		}

		return res.status(200).json({
			resourceId,
			classId,
			progressPercent: Number(progress.progress_percent),
			thresholdReached: progress.threshold_25_reached,
			attendanceMarked,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
}

async function getMyResourceProgress(req, res) {
	const { classId, resourceId } = req.params;
	const studentId = req.user.id;

	if (req.user.role !== 'student') {
		return res.status(403).json({ error: 'Only students can access progress.' });
	}

	try {
		const isEnrolled = await dbEnroll.isStudentEnrolledInClassQuery(classId, studentId);
		if (!isEnrolled) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		const resource = await db.getResourceByIdInClassQuery(resourceId, classId);
		if (!resource) {
			return res.status(404).json({ error: 'Resource not found' });
		}

		const progress = await dbProgress.getResourceProgressForStudent(resourceId, studentId);

		return res.status(200).json({
			resourceId,
			classId,
			progressPercent: progress ? Number(progress.progress_percent) : 0,
			thresholdReached: progress ? Boolean(progress.threshold_25_reached) : false,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
}

async function updateResource(req, res) {
	const { resourceId } = req.params;
	const teacherId = req.user.id;
	const updates = req.body;
	try {
		const updated = await db.updateResourceQuery(
			resourceId,
			teacherId,
			updates,
		);
		if (!updated)
			return res
				.status(404)
				.json({ error: 'Resource not found or unauthorized' });
		res.json(updated);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function deleteResource(req, res) {
	const { resourceId } = req.params;
	const teacherId = req.user.id;
	try {
		const resource = await db.getResourceByIdQuery(resourceId);
		if (!resource) return res.status(404).json({ error: 'Resource not found' });

		// Check if the teacher owns this resource
		if (resource.teacher_id !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		if (resource.type === 'file' && resource.content) {
			const urlParts = resource.content.split('/');
			const versionIndex = urlParts.findIndex((part) => part.startsWith('v'));
			if (versionIndex !== -1) {
				const publicIdWithFolder = urlParts
					.slice(versionIndex + 1)
					.join('/')
					.split('.')[0];
				await cloudinary.uploader.destroy(publicIdWithFolder, {
					resource_type: 'raw',
				});
			}
		}

		// Delete database record
		const deleted = await db.deleteResourceQuery(resourceId, teacherId);
		if (!deleted)
			return res
				.status(404)
				.json({ error: 'Resource not found or unauthorized' });

		res.json({ message: 'Resource deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

module.exports = {
	createResource,
	getClassResources,
	updateResource,
	deleteResource,
	trackResourceProgress,
	getMyResourceProgress,
	getResourceProgressSummary,
};
