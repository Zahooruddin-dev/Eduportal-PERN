import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket({
	userId,
	onNewMessage,
	onMessageUpdated,
	onMessageDeleted,
	onUnreadCountUpdated,
	onInboxRefresh,
}) {
	const socketRef = useRef(null);
	const activeConversationIdRef = useRef(null);

	const joinConversationRoom = useCallback((conversationId) => {
		const socket = socketRef.current;
		if (!socket || !socket.connected) return;
		socket.emit('chat:join-conversation', { conversationId }, () => {});
	}, []);

	const setActiveConversationId = useCallback((id) => {
		activeConversationIdRef.current = id;
	}, []);

	const markReadViaSocket = useCallback((conversationId) => {
		const socket = socketRef.current;
		if (socket && socket.connected) {
			socket.emit('chat:mark-read', { conversationId }, () => {});
		}
	}, []);

	const sendViaSocket = useCallback((payload, callback) => {
		const socket = socketRef.current;
		if (socket && socket.connected) {
			socket.emit('chat:send-message', payload, callback);
			return true;
		}
		return false;
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) return;

		const socket = io(
			import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
			{
				auth: { token },
				transports: ['websocket', 'polling'],
			},
		);
		socketRef.current = socket;

		socket.on('connect', () => {
			const conversationId = activeConversationIdRef.current;
			if (conversationId) {
				socket.emit('chat:join-conversation', { conversationId }, () => {});
			}
		});

		socket.on('chat:new-message', (msg) => {
			onNewMessage(msg, activeConversationIdRef.current);
			if (
				msg.conversation_id === activeConversationIdRef.current &&
				msg.sender_id !== userId
			) {
				socket.emit(
					'chat:mark-read',
					{ conversationId: msg.conversation_id },
					() => {},
				);
			}
			onInboxRefresh?.();
		});

		socket.on('chat:message-updated', (msg) => {
			if (msg.conversation_id === activeConversationIdRef.current) {
				onMessageUpdated(msg);
			}
			onInboxRefresh?.();
		});

		socket.on('chat:message-deleted', (msg) => {
			if (msg.conversation_id === activeConversationIdRef.current) {
				onMessageDeleted(msg);
			}
			onInboxRefresh?.();
		});

		socket.on('chat:unread-count-updated', (payload) => {
			onUnreadCountUpdated(Number(payload?.unreadCount || 0));
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [
		onInboxRefresh,
		onMessageDeleted,
		onMessageUpdated,
		onNewMessage,
		onUnreadCountUpdated,
		userId,
	]);

	return {
		joinConversationRoom,
		setActiveConversationId,
		markReadViaSocket,
		sendViaSocket,
	};
}
