const pool = require('../db/Pool');
const adminDb = require('../db/queryAdmin');
const calendarDb = require('../db/queryCalendar');

const ALLOWED_EXCEPTION_CATEGORIES = new Set(['holiday', 'closure', 'event', 'exam', 'other']);

function isUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeDate(value) {
	const text = String(value || '').trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
	return text;
}

function toBoolean(value, fallback = false) {
	if (value === undefined || value === null) return fallback;
	if (typeof value === 'boolean') return value;
	const text = String(value).trim().toLowerCase();
	return text === 'true' || text === '1' || text === 'yes' || text === 'y';
}

function normalizeCategory(value) {
	const category = String(value || 'holiday').trim().toLowerCase();
	if (!ALLOWED_EXCEPTION_CATEGORIES.has(category)) return null;
	return category;
}

function parseOptionalUuid(value) {
	if (value === undefined) return undefined;
	if (value === null || value === '') return null;
	return String(value);
}

async function getAdminInstituteOr404(userId, res) {
	const institute = await adminDb.getInstituteByUserIdQuery(userId);
	if (!institute) {
		res.status(404).json({ message: 'Institute not found for this admin account.' });
		return null;
	}
	return institute;
}

async function listAcademicTerms(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	try {
		const terms = await calendarDb.listAcademicTermsByInstitute(institute.id);
		return res.status(200).json(terms);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function createAcademicTerm(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const label = String(req.body?.label || '').trim();
	const startsOn = normalizeDate(req.body?.startsOn);
	const endsOn = normalizeDate(req.body?.endsOn);
	const isActive = toBoolean(req.body?.isActive, false);

	if (!label || !startsOn || !endsOn) {
		return res.status(400).json({ message: 'label, startsOn, and endsOn are required.' });
	}
	if (startsOn > endsOn) {
		return res.status(400).json({ message: 'startsOn must be before or equal to endsOn.' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		if (isActive) {
			await calendarDb.setAcademicTermsInactive(institute.id, client);
		}
		const term = await calendarDb.createAcademicTerm(
			{
				instituteId: institute.id,
				label,
				startsOn,
				endsOn,
				isActive,
				createdBy: req.user.id,
			},
			client,
		);
		await client.query('COMMIT');
		return res.status(201).json(term);
	} catch (error) {
		await client.query('ROLLBACK');
		if (error.code === '23505') {
			return res.status(409).json({ message: 'A term with this label and date range already exists.' });
		}
		return res.status(500).json({ message: error.message });
	} finally {
		client.release();
	}
}

async function updateAcademicTerm(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const termId = req.params.termId;
	const existing = await calendarDb.getAcademicTermById(termId, institute.id);
	if (!existing) {
		return res.status(404).json({ message: 'Academic term not found.' });
	}

	const label = req.body?.label === undefined ? undefined : String(req.body.label || '').trim();
	const startsOn = req.body?.startsOn === undefined ? undefined : normalizeDate(req.body.startsOn);
	const endsOn = req.body?.endsOn === undefined ? undefined : normalizeDate(req.body.endsOn);
	const isActive = req.body?.isActive === undefined ? undefined : toBoolean(req.body.isActive, false);

	if (label !== undefined && !label) {
		return res.status(400).json({ message: 'label cannot be empty.' });
	}
	if (req.body?.startsOn !== undefined && !startsOn) {
		return res.status(400).json({ message: 'startsOn must be a valid date in YYYY-MM-DD format.' });
	}
	if (req.body?.endsOn !== undefined && !endsOn) {
		return res.status(400).json({ message: 'endsOn must be a valid date in YYYY-MM-DD format.' });
	}

	const finalStart = startsOn || existing.starts_on;
	const finalEnd = endsOn || existing.ends_on;
	if (finalStart > finalEnd) {
		return res.status(400).json({ message: 'startsOn must be before or equal to endsOn.' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		if (isActive === true) {
			await calendarDb.setAcademicTermsInactive(institute.id, client);
		}
		const updated = await calendarDb.updateAcademicTerm(
			{
				termId,
				instituteId: institute.id,
				label,
				startsOn,
				endsOn,
				isActive,
			},
			client,
		);
		await client.query('COMMIT');
		if (!updated) {
			return res.status(404).json({ message: 'Academic term not found.' });
		}
		return res.status(200).json(updated);
	} catch (error) {
		await client.query('ROLLBACK');
		if (error.code === '23505') {
			return res.status(409).json({ message: 'A term with this label and date range already exists.' });
		}
		return res.status(500).json({ message: error.message });
	} finally {
		client.release();
	}
}

async function deleteAcademicTerm(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	try {
		const deletedCount = await calendarDb.deleteAcademicTerm(req.params.termId, institute.id);
		if (!deletedCount) {
			return res.status(404).json({ message: 'Academic term not found.' });
		}
		return res.status(200).json({ message: 'Academic term deleted.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function listAcademicExceptions(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const classId = req.query?.classId ? String(req.query.classId) : null;
	const termId = req.query?.termId ? String(req.query.termId) : null;

	try {
		const exceptions = await calendarDb.listAcademicExceptionsByInstitute(institute.id, {
			classId,
			termId,
		});
		return res.status(200).json(exceptions);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function createAcademicException(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const title = String(req.body?.title || '').trim();
	const description = req.body?.description === undefined ? null : String(req.body.description || '').trim();
	const category = normalizeCategory(req.body?.category);
	const startsOn = normalizeDate(req.body?.startsOn);
	const endsOn = normalizeDate(req.body?.endsOn);
	const blocksInstruction = toBoolean(req.body?.blocksInstruction, true);
	const classId = parseOptionalUuid(req.body?.classId);
	const termId = parseOptionalUuid(req.body?.termId);

	if (!title || !category || !startsOn || !endsOn) {
		return res.status(400).json({ message: 'title, category, startsOn, and endsOn are required.' });
	}
	if (startsOn > endsOn) {
		return res.status(400).json({ message: 'startsOn must be before or equal to endsOn.' });
	}

	if (classId && !isUuid(classId)) {
		return res.status(400).json({ message: 'classId format is invalid.' });
	}

	if (termId && !isUuid(termId)) {
		return res.status(400).json({ message: 'termId format is invalid.' });
	}

	if (classId) {
		const classRecord = await calendarDb.validateClassInInstitute(classId, institute.id);
		if (!classRecord) {
			return res.status(400).json({ message: 'classId does not belong to your institute.' });
		}
	}

	if (termId) {
		const termRecord = await calendarDb.validateTermInInstitute(termId, institute.id);
		if (!termRecord) {
			return res.status(400).json({ message: 'termId does not belong to your institute.' });
		}
	}

	try {
		const created = await calendarDb.createAcademicException({
			instituteId: institute.id,
			classId,
			termId,
			title,
			description,
			category,
			startsOn,
			endsOn,
			blocksInstruction,
			createdBy: req.user.id,
		});
		return res.status(201).json(created);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function updateAcademicException(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	const exceptionId = req.params.exceptionId;
	const existing = await calendarDb.getAcademicExceptionById(exceptionId, institute.id);
	if (!existing) {
		return res.status(404).json({ message: 'Academic exception not found.' });
	}

	const title = req.body?.title === undefined ? undefined : String(req.body.title || '').trim();
	const description = req.body?.description === undefined ? undefined : String(req.body.description || '').trim();
	const category = req.body?.category === undefined ? undefined : normalizeCategory(req.body.category);
	const startsOn = req.body?.startsOn === undefined ? undefined : normalizeDate(req.body.startsOn);
	const endsOn = req.body?.endsOn === undefined ? undefined : normalizeDate(req.body.endsOn);
	const blocksInstruction = req.body?.blocksInstruction === undefined ? undefined : toBoolean(req.body.blocksInstruction, true);
	const classId = parseOptionalUuid(req.body?.classId);
	const termId = parseOptionalUuid(req.body?.termId);

	if (title !== undefined && !title) {
		return res.status(400).json({ message: 'title cannot be empty.' });
	}
	if (req.body?.category !== undefined && !category) {
		return res.status(400).json({ message: 'category is invalid.' });
	}
	if (req.body?.startsOn !== undefined && !startsOn) {
		return res.status(400).json({ message: 'startsOn must be in YYYY-MM-DD format.' });
	}
	if (req.body?.endsOn !== undefined && !endsOn) {
		return res.status(400).json({ message: 'endsOn must be in YYYY-MM-DD format.' });
	}

	const finalStart = startsOn || existing.starts_on;
	const finalEnd = endsOn || existing.ends_on;
	if (finalStart > finalEnd) {
		return res.status(400).json({ message: 'startsOn must be before or equal to endsOn.' });
	}

	if (classId && !isUuid(classId)) {
		return res.status(400).json({ message: 'classId format is invalid.' });
	}

	if (termId && !isUuid(termId)) {
		return res.status(400).json({ message: 'termId format is invalid.' });
	}

	if (classId) {
		const classRecord = await calendarDb.validateClassInInstitute(classId, institute.id);
		if (!classRecord) {
			return res.status(400).json({ message: 'classId does not belong to your institute.' });
		}
	}

	if (termId) {
		const termRecord = await calendarDb.validateTermInInstitute(termId, institute.id);
		if (!termRecord) {
			return res.status(400).json({ message: 'termId does not belong to your institute.' });
		}
	}

	try {
		const updated = await calendarDb.updateAcademicException({
			exceptionId,
			instituteId: institute.id,
			classId,
			termId,
			title,
			description,
			category,
			startsOn,
			endsOn,
			blocksInstruction,
		});
		if (!updated) {
			return res.status(404).json({ message: 'Academic exception not found.' });
		}
		return res.status(200).json(updated);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function deleteAcademicException(req, res) {
	const institute = await getAdminInstituteOr404(req.user.id, res);
	if (!institute) return;

	try {
		const deletedCount = await calendarDb.deleteAcademicException(req.params.exceptionId, institute.id);
		if (!deletedCount) {
			return res.status(404).json({ message: 'Academic exception not found.' });
		}
		return res.status(200).json({ message: 'Academic exception deleted.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	listAcademicTerms,
	createAcademicTerm,
	updateAcademicTerm,
	deleteAcademicTerm,
	listAcademicExceptions,
	createAcademicException,
	updateAcademicException,
	deleteAcademicException,
};
