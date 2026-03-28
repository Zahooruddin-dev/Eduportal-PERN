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

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/class', classRoutes);
app.use('/api/class/:classId/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/class/:classId/resources', resourceRoutes);
app.use('/api/class/:classId/resources/:resourceId/comments', commentRoutes);
app.use('/api/class/:classId/assignments', assignmentRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/auth', authRoutes);
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
