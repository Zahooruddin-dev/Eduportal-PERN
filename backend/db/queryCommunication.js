const pool = require('./Pool');

async function getUserScopeByIdQuery(userId) {
	const { rows } = await pool.query(
		`SELECT id, username, email, role, profile_pic, institute_id
		 FROM users
		 WHERE id = $1`,
		[userId],
	);
	return rows[0] || null;
}

async function getTeacherProfileQuery({ instituteId, teacherId }) {
	const [teacherResult, classesResult] = await Promise.all([
		pool.query(
			`SELECT id, username, email, role, profile_pic
			 FROM users
			 WHERE id = $1
			 AND institute_id = $2
			 AND role = 'teacher'`,
			[teacherId, instituteId],
		),
		pool.query(
			`SELECT id, class_name, subject, grade_level, room_number, schedule_blocks
			 FROM classes
			 WHERE teacher_id = $1
			 AND institute_id = $2
			 ORDER BY class_name ASC`,
			[teacherId, instituteId],
		),
	]);

	return {
		teacher: teacherResult.rows[0] || null,
		classes: classesResult.rows,
	};
}

async function searchContactsQuery({ instituteId, requesterId, role, search, subject }) {
	const clauses = ['u.institute_id = $1', 'u.id <> $2'];
	const values = [instituteId, requesterId];
	let paramIndex = 3;

	if (role && role !== 'all') {
		clauses.push(`u.role = $${paramIndex}`);
		values.push(role);
		paramIndex += 1;
	}

	if (search) {
		clauses.push(`(
			u.username ILIKE $${paramIndex}
			OR u.email ILIKE $${paramIndex}
			OR EXISTS (
				SELECT 1
				FROM classes c
				WHERE c.teacher_id = u.id
				AND c.institute_id = $1
				AND c.subject ILIKE $${paramIndex}
			)
		)`);
		values.push(`%${search}%`);
		paramIndex += 1;
	}

	if (subject) {
		clauses.push(`(
			EXISTS (
				SELECT 1
				FROM classes c
				WHERE c.teacher_id = u.id
				AND c.institute_id = $1
				AND c.subject ILIKE $${paramIndex}
			)
			OR EXISTS (
				SELECT 1
				FROM enrollments e
				JOIN classes c ON c.id = e.class_id
				WHERE e.student_id = u.id
				AND c.institute_id = $1
				AND c.subject ILIKE $${paramIndex}
			)
		)`);
		values.push(`%${subject}%`);
	}

	const { rows } = await pool.query(
		`SELECT
			u.id,
			u.username,
			u.email,
			u.role,
			u.profile_pic,
			COALESCE(teacher_subjects.subjects, '{}'::text[]) AS teacher_subjects,
			COALESCE(teacher_classes.classes, '{}'::text[]) AS teacher_classes,
			COALESCE(student_subjects.subjects, '{}'::text[]) AS student_subjects
		FROM users u
		LEFT JOIN LATERAL (
			SELECT array_remove(array_agg(DISTINCT c.subject), NULL) AS subjects
			FROM classes c
			WHERE c.teacher_id = u.id
			AND c.institute_id = $1
		) AS teacher_subjects ON TRUE
		LEFT JOIN LATERAL (
			SELECT array_remove(array_agg(DISTINCT c.class_name), NULL) AS classes
			FROM classes c
			WHERE c.teacher_id = u.id
			AND c.institute_id = $1
		) AS teacher_classes ON TRUE
		LEFT JOIN LATERAL (
			SELECT array_remove(array_agg(DISTINCT c.subject), NULL) AS subjects
			FROM enrollments e
			JOIN classes c ON c.id = e.class_id
			WHERE e.student_id = u.id
			AND c.institute_id = $1
		) AS student_subjects ON TRUE
		WHERE ${clauses.join(' AND ')}
		ORDER BY u.username ASC`,
		values,
	);

	return rows;
}

async function getDirectConversationQuery({ instituteId, userAId, userBId, client }) {
	const executor = client || pool;
	const { rows } = await executor.query(
		`SELECT c.*
		 FROM conversations c
		 JOIN conversation_participants p1
			ON p1.conversation_id = c.id AND p1.user_id = $2
		 JOIN conversation_participants p2
			ON p2.conversation_id = c.id AND p2.user_id = $3
		 WHERE c.institute_id = $1
		 AND c.is_direct = TRUE
		 LIMIT 1`,
		[instituteId, userAId, userBId],
	);
	return rows[0] || null;
}

async function ensureDirectConversationQuery({ instituteId, createdBy, userAId, userBId }) {
	const existing = await getDirectConversationQuery({
		instituteId,
		userAId,
		userBId,
	});
	if (existing) return existing;

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const again = await getDirectConversationQuery({
			instituteId,
			userAId,
			userBId,
			client,
		});
		if (again) {
			await client.query('COMMIT');
			return again;
		}

		const conversationResult = await client.query(
			`INSERT INTO conversations (institute_id, is_direct, created_by)
			 VALUES ($1, TRUE, $2)
			 RETURNING *`,
			[instituteId, createdBy],
		);
		const conversation = conversationResult.rows[0];

		await client.query(
			`INSERT INTO conversation_participants (conversation_id, user_id)
			 VALUES ($1, $2), ($1, $3)
			 ON CONFLICT (conversation_id, user_id) DO NOTHING`,
			[conversation.id, userAId, userBId],
		);

		await client.query('COMMIT');
		return conversation;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function isConversationParticipantQuery({ conversationId, userId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT 1
		 FROM conversation_participants cp
		 JOIN conversations c ON c.id = cp.conversation_id
		 WHERE cp.conversation_id = $1
		 AND cp.user_id = $2
		 AND c.institute_id = $3
		 LIMIT 1`,
		[conversationId, userId, instituteId],
	);
	return rows.length > 0;
}

async function getConversationParticipantIdsQuery({ conversationId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT cp.user_id
		 FROM conversation_participants cp
		 JOIN conversations c ON c.id = cp.conversation_id
		 WHERE cp.conversation_id = $1
		 AND c.institute_id = $2`,
		[conversationId, instituteId],
	);
	return rows.map((row) => row.user_id);
}

async function listInboxQuery({ userId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT
			c.id AS conversation_id,
			c.created_at,
			c.updated_at,
			c.last_message_at,
			other.id AS other_user_id,
			other.username AS other_username,
			other.role AS other_role,
			other.profile_pic AS other_profile_pic,
			lm.id AS last_message_id,
			lm.content AS last_message_content,
			lm.sender_id AS last_message_sender_id,
			lm.created_at AS last_message_created_at,
			lm.is_deleted AS last_message_is_deleted,
			COALESCE(unread.unread_count, 0) AS unread_count
		FROM conversation_participants self_participant
		JOIN conversations c
			ON c.id = self_participant.conversation_id
			AND c.institute_id = $2
		JOIN LATERAL (
			SELECT u.id, u.username, u.role, u.profile_pic
			FROM conversation_participants cp
			JOIN users u ON u.id = cp.user_id
			WHERE cp.conversation_id = c.id
			AND cp.user_id <> $1
			ORDER BY cp.joined_at ASC
			LIMIT 1
		) AS other ON TRUE
		LEFT JOIN LATERAL (
			SELECT m.id, m.content, m.sender_id, m.created_at, m.is_deleted
			FROM messages m
			WHERE m.conversation_id = c.id
			ORDER BY m.created_at DESC
			LIMIT 1
		) AS lm ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS unread_count
			FROM messages m
			WHERE m.conversation_id = c.id
			AND m.sender_id <> $1
			AND m.created_at > COALESCE(self_participant.last_read_at, 'epoch'::timestamptz)
		) AS unread ON TRUE
		WHERE self_participant.user_id = $1
		ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
		[userId, instituteId],
	);
	return rows;
}

async function listConversationMessagesQuery({ conversationId, limit = 100 }) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM (
			SELECT
				m.id,
				m.conversation_id,
				m.sender_id,
				m.content,
				m.reply_to_message_id,
				m.is_deleted,
				m.created_at,
				m.updated_at,
				m.edited_at,
				sender.username AS sender_username,
				sender.profile_pic AS sender_profile_pic,
				sender.role AS sender_role,
				reply.content AS reply_content,
				reply.is_deleted AS reply_is_deleted,
				reply.sender_id AS reply_sender_id,
				reply_sender.username AS reply_sender_username
			FROM messages m
			JOIN users sender ON sender.id = m.sender_id
			LEFT JOIN messages reply ON reply.id = m.reply_to_message_id
			LEFT JOIN users reply_sender ON reply_sender.id = reply.sender_id
			WHERE m.conversation_id = $1
			ORDER BY m.created_at DESC
			LIMIT $2
		) latest
		ORDER BY latest.created_at ASC`,
		[conversationId, limit],
	);
	return rows;
}

async function getMessageByIdQuery(messageId) {
	const { rows } = await pool.query(
		`SELECT * FROM messages WHERE id = $1`,
		[messageId],
	);
	return rows[0] || null;
}

async function createMessageQuery({ conversationId, senderId, content, replyToMessageId }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const messageResult = await client.query(
			`INSERT INTO messages (
				conversation_id,
				sender_id,
				content,
				reply_to_message_id
			)
			VALUES ($1, $2, $3, $4)
			RETURNING *`,
			[conversationId, senderId, content, replyToMessageId || null],
		);
		const message = messageResult.rows[0];

		await client.query(
			`UPDATE conversations
			 SET last_message_at = NOW(),
				 updated_at = NOW()
			 WHERE id = $1`,
			[conversationId],
		);

		await client.query('COMMIT');
		return message;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getMessageWithSenderQuery(messageId) {
	const { rows } = await pool.query(
		`SELECT
			m.id,
			m.conversation_id,
			m.sender_id,
			m.content,
			m.reply_to_message_id,
			m.is_deleted,
			m.created_at,
			m.updated_at,
			m.edited_at,
			sender.username AS sender_username,
			sender.profile_pic AS sender_profile_pic,
			sender.role AS sender_role,
			reply.content AS reply_content,
			reply.is_deleted AS reply_is_deleted,
			reply.sender_id AS reply_sender_id,
			reply_sender.username AS reply_sender_username
		 FROM messages m
		 JOIN users sender ON sender.id = m.sender_id
		 LEFT JOIN messages reply ON reply.id = m.reply_to_message_id
		 LEFT JOIN users reply_sender ON reply_sender.id = reply.sender_id
		 WHERE m.id = $1`,
		[messageId],
	);
	return rows[0] || null;
}

async function updateMessageQuery({ messageId, senderId, content }) {
	const { rows } = await pool.query(
		`UPDATE messages
		 SET content = $1,
			 updated_at = NOW(),
			 edited_at = NOW()
		 WHERE id = $2
		 AND sender_id = $3
		 AND is_deleted = FALSE
		 RETURNING *`,
		[content, messageId, senderId],
	);
	return rows[0] || null;
}

async function softDeleteMessageQuery({ messageId, senderId }) {
	const { rows } = await pool.query(
		`UPDATE messages
		 SET content = '[deleted by teacher]',
			 is_deleted = TRUE,
			 updated_at = NOW()
		 WHERE id = $1
		 AND sender_id = $2
		 AND is_deleted = FALSE
		 RETURNING *`,
		[messageId, senderId],
	);
	return rows[0] || null;
}

async function markConversationReadQuery({ conversationId, userId }) {
	await pool.query(
		`UPDATE conversation_participants
		 SET last_read_at = NOW()
		 WHERE conversation_id = $1
		 AND user_id = $2`,
		[conversationId, userId],
	);
}

async function getUnreadCountForUserQuery({ userId, instituteId }) {
	const { rows } = await pool.query(
		`SELECT COALESCE(SUM(summary.unread_count), 0)::int AS unread_count
		 FROM (
			SELECT COUNT(*)::int AS unread_count
			FROM conversation_participants cp
			JOIN conversations c
				ON c.id = cp.conversation_id
				AND c.institute_id = $2
			JOIN messages m ON m.conversation_id = c.id
			WHERE cp.user_id = $1
			AND m.sender_id <> $1
			AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz)
			GROUP BY cp.conversation_id
		 ) AS summary`,
		[userId, instituteId],
	);
	return rows[0]?.unread_count || 0;
}

module.exports = {
	getUserScopeByIdQuery,
	getTeacherProfileQuery,
	searchContactsQuery,
	getDirectConversationQuery,
	ensureDirectConversationQuery,
	isConversationParticipantQuery,
	getConversationParticipantIdsQuery,
	listInboxQuery,
	listConversationMessagesQuery,
	getMessageByIdQuery,
	createMessageQuery,
	getMessageWithSenderQuery,
	updateMessageQuery,
	softDeleteMessageQuery,
	markConversationReadQuery,
	getUnreadCountForUserQuery,
};
