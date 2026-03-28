const db = require('../db/queryComments');
const dbResource = require('../db/queryResources');
const dbClass = require('../db/queryClasses');

async function createComment(req, res) {
    const { resourceId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        const resource = await dbResource.getResourceByIdQuery(resourceId);
        if (!resource) return res.status(404).json({ error: 'Resource not found' });

        const comment = await db.createCommentQuery(resourceId, userId, parentCommentId, content);
        res.status(201).json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getComments(req, res) {
    const { resourceId } = req.params;
    try {
        const comments = await db.getCommentsByResourceQuery(resourceId);
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function updateComment(req, res) {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        const updated = await db.updateCommentQuery(commentId, userId, content);
        if (!updated) return res.status(404).json({ error: 'Comment not found or unauthorized' });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function deleteComment(req, res) {
    const { commentId } = req.params;
    const userId = req.user.id;

    try {
        const deleted = await db.deleteCommentQuery(commentId, userId);
        if (!deleted) return res.status(404).json({ error: 'Comment not found or unauthorized' });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    createComment,
    getComments,
    updateComment,
    deleteComment,
};