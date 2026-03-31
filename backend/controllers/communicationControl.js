const db = require('../db/queryCommunication');
const { isUuid } = require('../middleware/uuidParamMiddleware');

const SEARCH_ROLES = ['all', 'teacher', 'student'];

function normalizeText(value) {
	return String(value || '').trim();
}

async function getScopeOrFail(req, res) {
	const scope = await db.getUserScopeByIdQuery(req.user.id);
	if (!scope || !scope.institute_id) {
		res.status(403).json({ message: 'User is not linked to an institute.' });
		return null;
	}
	return scope;
}

async function emitUnreadCount(io, userId, instituteId) {
	if (!io) return;
	const unreadCount = await db.getUnreadCountForUserQuery({
		userId,
		instituteId,
	});
	io.to(`user:${userId}`).emit('chat:unread-count-updated', {
		unreadCount,
	});
}

async function emitUnreadCountsForParticipants(io, participantIds, instituteId) {
	if (!io || !participantIds.length) return;
	await Promise.all(
		participantIds.map((participantId) =>
			emitUnreadCount(io, participantId, instituteId),
		),
	);
}

async function searchContacts(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	let role = normalizeText(req.query?.role || 'all').toLowerCase();
	const search = normalizeText(req.query?.search || '');
	const subject = normalizeText(req.query?.subject || '');

	if (!SEARCH_ROLES.includes(role)) {
		return res.status(400).json({ message: 'Invalid role filter.' });
	}

	if (scope.role === 'student' && role === 'all') {
		role = 'teacher';
	}

	try {
		const contacts = await db.searchContactsQuery({
			instituteId: scope.institute_id,
			requesterId: scope.id,
			role,
			search,
			subject,
		});
		return res.status(200).json(contacts);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getTeacherProfile(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	const { teacherId } = req.params;
	if (!isUuid(teacherId)) {
		return res.status(400).json({ message: 'Invalid teacher id format.' });
	}

	try {
		const profile = await db.getTeacherProfileQuery({
			instituteId: scope.institute_id,
			teacherId,
		});
		if (!profile.teacher) {
			return res.status(404).json({ message: 'Teacher profile not found.' });
		}
		return res.status(200).json(profile);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function openDirectConversation(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	const participantId = normalizeText(req.body?.participantId);
	if (!participantId || !isUuid(participantId)) {
		return res.status(400).json({ message: 'Valid participantId is required.' });
	}
	if (participantId === scope.id) {
		return res.status(400).json({ message: 'Cannot open a conversation with yourself.' });
	}

	const participant = await db.getUserScopeByIdQuery(participantId);
	if (!participant || participant.institute_id !== scope.institute_id) {
		return res.status(404).json({ message: 'Participant not found in your institute.' });
	}

	try {
		const conversation = await db.ensureDirectConversationQuery({
			instituteId: scope.institute_id,
			createdBy: scope.id,
			userAId: scope.id,
			userBId: participantId,
		});

		await db.markConversationReadQuery({
			conversationId: conversation.id,
			userId: scope.id,
		});

		return res.status(200).json({
			conversation,
			participant: {
				id: participant.id,
				username: participant.username,
				email: participant.email,
				role: participant.role,
				profile_pic: participant.profile_pic,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getInbox(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	try {
		const conversations = await db.listInboxQuery({
			userId: scope.id,
			instituteId: scope.institute_id,
		});
		return res.status(200).json(conversations);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getConversationMessages(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	const { conversationId } = req.params;
	if (!isUuid(conversationId)) {
		return res.status(400).json({ message: 'Invalid conversation id format.' });
	}

	const isParticipant = await db.isConversationParticipantQuery({
		conversationId,
		userId: scope.id,
		instituteId: scope.institute_id,
	});
	if (!isParticipant) {
		return res.status(403).json({ message: 'Unauthorized to view this conversation.' });
	}

	const limitValue = Number(req.query?.limit);
	const limit = Number.isFinite(limitValue)
		? Math.max(1, Math.min(limitValue, 200))
		: 100;

	try {
		const messages = await db.listConversationMessagesQuery({
			conversationId,
			limit,
		});
		return res.status(200).json(messages);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function sendMessage(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	const conversationId = normalizeText(req.body?.conversationId);
	const content = normalizeText(req.body?.content);
	const replyToMessageId = normalizeText(req.body?.replyToMessageId);

	if (!conversationId || !isUuid(conversationId)) {
		return res.status(400).json({ message: 'Valid conversationId is required.' });
	}
	if (!content) {
		return res.status(400).json({ message: 'Message content is required.' });
	}
	if (content.length > 4000) {
		return res.status(400).json({ message: 'Message is too long.' });
	}
	if (replyToMessageId && !isUuid(replyToMessageId)) {
		return res.status(400).json({ message: 'Invalid reply message id format.' });
	}

	const isParticipant = await db.isConversationParticipantQuery({
		conversationId,
		userId: scope.id,
		instituteId: scope.institute_id,
	});
	if (!isParticipant) {
		return res.status(403).json({ message: 'Unauthorized to send in this conversation.' });
	}

	if (replyToMessageId) {
		const replyMessage = await db.getMessageByIdQuery(replyToMessageId);
		if (!replyMessage || replyMessage.conversation_id !== conversationId) {
			return res.status(400).json({ message: 'Reply message not found in this conversation.' });
		}
	}

	try {
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

		const io = req.app.get('io');
		if (io) {
			io.to(`conversation:${conversationId}`).emit('chat:new-message', message);
			await emitUnreadCountsForParticipants(io, participantIds, scope.institute_id);
		}

		return res.status(201).json(message);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function editMessage(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	if (scope.role !== 'teacher') {
		return res.status(403).json({ message: 'Only teachers can edit messages.' });
	}

	const { messageId } = req.params;
	const content = normalizeText(req.body?.content);
	if (!isUuid(messageId)) {
		return res.status(400).json({ message: 'Invalid message id format.' });
	}
	if (!content) {
		return res.status(400).json({ message: 'Message content is required.' });
	}
	if (content.length > 4000) {
		return res.status(400).json({ message: 'Message is too long.' });
	}

	const existing = await db.getMessageByIdQuery(messageId);
	if (!existing) {
		return res.status(404).json({ message: 'Message not found.' });
	}

	const isParticipant = await db.isConversationParticipantQuery({
		conversationId: existing.conversation_id,
		userId: scope.id,
		instituteId: scope.institute_id,
	});
	if (!isParticipant) {
		return res.status(403).json({ message: 'Unauthorized to edit this message.' });
	}

	try {
		const updated = await db.updateMessageQuery({
			messageId,
			senderId: scope.id,
			content,
		});
		if (!updated) {
			return res.status(403).json({ message: 'Only your active messages can be edited.' });
		}

		const hydrated = await db.getMessageWithSenderQuery(messageId);
		const io = req.app.get('io');
		if (io) {
			io.to(`conversation:${existing.conversation_id}`).emit('chat:message-updated', hydrated);
		}

		return res.status(200).json(hydrated);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function deleteMessage(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	if (scope.role !== 'teacher') {
		return res.status(403).json({ message: 'Only teachers can delete messages.' });
	}

	const { messageId } = req.params;
	if (!isUuid(messageId)) {
		return res.status(400).json({ message: 'Invalid message id format.' });
	}

	const existing = await db.getMessageByIdQuery(messageId);
	if (!existing) {
		return res.status(404).json({ message: 'Message not found.' });
	}

	const isParticipant = await db.isConversationParticipantQuery({
		conversationId: existing.conversation_id,
		userId: scope.id,
		instituteId: scope.institute_id,
	});
	if (!isParticipant) {
		return res.status(403).json({ message: 'Unauthorized to delete this message.' });
	}

	try {
		const deleted = await db.softDeleteMessageQuery({
			messageId,
			senderId: scope.id,
		});
		if (!deleted) {
			return res.status(403).json({ message: 'Only your active messages can be deleted.' });
		}

		const hydrated = await db.getMessageWithSenderQuery(messageId);
		const io = req.app.get('io');
		if (io) {
			io.to(`conversation:${existing.conversation_id}`).emit('chat:message-deleted', hydrated);
		}

		return res.status(200).json({ message: 'Message deleted.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function markConversationRead(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	const { conversationId } = req.params;
	if (!isUuid(conversationId)) {
		return res.status(400).json({ message: 'Invalid conversation id format.' });
	}

	const isParticipant = await db.isConversationParticipantQuery({
		conversationId,
		userId: scope.id,
		instituteId: scope.institute_id,
	});
	if (!isParticipant) {
		return res.status(403).json({ message: 'Unauthorized to mark this conversation as read.' });
	}

	try {
		await db.markConversationReadQuery({
			conversationId,
			userId: scope.id,
		});
		const io = req.app.get('io');
		await emitUnreadCount(io, scope.id, scope.institute_id);
		return res.status(200).json({ message: 'Conversation marked as read.' });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function getUnreadCount(req, res) {
	const scope = await getScopeOrFail(req, res);
	if (!scope) return;

	try {
		const unreadCount = await db.getUnreadCountForUserQuery({
			userId: scope.id,
			instituteId: scope.institute_id,
		});
		return res.status(200).json({ unreadCount });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	searchContacts,
	getTeacherProfile,
	openDirectConversation,
	getInbox,
	getConversationMessages,
	sendMessage,
	editMessage,
	deleteMessage,
	markConversationRead,
	getUnreadCount,
};
