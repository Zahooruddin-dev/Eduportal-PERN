const pool = require('./Pool');

async function addAttachmentQuery(assignmentId, title, type, content) {
    const { rows } = await pool.query(
        `INSERT INTO assignment_attachments (assignment_id, title, type, content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [assignmentId, title, type, content]
    );
    return rows[0];
}

async function getAttachmentsByAssignmentQuery(assignmentId) {
    const { rows } = await pool.query(
        `SELECT * FROM assignment_attachments WHERE assignment_id = $1 ORDER BY created_at`,
        [assignmentId]
    );
    return rows;
}

async function deleteAttachmentQuery(attachmentId, assignmentId) {
    const { rowCount } = await pool.query(
        `DELETE FROM assignment_attachments WHERE id = $1 AND assignment_id = $2`,
        [attachmentId, assignmentId]
    );
    return rowCount;
}

module.exports = { addAttachmentQuery, getAttachmentsByAssignmentQuery, deleteAttachmentQuery };