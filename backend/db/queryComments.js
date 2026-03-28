const pool = require('./Pool');

async function createCommentQuery(resourceId, userId, parentCommentId, content) {
    const { rows } = await pool.query(
        `INSERT INTO resource_comments (resource_id, user_id, parent_comment_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [resourceId, userId, parentCommentId || null, content]
    );
    return rows[0];
}

async function getCommentsByResourceQuery(resourceId) {
    const { rows } = await pool.query(
        `SELECT c.*, u.username, u.profile_pic
         FROM resource_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.resource_id = $1
         ORDER BY c.created_at ASC`,
        [resourceId]
    );
    return rows;
}

async function updateCommentQuery(commentId, userId, content) {
    const { rows } = await pool.query(
        `UPDATE resource_comments
         SET content = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [content, commentId, userId]
    );
    return rows[0];
}

async function deleteCommentQuery(commentId, userId) {
    const { rowCount } = await pool.query(
        `DELETE FROM resource_comments
         WHERE id = $1 AND user_id = $2`,
        [commentId, userId]
    );
    return rowCount;
}

module.exports = {
    createCommentQuery,
    getCommentsByResourceQuery,
    updateCommentQuery,
    deleteCommentQuery,
};