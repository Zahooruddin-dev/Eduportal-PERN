require('dotenv').config();
const express = require('express');
const cors = require('cors');

const classRoutes = require('./routes/classes');
const enrollRoutes = require('./routes/enrollRoutes');
const authRoutes = require('./routes/authRoutes');
const announcementRoutes = require('./routes/announcements');
const attendanceRoutes = require('./routes/attendanceRoutes');
const resourceRoutes = require('./routes/classResourcesRoutes');
const commentRoutes = require('./routes/comments');
const assignmentRoutes = require('./routes/assignmentRoutes');
const gradebookRoutes = require('./routes/gradebookRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { validateUuidParam } = require('./middleware/uuidParamMiddleware');
const { ensureAdminSchema } = require('./db/ensureAdminSchema');

const app = express();

app.use(cors());
app.use(express.json());

const uuidParamLabels = {
	id: 'id',
	classId: 'class id',
	resourceId: 'resource id',
	studentId: 'student id',
	assignmentId: 'assignment id',
	attachmentId: 'attachment id',
	announcementId: 'announcement id',
	commentId: 'comment id',
};

Object.entries(uuidParamLabels).forEach(([paramName, label]) => {
	app.param(paramName, validateUuidParam(paramName, label));
});

app.use('/api/class', classRoutes);
app.use('/api/class/:classId/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/class/:classId/resources', resourceRoutes);
app.use('/api/class/:classId/resources/:resourceId/comments', commentRoutes);
app.use('/api/class/:classId/assignments', assignmentRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/gradebook', gradebookRoutes);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
	try {
		await ensureAdminSchema();
		app.listen(PORT, '0.0.0.0', () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to initialize database schema:', error);
		process.exit(1);
	}
}

startServer();

module.exports = app;
