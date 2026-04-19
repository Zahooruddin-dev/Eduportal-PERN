require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

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
const communicationRoutes = require('./routes/communicationRoutes');
const parentRoutes = require('./routes/parentRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const { validateUuidParam } = require('./middleware/uuidParamMiddleware');
const { ensureAdminSchema } = require('./db/ensureAdminSchema');
const { initializeChatSocket } = require('./socket/chatSocket');

const app = express();

function normalizeOrigin(origin) {
	return String(origin || '').trim().replace(/\/$/, '');
}

const allowedOrigins = Array.from(
	new Set(
		String(process.env.FRONTEND_URL || 'http://localhost:5173')
			.split(',')
			.map((origin) => normalizeOrigin(origin))
			.filter(Boolean),
	),
);

const corsOptions = {
	origin(origin, callback) {
		if (!origin) {
			return callback(null, true);
		}
		const normalized = normalizeOrigin(origin);
		if (allowedOrigins.includes(normalized)) {
			return callback(null, true);
		}
		return callback(new Error('CORS origin denied'));
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Setup-Secret'],
};

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

const uuidParamLabels = {
	id: 'id',
	classId: 'class id',
	resourceId: 'resource id',
	studentId: 'student id',
	assignmentId: 'assignment id',
	attachmentId: 'attachment id',
	announcementId: 'announcement id',
	commentId: 'comment id',
	conversationId: 'conversation id',
	messageId: 'message id',
	teacherId: 'teacher id',
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
app.use('/api/communication', communicationRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/calendar', calendarRoutes);
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
		const server = http.createServer(app);
		const socketOrigins = allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins;
		const io = new Server(server, {
			cors: {
				origin: socketOrigins,
				methods: ['GET', 'POST', 'PATCH', 'DELETE'],
				credentials: true,
			},
		});
		app.set('io', io);
		initializeChatSocket(io);
		server.listen(PORT, '0.0.0.0', () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to initialize database schema:', error);
		process.exit(1);
	}
}

startServer();

module.exports = app;
