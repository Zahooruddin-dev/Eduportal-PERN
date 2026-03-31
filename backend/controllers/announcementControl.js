const dbAnnounce = require('../db/queryAnnouncements');
const dbClass = require('../db/queryClasses');

const ADMIN_AUDIENCE_SCOPES = new Set([
	'all',
	'students',
	'teachers',
	'parents',
	'students_teachers',
	'students_parents',
	'teachers_parents',
]);

function normalizeAudience(value) {
	return String(value || '').trim().toLowerCase();
}

function getAudienceScopesForRole(role) {
	const normalized = String(role || '').trim().toLowerCase();
	if (normalized === 'student') {
		return ['all', 'students', 'students_teachers', 'students_parents'];
	}
	if (normalized === 'teacher') {
		return ['all', 'teachers', 'students_teachers', 'teachers_parents'];
	}
	if (normalized === 'parent') {
		return ['all', 'parents', 'students_parents', 'teachers_parents'];
	}
	if (normalized === 'admin') {
		return ['all', ...ADMIN_AUDIENCE_SCOPES];
	}
	return [];
}

function normalizeOptionalIsoDate(value) {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString();
}

async function postAnnouncement(req, res) {
  const { classId } = req.params;
  const { title, content, expires_at } = req.body;
  const teacherId = req.user.id;

  // Ensure teacherId exists (token must contain id)
  if (!teacherId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Convert empty string to null for expires_at as it's optional in the frontend
  const expiresAt = expires_at && expires_at !== '' ? expires_at : null;

  try {
    const targetClass = await dbClass.getClassByIdQuery(classId);
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (targetClass.teacher_id !== teacherId) {
      return res.status(403).json({ error: "Unauthorized: You don't teach this class" });
    }

    const announcement = await dbAnnounce.createAnnouncementQuery(
      classId,
      teacherId,
      title,
      content,
      expiresAt
    );
    res.status(201).json(announcement);
  } catch (err) {
    console.error(err); // Log the full error for debugging
    res.status(500).json({ error: err.message });
  }
}

async function getClassAnnouncements(req, res) {
	const { classId } = req.params;
	try {
		const list = await dbAnnounce.getAnnouncementsByClassQuery(classId);
		res.status(200).json(list);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getAnnouncementById(req, res) {
	const { announcementId } = req.params;
	try {
		const announcement =
			await dbAnnounce.getAnnouncementByIdQuery(announcementId);

		if (!announcement) {
			return res.status(404).json({ error: 'Announcement not found' });
		}

		res.status(200).json(announcement);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getStudentAnnouncements(req, res) {
	const studentId = req.user.id;
	try {
		const list = await dbAnnounce.getAnnouncementsForStudentQuery(studentId);
		res.status(200).json(list);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function deleteAnnouncement(req, res) {
	const { announcementId } = req.params;
	const teacherId = req.user.id;
	try {
		const deleted = await dbAnnounce.deleteAnnouncementQuery(
			announcementId,
			teacherId,
		);
		if (!deleted) {
			return res
				.status(404)
				.json({ error: 'Announcement not found or unauthorized.' });
		}
		res.status(200).json({ message: 'Announcement deleted.' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function createAdminAnnouncement(req, res) {
	const instituteId = req.user?.instituteId;
	const createdBy = req.user?.id;
	const title = String(req.body?.title || '').trim();
	const content = String(req.body?.content || '').trim();
	const audienceScope = normalizeAudience(req.body?.audienceScope);
	const expiresAt = req.body?.expiresAt ? normalizeOptionalIsoDate(req.body?.expiresAt) : null;

	if (!instituteId || !createdBy) {
		return res.status(403).json({ message: 'Admin institute context is required.' });
	}
	if (!title || !content) {
		return res.status(400).json({ message: 'Title and content are required.' });
	}
	if (!ADMIN_AUDIENCE_SCOPES.has(audienceScope)) {
		return res.status(400).json({ message: 'Invalid audience scope.' });
	}
	if (req.body?.expiresAt && !expiresAt) {
		return res.status(400).json({ message: 'Invalid expiry date.' });
	}

	try {
		const created = await dbAnnounce.createAdminAnnouncementQuery({
			instituteId,
			createdBy,
			title,
			content,
			audienceScope,
			expiresAt,
		});
		return res.status(201).json(created);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function listAdminAnnouncements(req, res) {
	const instituteId = req.user?.instituteId;
	if (!instituteId) {
		return res.status(403).json({ message: 'Admin institute context is required.' });
	}

	try {
		const list = await dbAnnounce.listAdminAnnouncementsForInstituteQuery(instituteId);
		return res.status(200).json(list);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function deleteAdminAnnouncement(req, res) {
	const instituteId = req.user?.instituteId;
	const { announcementId } = req.params;
	if (!instituteId) {
		return res.status(403).json({ message: 'Admin institute context is required.' });
	}

	try {
		const deleted = await dbAnnounce.deleteAdminAnnouncementQuery({
			announcementId,
			instituteId,
		});
		if (!deleted) {
			return res.status(404).json({ message: 'Announcement not found.' });
		}
		return res.status(200).json({ message: 'Announcement deleted.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getUserAdminAnnouncements(req, res) {
	const audienceScopes = getAudienceScopesForRole(req.user?.role);
	if (!audienceScopes.length) {
		return res.status(200).json([]);
	}

	const includeRead = String(req.query?.includeRead || 'true').toLowerCase() !== 'false';
	try {
		const list = await dbAnnounce.getUserAdminAnnouncementsQuery({
			userId: req.user.id,
			instituteId: req.user.instituteId,
			audienceScopes,
			includeRead,
		});
		return res.status(200).json(list);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getAdminAnnouncementUnreadSummary(req, res) {
	const audienceScopes = getAudienceScopesForRole(req.user?.role);
	if (!audienceScopes.length) {
		return res.status(200).json({ unreadCount: 0, items: [] });
	}

	const limit = Number.isFinite(Number(req.query?.limit))
		? Math.max(1, Math.min(20, Math.trunc(Number(req.query.limit))))
		: 5;

	try {
		const summary = await dbAnnounce.getUnreadAdminAnnouncementSummaryQuery({
			userId: req.user.id,
			instituteId: req.user.instituteId,
			audienceScopes,
			limit,
		});
		return res.status(200).json(summary);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function markAdminAnnouncementRead(req, res) {
	const audienceScopes = getAudienceScopesForRole(req.user?.role);
	if (!audienceScopes.length) {
		return res.status(403).json({ message: 'This role cannot access announcement notifications.' });
	}

	try {
		const updated = await dbAnnounce.markAdminAnnouncementReadQuery({
			announcementId: req.params.announcementId,
			userId: req.user.id,
			instituteId: req.user.instituteId,
			audienceScopes,
		});
		if (!updated) {
			return res.status(404).json({ message: 'Announcement not found for this account.' });
		}
		return res.status(200).json(updated);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function markAllAdminAnnouncementsRead(req, res) {
	const audienceScopes = getAudienceScopesForRole(req.user?.role);
	if (!audienceScopes.length) {
		return res.status(403).json({ message: 'This role cannot access announcement notifications.' });
	}

	try {
		const updatedCount = await dbAnnounce.markAllAdminAnnouncementsReadQuery({
			userId: req.user.id,
			instituteId: req.user.instituteId,
			audienceScopes,
		});
		return res.status(200).json({ updatedCount });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	postAnnouncement,
	getClassAnnouncements,
	getAnnouncementById,
	getStudentAnnouncements,
	deleteAnnouncement,
	createAdminAnnouncement,
	listAdminAnnouncements,
	deleteAdminAnnouncement,
	getUserAdminAnnouncements,
	getAdminAnnouncementUnreadSummary,
	markAdminAnnouncementRead,
	markAllAdminAnnouncementsRead,
};
