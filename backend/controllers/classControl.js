const db = require('../db/queryClasses');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const DAY_NORMALIZATION = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday',
	monday: 'Monday',
	tuesday: 'Tuesday',
	wednesday: 'Wednesday',
	thursday: 'Thursday',
	friday: 'Friday',
	saturday: 'Saturday',
	sunday: 'Sunday',
};

const DAY_ORDER = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
];

function normalizeTime(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	const shortMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
	if (shortMatch) {
		const hour = Number(shortMatch[1]);
		const minute = Number(shortMatch[2]);
		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}
	const longMatch = /^(\d{2}:\d{2}):\d{2}$/.exec(trimmed);
	if (longMatch) return longMatch[1];
	return null;
}

function normalizeDay(value) {
	if (typeof value !== 'string') return null;
	const key = value.trim().toLowerCase();
	return DAY_NORMALIZATION[key] || null;
}

function normalizeScheduleBlocks(scheduleBlocks, legacySchedule = {}) {
	let blocks = [];

	if (Array.isArray(scheduleBlocks) && scheduleBlocks.length > 0) {
		blocks = scheduleBlocks
			.map((item) => {
				const day = normalizeDay(item?.day);
				const start_time = normalizeTime(item?.start_time);
				const end_time = normalizeTime(item?.end_time);
				if (!day || !start_time || !end_time || start_time >= end_time) return null;
				return { day, start_time, end_time };
			})
			.filter(Boolean);
	}

	if (!blocks.length) {
		const start_time = normalizeTime(legacySchedule.start_time);
		const end_time = normalizeTime(legacySchedule.end_time);
		const dayTokens = String(legacySchedule.schedule_days || '')
			.split(',')
			.map((token) => normalizeDay(token))
			.filter(Boolean);

		if (start_time && end_time && start_time < end_time && dayTokens.length) {
			blocks = dayTokens.map((day) => ({ day, start_time, end_time }));
		}
	}

	blocks.sort((a, b) => {
		const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
		if (dayDiff !== 0) return dayDiff;
		return a.start_time.localeCompare(b.start_time);
	});

	const scheduleDays = [...new Set(blocks.map((block) => block.day.slice(0, 3)))].join(', ');
	const startTime = blocks[0]?.start_time || null;
	const endTime = blocks[0]?.end_time || null;

	return {
		blocks,
		scheduleDays,
		startTime,
		endTime,
	};
}

function isValidMeetingLink(value) {
	if (!value) return true;
	if (typeof value !== 'string') return false;
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

async function getClasses(req, res) {
	const instituteId = req.user?.instituteId;
	if (!instituteId) {
		return res.status(403).json({ error: 'User is not linked to an institute.' });
	}

	try {
		const classes = await db.getAllClassesQuery(instituteId);
		res.json(classes);
	} catch {
		res.status(500).json({ error: 'Failed to fetch classes.' });
	}
}
async function createClasses(req, res) {
	if (req.user.role !== 'teacher') {
		return res.status(403).json({ error: 'Only teachers can create class schedules.' });
	}

	const {
		class_name,
		schedule_days,
		start_time,
		end_time,
		schedule_blocks,
		room_number,
		grade_level,
		subject,
		description,
		max_students,
		meeting_link,
		schedule_timezone,
	} = req.body;
	const teacher_id = req.user.id;
	const normalizedSchedule = normalizeScheduleBlocks(schedule_blocks, {
		schedule_days,
		start_time,
		end_time,
	});

	if (!class_name || !String(class_name).trim()) {
		return res.status(400).json({ error: 'Class name is required.' });
	}

	if (!normalizedSchedule.blocks.length) {
		return res
			.status(400)
			.json({ error: 'At least one valid schedule block is required.' });
	}

	if (!isValidMeetingLink(meeting_link)) {
		return res
			.status(400)
			.json({ error: 'Meeting link must be a valid URL.' });
	}

	try {
		const newClass = await db.CreateNewClassQuery({
			class_name: String(class_name).trim(),
			schedule_days: normalizedSchedule.scheduleDays,
			start_time: normalizedSchedule.startTime,
			end_time: normalizedSchedule.endTime,
			schedule_blocks: normalizedSchedule.blocks,
			room_number,
			grade_level,
			subject,
			description,
			max_students: Number.isFinite(Number(max_students))
				? Number(max_students)
				: 30,
			meeting_link,
			schedule_timezone: schedule_timezone || 'UTC',
			teacher_id,
		});
		res.status(201).json(newClass);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}

async function updateClass(req, res) {
	if (req.user.role !== 'teacher') {
		return res.status(403).json({ error: 'Only teachers can update class schedules.' });
	}

	const { id } = req.params;
	if (!isUuid(id)) {
		return res.status(400).json({ error: 'Invalid class id format.' });
	}
	const {
		class_name,
		schedule_days,
		start_time,
		end_time,
		schedule_blocks,
		room_number,
		grade_level,
		subject,
		description,
		max_students,
		meeting_link,
		schedule_timezone,
	} = req.body;
	const teacher_id = req.user.id;
	const normalizedSchedule = normalizeScheduleBlocks(schedule_blocks, {
		schedule_days,
		start_time,
		end_time,
	});

	if (!class_name || !String(class_name).trim()) {
		return res.status(400).json({ error: 'Class name is required.' });
	}

	if (!normalizedSchedule.blocks.length) {
		return res
			.status(400)
			.json({ error: 'At least one valid schedule block is required.' });
	}

	if (!isValidMeetingLink(meeting_link)) {
		return res
			.status(400)
			.json({ error: 'Meeting link must be a valid URL.' });
	}

	try {
		const updated = await db.updateClassQuery({
			class_name: String(class_name).trim(),
			schedule_days: normalizedSchedule.scheduleDays,
			start_time: normalizedSchedule.startTime,
			end_time: normalizedSchedule.endTime,
			schedule_blocks: normalizedSchedule.blocks,
			room_number,
			grade_level,
			subject,
			description,
			max_students: Number.isFinite(Number(max_students))
				? Number(max_students)
				: 30,
			meeting_link,
			schedule_timezone: schedule_timezone || 'UTC',
			id,
			teacher_id,
		});

		if (!updated) {
			return res
				.status(404)
				.json({ error: 'Class not found or unauthorized.' });
		}
		res.json(updated);
	} catch (err) {
		console.error(err);
		if (err.code === '22P02') {
			return res.status(400).json({ error: 'Invalid class id format.' });
		}
		res.status(500).json({ error: 'Failed to update class.' });
	}
}
async function deleteClass(req, res) {
	const { id } = req.params;
	if (!isUuid(id)) {
		return res.status(400).json({ error: 'Invalid class id format.' });
	}
	try {
		const existingClass = await db.getClassByIdQuery(id);
		if (!existingClass) {
			return res.status(404).json({ error: 'Class not found.' });
		}

		if (req.user.role === 'teacher' && existingClass.teacher_id !== req.user.id) {
			return res.status(403).json({ error: 'Unauthorized to delete this class.' });
		}

		if (req.user.role === 'admin' && existingClass.institute_id !== req.user.instituteId) {
			return res.status(403).json({ error: 'Unauthorized to delete this class.' });
		}

		if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
			return res.status(403).json({ error: 'Unauthorized to delete this class.' });
		}

		const deleted = await db.deleteClassByIdQuery(id);
		if (!deleted) {
			return res.status(404).json({ error: 'Class not found.' });
		}
		res.status(200).json({ message: 'Class deleted successfully' });
	} catch (err) {
		if (err.code === '22P02') {
			return res.status(400).json({ error: 'Invalid class id format.' });
		}
		res.status(500).json({ error: 'Failed to delete class.' });
	}
}
async function getSpecificClass(req, res) {
	const { id } = req.params;
	if (!isUuid(id)) {
		return res.status(400).json({ error: 'Invalid class id format.' });
	}
	try {
		const subjectClass = await db.getClassByIdQuery(id);
		if (!subjectClass)
			return res.status(404).json({ error: 'Class not found' });

		if (!req.user || subjectClass.institute_id !== req.user.instituteId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		res.status(200).json(subjectClass);
	} catch (err) {
		if (err.code === '22P02') {
			return res.status(400).json({ error: 'Invalid class id format.' });
		}
		res.status(500).json({ error: 'Failed to fetch class.' });
	}
}
async function editSpecificClass(req, res) {
	if (req.user.role !== 'teacher') {
		return res.status(403).json({ error: 'Only teachers can edit class schedules.' });
	}

	const { id } = req.params;
	if (!isUuid(id)) {
		return res.status(400).json({ error: 'Invalid class id format.' });
	}
	try {
		const existingClass = await db.getClassByIdQuery(id);

		if (!existingClass) {
			return res.status(404).json({ error: 'Class not found' });
		}

		if (existingClass.teacher_id !== req.user.id) {
			return res
				.status(403)
				.json({ error: "You don't have permission to edit this class" });
		}

		const subjectClass = await db.queryEditClassQuery(id, req.body);
		res.status(200).json(subjectClass);
	} catch (err) {
		if (err.code === '22P02') {
			return res.status(400).json({ error: 'Invalid class id format.' });
		}
		res.status(500).json({ error: 'Failed to edit class.' });
	}
}
async function getMyClasses(req, res) {
	try {
		const classes = await db.getClassesByTeacherIdQuery(req.user.id);
		res.status(200).json(classes);
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch your classes.' });
	}
}
module.exports = {
	getClasses,
	createClasses,
	deleteClass,
	getSpecificClass,
	editSpecificClass,
	getMyClasses,
	updateClass,
};
