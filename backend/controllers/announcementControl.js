const dbAnnounce = require('../db/queryAnnouncements');
const dbClass = require('../db/queryClasses');

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

module.exports = {
	postAnnouncement,
	getClassAnnouncements,
	getAnnouncementById,
	getStudentAnnouncements,
	deleteAnnouncement,
};
