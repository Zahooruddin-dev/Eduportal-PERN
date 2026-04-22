const pool = require('./Pool');

async function createResourceQuery(resourceData) {
	const {
		classId,
		teacherId,
		title,
		type,
		content,
		description,
		tags,
		isPublished,
		expiresAt,
		contentMode,
		materialCategory,
		youtubeVideoId,
		meta,
	} = resourceData;

	const { rows } = await pool.query(
		`INSERT INTO class_resources
      (class_id, teacher_id, title, type, content, description, tags, is_published, expires_at, content_mode, material_category, youtube_video_id, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
		[
			classId,
			teacherId,
			title,
			type,
			content,
			description,
			tags || null,
			isPublished,
			expiresAt || null,
			contentMode || 'view',
			materialCategory || 'lecture',
			youtubeVideoId || null,
			meta && typeof meta === 'object' ? meta : {},
		],
	);

	return rows[0];
}

async function getResourcesByClassQuery(classId, teacherId, filters = {}) {
	const {
		materialCategory,
		contentMode,
		type,
		search,
		limit,
		offset,
	} = filters || {};

	const values = [classId];
	let whereClause = 'WHERE r.class_id = $1';

	if (!teacherId) {
		whereClause +=
			' AND r.is_published = true AND (r.expires_at IS NULL OR r.expires_at > NOW())';
	}

	if (materialCategory) {
		values.push(materialCategory);
		whereClause += ` AND r.material_category = $${values.length}`;
	}

	if (contentMode) {
		values.push(contentMode);
		whereClause += ` AND r.content_mode = $${values.length}`;
	}

	if (type) {
		values.push(type);
		whereClause += ` AND r.type = $${values.length}`;
	}

	if (search) {
		values.push(`%${String(search).trim()}%`);
		whereClause += ` AND (
			r.title ILIKE $${values.length}
			OR COALESCE(r.description, '') ILIKE $${values.length}
			OR COALESCE(r.content, '') ILIKE $${values.length}
			OR COALESCE(array_to_string(r.tags, ' '), '') ILIKE $${values.length}
		)`;
	}

	let paginationClause = '';
	const safeLimit = Number(limit);
	const safeOffset = Number(offset);

	if (Number.isFinite(safeLimit) && safeLimit > 0) {
		values.push(Math.min(safeLimit, 500));
		paginationClause += ` LIMIT $${values.length}`;
	}

	if (Number.isFinite(safeOffset) && safeOffset >= 0) {
		values.push(safeOffset);
		paginationClause += ` OFFSET $${values.length}`;
	}

	const { rows } = await pool.query(
		`SELECT r.*,
        (SELECT COUNT(*) FROM resource_comments WHERE resource_id = r.id) AS comment_count
       FROM class_resources r
       ${whereClause}
       ORDER BY r.created_at DESC
       ${paginationClause}`,
		values,
	);

	return rows;
}

async function getResourceByIdQuery(resourceId) {
	const { rows } = await pool.query(
		`SELECT * FROM class_resources WHERE id = $1`,
		[resourceId],
	);
	return rows[0];
}

async function getResourceByIdInClassQuery(resourceId, classId) {
	const { rows } = await pool.query(
		`SELECT * FROM class_resources WHERE id = $1 AND class_id = $2`,
		[resourceId, classId],
	);
	return rows[0];
}

async function updateResourceQuery(resourceId, teacherId, updates) {
	const allowedFields = [
		'title',
		'description',
		'tags',
		'type',
		'content',
		'is_published',
		'expires_at',
		'content_mode',
		'material_category',
		'youtube_video_id',
		'meta',
	];
	const setClauses = [];
	const values = [];
	let i = 1;
	for (const field of allowedFields) {
		if (updates[field] !== undefined) {
			setClauses.push(`${field} = $${i}`);
			values.push(updates[field]);
			i += 1;
		}
	}
	if (setClauses.length === 0) return null;
	values.push(resourceId, teacherId);
	const { rows } = await pool.query(
		`UPDATE class_resources
     SET ${setClauses.join(', ')}
     WHERE id = $${i} AND teacher_id = $${i + 1}
     RETURNING *`,
		values,
	);
	return rows[0];
}

async function deleteResourceQuery(resourceId, teacherId) {
	const { rowCount } = await pool.query(
		`DELETE FROM class_resources WHERE id = $1 AND teacher_id = $2`,
		[resourceId, teacherId],
	);
	return rowCount;
}

module.exports = {
	createResourceQuery,
	getResourcesByClassQuery,
	getResourceByIdQuery,
	getResourceByIdInClassQuery,
	updateResourceQuery,
	deleteResourceQuery,
};
