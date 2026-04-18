import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	searchCommunicationContacts,
	getTeacherCommunicationProfile,
	openDirectConversation,
	getCommunicationInbox,
	getConversationMessages,
	markConversationRead,
	sendCommunicationMessage,
	editCommunicationMessage,
	deleteCommunicationMessage,
} from '../../../../../../api/api';
import { useSocket } from './useSocket';

function useDebouncedValue(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [delay, value]);
	return debounced;
}

function sortMessagesByCreatedAt(list) {
	return [...list].sort(
		(a, b) =>
			new Date(a?.created_at || 0).getTime() -
			new Date(b?.created_at || 0).getTime(),
	);
}

export function useCommunication({ user, openToast }) {
	const queryClient = useQueryClient();
	const [unreadCount, setUnreadCount] = useState(0);
	const [sending, setSending] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [searchText, setSearchText] = useState('');
	const [subjectText, setSubjectText] = useState('');
	const [searchRole, setSearchRole] = useState(
		user?.role === 'student' ? 'teacher' : 'student',
	);
	const [draft, setDraft] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [editingMessageId, setEditingMessageId] = useState(null);
	const [editingText, setEditingText] = useState('');
	const [profileModalOpen, setProfileModalOpen] = useState(false);
	const [teacherProfile, setTeacherProfile] = useState(null);
	const [teacherProfileLoading, setTeacherProfileLoading] = useState(false);

	const messageViewportRef = useRef(null);
	const stickToBottomRef = useRef(true);
	const activeConversationIdRef = useRef(null);
	const inboxRefreshTimeoutRef = useRef(null);

	const debouncedSearchText = useDebouncedValue(searchText, 250);
	const debouncedSubjectText = useDebouncedValue(subjectText, 250);
	const effectiveSearchRole =
		user?.role === 'student' ? 'teacher' : searchRole;
	const selectedConversationId = selectedConversation?.conversationId || null;
	const inboxQueryKey = useMemo(
		() => ['communication', 'inbox', user?.id],
		[user?.id],
	);

	const emitUnreadEvent = useCallback((count) => {
		window.dispatchEvent(
			new CustomEvent('communication-unread', { detail: { count } }),
		);
	}, []);

	const syncUnreadCount = useCallback(
		(count) => {
			setUnreadCount(count);
			emitUnreadEvent(count);
		},
		[emitUnreadEvent],
	);

	const scheduleInboxRefresh = useCallback(() => {
		if (!user?.id) return;
		if (inboxRefreshTimeoutRef.current) return;
		inboxRefreshTimeoutRef.current = setTimeout(() => {
			inboxRefreshTimeoutRef.current = null;
			queryClient.invalidateQueries({ queryKey: inboxQueryKey });
		}, 650);
	}, [inboxQueryKey, queryClient, user?.id]);

	const inboxQuery = useQuery({
		queryKey: inboxQueryKey,
		enabled: Boolean(user?.id),
		staleTime: 6000,
		refetchInterval: 25000,
		queryFn: async () => {
			const res = await getCommunicationInbox();
			return Array.isArray(res.data) ? res.data : [];
		},
	});

	const contactsQuery = useQuery({
		queryKey: [
			'communication',
			'contacts',
			user?.id,
			effectiveSearchRole,
			debouncedSearchText,
			debouncedSubjectText,
		],
		enabled: Boolean(user?.id),
		staleTime: 15000,
		queryFn: async () => {
			const res = await searchCommunicationContacts({
				role: effectiveSearchRole,
				search: debouncedSearchText,
				subject: debouncedSubjectText,
			});
			return Array.isArray(res.data) ? res.data : [];
		},
	});

	const messagesQuery = useQuery({
		queryKey: ['communication', 'messages', selectedConversationId],
		enabled: Boolean(user?.id && selectedConversationId),
		staleTime: 4000,
		queryFn: async () => {
			if (!selectedConversationId) return [];
			const res = await getConversationMessages(selectedConversationId, {
				limit: 200,
			});
			return Array.isArray(res.data) ? res.data : [];
		},
	});

	const inbox = useMemo(
		() => (Array.isArray(inboxQuery.data) ? inboxQuery.data : []),
		[inboxQuery.data],
	);
	const contactsRaw = useMemo(
		() => (Array.isArray(contactsQuery.data) ? contactsQuery.data : []),
		[contactsQuery.data],
	);
	const messages = useMemo(
		() => (Array.isArray(messagesQuery.data) ? messagesQuery.data : []),
		[messagesQuery.data],
	);

	const inboxLoading = inboxQuery.isLoading;
	const contactsLoading = contactsQuery.isFetching;
	const messagesLoading =
		Boolean(selectedConversationId) &&
		(messagesQuery.isLoading || messagesQuery.isFetching);

	const updateInboxWithMessage = useCallback(
		(incoming) => {
			if (!incoming?.conversation_id || !user?.id) return;
			queryClient.setQueryData(inboxQueryKey, (prev = []) => {
				if (!Array.isArray(prev)) return prev;
				const index = prev.findIndex(
					(item) => item.conversation_id === incoming.conversation_id,
				);
				if (index === -1) {
					scheduleInboxRefresh();
					return prev;
				}
				const current = prev[index];
				const isActive =
					activeConversationIdRef.current === incoming.conversation_id;
				const fromCurrentUser = incoming.sender_id === user.id;
				const nextUnread = fromCurrentUser || isActive
					? 0
					: Number(current.unread_count || 0) + 1;
				const updated = {
					...current,
					last_message_id: incoming.id || current.last_message_id,
					last_message_content: incoming.content,
					last_message_sender_id:
						incoming.sender_id || current.last_message_sender_id,
					last_message_created_at:
						incoming.created_at || current.last_message_created_at,
					last_message_is_deleted:
						incoming.is_deleted ?? current.last_message_is_deleted,
					last_message_at:
						incoming.created_at || incoming.updated_at || current.last_message_at,
					updated_at: incoming.updated_at || current.updated_at,
					unread_count: nextUnread,
				};
				const next = [...prev];
				next.splice(index, 1);
				next.unshift(updated);
				return next;
			});
		},
		[inboxQueryKey, queryClient, scheduleInboxRefresh, user?.id],
	);

	const upsertMessage = useCallback((incoming) => {
		if (!incoming?.conversation_id) return;
		queryClient.setQueryData(
			['communication', 'messages', incoming.conversation_id],
			(prev = []) => {
				if (!Array.isArray(prev)) return [incoming];
				const idx = prev.findIndex((m) => m.id === incoming.id);
				if (idx === -1) return sortMessagesByCreatedAt([...prev, incoming]);
				const copy = [...prev];
				copy[idx] = { ...copy[idx], ...incoming };
				return sortMessagesByCreatedAt(copy);
			},
		);
	}, [queryClient]);

	const softDeleteMessage = useCallback((incoming) => {
		if (!incoming?.conversation_id) return;
		queryClient.setQueryData(
			['communication', 'messages', incoming.conversation_id],
			(prev = []) =>
				Array.isArray(prev)
					? prev.map((m) =>
								m.id === incoming.id
									? {
											...m,
											content: incoming.content,
											is_deleted: incoming.is_deleted,
											updated_at: incoming.updated_at,
										}
									: m,
						)
					: prev,
		);
	}, [queryClient]);

	const loadContacts = useCallback(
		async ({ silent = false } = {}) => {
			try {
				if (silent) {
					queryClient.invalidateQueries({
						queryKey: ['communication', 'contacts', user?.id],
					});
					return;
				}
				await contactsQuery.refetch();
			} catch (err) {
				if (!silent)
					openToast(
						'error',
						err?.response?.data?.message || 'Failed to load contacts.',
					);
			}
		},
		[contactsQuery, openToast, queryClient, user?.id],
	);

	const markRead = useCallback(
		async (conversationId) => {
			if (!conversationId) return;
			queryClient.setQueryData(inboxQueryKey, (prev = []) => {
				if (!Array.isArray(prev)) return prev;
				return prev.map((item) =>
					item.conversation_id === conversationId
						? { ...item, unread_count: 0 }
						: item,
				);
			});
			try {
				await markConversationRead(conversationId);
			} catch {
				scheduleInboxRefresh();
			}
		},
		[inboxQueryKey, queryClient, scheduleInboxRefresh],
	);

	const handleNewSocketMessage = useCallback(
		(msg, activeConversationId) => {
			updateInboxWithMessage(msg);
			if (msg.conversation_id === activeConversationId) {
				upsertMessage(msg);
			}
			if (msg.conversation_id !== activeConversationId) {
				scheduleInboxRefresh();
			}
		},
		[scheduleInboxRefresh, updateInboxWithMessage, upsertMessage],
	);

	const handleUnreadCountUpdated = useCallback(
		(count) => {
			syncUnreadCount(count);
			scheduleInboxRefresh();
		},
		[scheduleInboxRefresh, syncUnreadCount],
	);

	const {
		joinConversationRoom,
		setActiveConversationId,
		markReadViaSocket,
		sendViaSocket,
	} = useSocket({
		userId: user?.id,
		onNewMessage: handleNewSocketMessage,
		onMessageUpdated: upsertMessage,
		onMessageDeleted: softDeleteMessage,
		onUnreadCountUpdated: handleUnreadCountUpdated,
		onInboxRefresh: scheduleInboxRefresh,
	});

	const selectConversation = useCallback(
		async (conversationId, otherUser) => {
			stickToBottomRef.current = true;
			activeConversationIdRef.current = conversationId;
			setSelectedConversation({ conversationId, otherUser });
			setReplyTo(null);
			setEditingMessageId(null);
			setEditingText('');
			setActiveConversationId(conversationId);
			joinConversationRoom(conversationId);
			queryClient.invalidateQueries({
				queryKey: ['communication', 'messages', conversationId],
			});
			markReadViaSocket(conversationId);
			markRead(conversationId);
			return true;
		},
		[
			joinConversationRoom,
			markRead,
			markReadViaSocket,
			queryClient,
			setActiveConversationId,
		],
	);

	const openConversationWithContact = useCallback(
		async (contact) => {
			try {
				const res = await openDirectConversation({ participantId: contact.id });
				const conversation = res.data?.conversation;
				const participant = res.data?.participant;
				if (!conversation) return false;
				return await selectConversation(
					conversation.id,
					participant || contact,
				);
			} catch (err) {
				openToast(
					'error',
					err?.response?.data?.message || 'Failed to open conversation.',
				);
				return false;
			}
		},
		[openToast, selectConversation],
	);

	const openConversationFromInbox = useCallback(
		async (item) => {
			const otherUser = {
				id: item.other_user_id,
				username: item.other_username,
				role: item.other_role,
				profile_pic: item.other_profile_pic,
			};
			return await selectConversation(item.conversation_id, otherUser);
		},
		[selectConversation],
	);

	const handleSendMessage = useCallback(async () => {
		const conversationId = selectedConversation?.conversationId;
		if (sending) return;
		if (!conversationId || !draft.trim()) return;
		const content = draft.trim();
		setSending(true);
		const payload = {
			conversationId,
			content,
			replyToMessageId: replyTo?.id || null,
		};
		const sentViaSocket = sendViaSocket(payload, (result) => {
			setSending(false);
			if (!result?.ok) {
				openToast('error', result?.message || 'Failed to send message.');
				return;
			}
			if (result?.message) {
				upsertMessage(result.message);
				updateInboxWithMessage(result.message);
			}
			setDraft('');
			setReplyTo(null);
			scheduleInboxRefresh();
		});
		if (sentViaSocket) return;
		try {
			const res = await sendCommunicationMessage(payload);
			if (res?.data) {
				upsertMessage(res.data);
				updateInboxWithMessage(res.data);
			}
			setDraft('');
			setReplyTo(null);
			scheduleInboxRefresh();
		} catch (err) {
			openToast(
				'error',
				err?.response?.data?.message || 'Failed to send message.',
			);
		} finally {
			setSending(false);
		}
	}, [
		draft,
		openToast,
		replyTo?.id,
		scheduleInboxRefresh,
		selectedConversation?.conversationId,
		sendViaSocket,
		sending,
		updateInboxWithMessage,
		upsertMessage,
	]);

	const handleEditMessage = useCallback(
		async (messageId) => {
			if (!editingText.trim()) {
				openToast('warning', 'Message cannot be empty.');
				return;
			}
			try {
				const res = await editCommunicationMessage(messageId, {
					content: editingText.trim(),
				});
				upsertMessage(res.data);
				updateInboxWithMessage(res.data);
				setEditingMessageId(null);
				setEditingText('');
				scheduleInboxRefresh();
			} catch (err) {
				openToast(
					'error',
					err?.response?.data?.message || 'Failed to edit message.',
				);
			}
		},
		[editingText, openToast, scheduleInboxRefresh, updateInboxWithMessage, upsertMessage],
	);

	const handleDeleteMessage = useCallback(
		async (messageId) => {
			if (!window.confirm('Delete this message?')) return;
			try {
				await deleteCommunicationMessage(messageId);
				if (selectedConversation?.conversationId) {
					await queryClient.invalidateQueries({
						queryKey: [
							'communication',
							'messages',
							selectedConversation.conversationId,
						],
					});
				}
				scheduleInboxRefresh();
			} catch (err) {
				openToast(
					'error',
					err?.response?.data?.message || 'Failed to delete message.',
				);
			}
		},
		[openToast, queryClient, scheduleInboxRefresh, selectedConversation?.conversationId],
	);

	const handleCopyMessage = useCallback(
		async (content) => {
			try {
				await navigator.clipboard.writeText(content);
				openToast('success', 'Copied to clipboard.');
			} catch {
				openToast('error', 'Failed to copy.');
			}
		},
		[openToast],
	);

	const openTeacherProfile = useCallback(async () => {
		if (!selectedConversation?.otherUser?.id) return;
		setTeacherProfileLoading(true);
		setTeacherProfile(null);
		setProfileModalOpen(true);
		try {
			const res = await getTeacherCommunicationProfile(
				selectedConversation.otherUser.id,
			);
			setTeacherProfile(res.data || null);
		} catch (err) {
			openToast(
				'error',
				err?.response?.data?.message || 'Failed to load profile.',
			);
			setProfileModalOpen(false);
		} finally {
			setTeacherProfileLoading(false);
		}
	}, [openToast, selectedConversation?.otherUser?.id]);

	const onMessagesScroll = useCallback(() => {
		const el = messageViewportRef.current;
		if (!el) return;
		stickToBottomRef.current =
			el.scrollHeight - el.scrollTop - el.clientHeight < 96;
	}, []);

	const sortedContacts = useMemo(
		() =>
			[...contactsRaw].sort((a, b) =>
				String(a?.username || '').localeCompare(String(b?.username || '')),
			),
		[contactsRaw],
	);

	useEffect(() => {
		if (!Array.isArray(inbox)) return;
		const total = inbox.reduce((s, i) => s + Number(i.unread_count || 0), 0);
		syncUnreadCount(total);
	}, [inbox, syncUnreadCount]);

	useEffect(() => {
		activeConversationIdRef.current =
			selectedConversation?.conversationId || null;
	}, [selectedConversation?.conversationId]);

	useEffect(() => {
		return () => {
			if (inboxRefreshTimeoutRef.current) {
				clearTimeout(inboxRefreshTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const el = messageViewportRef.current;
		if (!el || !stickToBottomRef.current) return;
		el.scrollTop = el.scrollHeight;
	}, [messages, selectedConversation?.conversationId]);

	useEffect(() => {
		stickToBottomRef.current = true;
	}, [selectedConversation?.conversationId]);

	return {
		inbox,
		contacts: sortedContacts,
		messages,
		inboxLoading,
		contactsLoading,
		messagesLoading,
		sending,
		selectedConversation,
		searchText,
		setSearchText,
		subjectText,
		setSubjectText,
		searchRole,
		setSearchRole,
		draft,
		setDraft,
		replyTo,
		setReplyTo,
		editingMessageId,
		setEditingMessageId,
		editingText,
		setEditingText,
		unreadCount,
		profileModalOpen,
		setProfileModalOpen,
		teacherProfile,
		teacherProfileLoading,
		messageViewportRef,
		loadContacts,
		openConversationWithContact,
		openConversationFromInbox,
		handleSendMessage,
		handleEditMessage,
		handleDeleteMessage,
		handleCopyMessage,
		openTeacherProfile,
		onMessagesScroll,
		user,
	};
}
