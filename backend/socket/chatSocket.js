const jwt = require('jsonwebtoken');
const db = require('../db/queryCommunication');
const { isUuid } = require('../middleware/uuidParamMiddleware');

function extractToken(socket) {
	const fromAuth = socket.handshake?.auth?.token;
	if (fromAuth && typeof fromAuth === 'string') {
		return fromAuth.replace(/^Bearer\s+/i, '').trim();
	}
	const header = socket.handshake?.headers?.authorization;
	if (header && typeof header === 'string') {
		return header.replace(/^Bearer\s+/i, '').trim();
	}
	return null;
}

async function emitUnreadCount(io, userId, instituteId) {
	const unreadCount = await db.getUnreadCountForUserQuery({
		userId,
		instituteId,
	});
	io.to(`user:${userId}`).emit('chat:unread-count-updated', { unreadCount });
}

async function emitUnreadCounts(io, participantIds, instituteId) {
	await Promise.all(
		participantIds.map((participantId) =>
			emitUnreadCount(io, participantId, instituteId),
		),
	);
}

function initializeChatSocket(io) {
	io.use(async (socket, next) => {
		try {
			const token = extractToken(socket);
			if (!token) {
				return next(new Error('No token provided'));
			}
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const scope = await db.getUserScopeByIdQuery(decoded.id);
			if (!scope || !scope.institute_id) {
				return next(new Error('Unauthorized'));
			}
			socket.user = scope;
			return next();
		} catch {
			return next(new Error('Unauthorized'));
		}
	});

	io.on('connection', async (socket) => {
		const scope = socket.user;
		socket.join(`user:${scope.id}`);

		await emitUnreadCount(io, scope.id, scope.institute_id);

		socket.on('chat:join-conversation', async (payload = {}, callback) => {
			try {
				const conversationId = String(payload.conversationId || '').trim();
				if (!isUuid(conversationId)) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Invalid conversation id.' });
					}
					return;
				}

				const isParticipant = await db.isConversationParticipantQuery({
					conversationId,
					userId: scope.id,
					instituteId: scope.institute_id,
				});
				if (!isParticipant) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Unauthorized conversation access.' });
					}
					return;
				}

				socket.join(`conversation:${conversationId}`);
				if (typeof callback === 'function') {
					callback({ ok: true });
				}
			} catch {
				if (typeof callback === 'function') {
					callback({ ok: false, message: 'Failed to join conversation.' });
				}
			}
		});

		socket.on('chat:leave-conversation', (payload = {}, callback) => {
			const conversationId = String(payload.conversationId || '').trim();
			if (!isUuid(conversationId)) {
				if (typeof callback === 'function') {
					callback({ ok: false, message: 'Invalid conversation id.' });
				}
				return;
			}
			socket.leave(`conversation:${conversationId}`);
			if (typeof callback === 'function') {
				callback({ ok: true });
			}
		});

		socket.on('chat:send-message', async (payload = {}, callback) => {
			try {
				const conversationId = String(payload.conversationId || '').trim();
				const content = String(payload.content || '').trim();
				const replyToMessageId = String(payload.replyToMessageId || '').trim();

				if (!isUuid(conversationId)) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Invalid conversation id.' });
					}
					return;
				}
				if (!content) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Message content is required.' });
					}
					return;
				}
				if (content.length > 4000) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Message is too long.' });
					}
					return;
				}
				if (replyToMessageId && !isUuid(replyToMessageId)) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Invalid reply message id.' });
					}
					return;
				}

				const isParticipant = await db.isConversationParticipantQuery({
					conversationId,
					userId: scope.id,
					instituteId: scope.institute_id,
				});
				if (!isParticipant) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Unauthorized to send in this conversation.' });
					}
					return;
				}

				if (replyToMessageId) {
					const replyMessage = await db.getMessageByIdQuery(replyToMessageId);
					if (!replyMessage || replyMessage.conversation_id !== conversationId) {
						if (typeof callback === 'function') {
							callback({ ok: false, message: 'Reply message is invalid.' });
						}
						return;
					}
				}

				const inserted = await db.createMessageQuery({
					conversationId,
					senderId: scope.id,
					content,
					replyToMessageId: replyToMessageId || null,
				});
				const message = await db.getMessageWithSenderQuery(inserted.id);
				const participantIds = await db.getConversationParticipantIdsQuery({
					conversationId,
					instituteId: scope.institute_id,
				});

				io.to(`conversation:${conversationId}`).emit('chat:new-message', message);
				await emitUnreadCounts(io, participantIds, scope.institute_id);

				if (typeof callback === 'function') {
					callback({ ok: true, message });
				}
			} catch {
				if (typeof callback === 'function') {
					callback({ ok: false, message: 'Failed to send message.' });
				}
			}
		});

		socket.on('chat:mark-read', async (payload = {}, callback) => {
			try {
				const conversationId = String(payload.conversationId || '').trim();
				if (!isUuid(conversationId)) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Invalid conversation id.' });
					}
					return;
				}
				const isParticipant = await db.isConversationParticipantQuery({
					conversationId,
					userId: scope.id,
					instituteId: scope.institute_id,
				});
				if (!isParticipant) {
					if (typeof callback === 'function') {
						callback({ ok: false, message: 'Unauthorized conversation access.' });
					}
					return;
				}

				await db.markConversationReadQuery({
					conversationId,
					userId: scope.id,
				});
				await emitUnreadCount(io, scope.id, scope.institute_id);

				if (typeof callback === 'function') {
					callback({ ok: true });
				}
			} catch {
				if (typeof callback === 'function') {
					callback({ ok: false, message: 'Failed to mark conversation as read.' });
				}
			}
		});
	});
}

module.exports = {
	initializeChatSocket,
};
