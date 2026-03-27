const db = require('../db/queryResources');
const dbClass = require('../db/queryClasses');
const path = require('path');
const fs = require('fs');

async function createResource(req, res) {
  const { classId } = req.params;
  const teacherId = req.user.id;
  const { title, type, content, description, tags, isPublished, expiresAt } = req.body;
  // For file upload, the file is in req.file
  let fileContent = null;
  if (type === 'file' && req.file) {
    // store relative path
    fileContent = `/uploads/resources/${req.file.filename}`;
  } else if (type === 'link') {
    fileContent = content; // URL provided in body
  } else {
    return res.status(400).json({ error: 'Invalid resource type or missing file' });
  }

  try {
    // Verify teacher owns the class
    const targetClass = await dbClass.getClassByIdQuery(classId);
    if (!targetClass) return res.status(404).json({ error: 'Class not found' });
    if (targetClass.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized: you do not teach this class' });
    }

    const resource = await db.createResourceQuery({
      classId,
      teacherId,
      title,
      type,
      content: fileContent || content,
      description,
      tags: tags ? tags.split(',') : null,
      isPublished: isPublished === 'true',
      expiresAt: expiresAt || null
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
    let teacherId = null;
    if (userRole === 'teacher') {
      // verify teacher owns the class
      const targetClass = await dbClass.getClassByIdQuery(classId);
      if (targetClass && targetClass.teacher_id === userId) {
        teacherId = userId; // teacher can see all
      }
    }
    const resources = await db.getResourcesByClassQuery(classId, teacherId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateResource(req, res) {
  const { resourceId } = req.params;
  const teacherId = req.user.id;
  const updates = req.body;
  try {
    const updated = await db.updateResourceQuery(resourceId, teacherId, updates);
    if (!updated) return res.status(404).json({ error: 'Resource not found or unauthorized' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteResource(req, res) {
  const { resourceId } = req.params;
  const teacherId = req.user.id;
  try {
    // First get resource to delete file if exists
    const resource = await db.getResourceByIdQuery(resourceId);
    if (resource && resource.type === 'file' && resource.content) {
      const filePath = path.join(__dirname, '..', resource.content);
      fs.unlink(filePath, (err) => { if (err) console.error('Failed to delete file:', err); });
    }
    const deleted = await db.deleteResourceQuery(resourceId, teacherId);
    if (!deleted) return res.status(404).json({ error: 'Resource not found or unauthorized' });
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createResource,
  getClassResources,
  updateResource,
  deleteResource,
};