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
	} = resourceData;
	const { rows } = await pool.query(
		`INSERT INTO class_resources
      (class_id, teacher_id, title, type, content, description, tags, is_published, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
		],
	);
	return rows[0];
}

async function getResourcesByClassQuery(classId, teacherId) {
	const query = teacherId
		? `SELECT r.*, 
            (SELECT COUNT(*) FROM resource_comments WHERE resource_id = r.id) AS comment_count
           FROM class_resources r
           WHERE r.class_id = $1`
		: `SELECT r.*, 
            (SELECT COUNT(*) FROM resource_comments WHERE resource_id = r.id) AS comment_count
           FROM class_resources r
           WHERE r.class_id = $1 AND r.is_published = true`;
	const { rows } = await pool.query(query, [classId]);
	return rows;
}
async function getResourceByIdQuery(resourceId) {
	const { rows } = await pool.query(
		`SELECT * FROM class_resources WHERE id = $1`,
		[resourceId],
	);
	return rows[0];
}

async function updateResourceQuery(resourceId, teacherId, updates) {
	const allowedFields = [
		'title',
		'description',
		'tags',
		'is_published',
		'expires_at',
	];
	const setClauses = [];
	const values = [];
	let i = 1;
	for (const field of allowedFields) {
		if (updates[field] !== undefined) {
			setClauses.push(`${field} = $${i}`);
			values.push(updates[field]);
			i++;
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

async function getFileByPath(filePath) {
	//  we'll use to serve files
}

module.exports = {
	createResourceQuery,
	getResourcesByClassQuery,
	getResourceByIdQuery,
	updateResourceQuery,
	deleteResourceQuery,
};
