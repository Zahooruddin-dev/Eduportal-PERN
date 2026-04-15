import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	searchCommunicationContacts,
	getTeacherCommunicationProfile,
	openDirectConversation,
	getCommunicationInbox,
	getConversationMessages,
	markConversationRead,
	getCommunicationUnreadCount,
	sendCommunicationMessage,
	editCommunicationMessage,
	deleteCommunicationMessage,
} from '../../../../../../api/api';
import { useSocket } from './useSocket';

export function useCommunication({ user, openToast }) {
	const [inbox, setInbox] = useState([]);
	const [contacts, setContacts] = useState([]);
	const [messages, setMessages] = useState([]);
	const [inboxLoading, setInboxLoading] = useState(true);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [searchText, setSearchText] = useState('');
	const [subjectText, setSubjectText] = useState('');
	const [searchRole, setSearchRole] = useState(user?.role === 'student' ? 'teacher' : 'student');
	const [draft, setDraft] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [editingMessageId, setEditingMessageId] = useState(null);
	const [editingText, setEditingText] = useState('');
	const [unreadCount, setUnreadCount] = useState(0);
	const [profileModalOpen, setProfileModalOpen] = useState(false);
	const [teacherProfile, setTeacherProfile] = useState(null);
	const [teacherProfileLoading, setTeacherProfileLoading] = useState(false);

	const messageViewportRef = useRef(null);
	const stickToBottomRef = useRef(true);

	const emitUnreadEvent = useCallback((count) => {
		window.dispatchEvent(new CustomEvent('communication-unread', { detail: { count } }));
	}, []);

	const syncUnreadCount = useCallback((count) => {
		setUnreadCount(count);
		emitUnreadEvent(count);
	}, [emitUnreadEvent]);

	const upsertMessage = useCallback((incoming) => {
		setMessages((prev) => {
			const idx = prev.findIndex((m) => m.id === incoming.id);
			if (idx === -1) return [...prev, incoming];
			const copy = [...prev];
			copy[idx] = incoming;
			return copy;
		});
	}, []);

	const softDeleteMessage = useCallback((incoming) => {
		setMessages((prev) =>
			prev.map((m) =>
				m.id === incoming.id
					? { ...m, content: incoming.content, is_deleted: incoming.is_deleted, updated_at: incoming.updated_at }
					: m,
			),
		);
	}, []);

	const loadInbox = useCallback(async ({ silent = false } = {}) => {
		if (!silent) setInboxLoading(true);
		try {
			const res = await getCommunicationInbox();
			const list = Array.isArray(res.data) ? res.data : [];
			setInbox(list);
			const total = list.reduce((s, i) => s + Number(i.unread_count || 0), 0);
			syncUnreadCount(total);
		} catch (err) {
			if (!silent) openToast('error', err?.response?.data?.message || 'Failed to load inbox.');
		} finally {
			if (!silent) setInboxLoading(false);
		}
	}, [openToast, syncUnreadCount]);

	const loadContacts = useCallback(async ({ silent = false } = {}) => {
		if (!silent) setContactsLoading(true);
		try {
			const res = await searchCommunicationContacts({
				role: user?.role === 'student' ? 'teacher' : searchRole,
				search: searchText,
				subject: subjectText,
			});
			setContacts(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			if (!silent) openToast('error', err?.response?.data?.message || 'Failed to load contacts.');
		} finally {
			if (!silent) setContactsLoading(false);
		}
	}, [openToast, searchRole, searchText, subjectText, user?.role]);

	const markRead = useCallback(async (conversationId) => {
		if (!conversationId) return;
		try {
			await markConversationRead(conversationId);
		} catch {
			return;
		}
		loadInbox({ silent: true });
	}, [loadInbox]);

	const loadMessages = useCallback(async (conversationId) => {
		setMessagesLoading(true);
		try {
			const res = await getConversationMessages(conversationId, { limit: 200 });
			setMessages(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to load messages.');
		} finally {
			setMessagesLoading(false);
		}
	}, [openToast]);

	const handleNewSocketMessage = useCallback((msg, activeConversationId) => {
		if (msg.conversation_id === activeConversationId) {
			upsertMessage(msg);
		}
	}, [upsertMessage]);

	const handleUnreadCountUpdated = useCallback((count) => {
		syncUnreadCount(count);
	}, [syncUnreadCount]);

	const { joinConversationRoom, setActiveConversationId, markReadViaSocket, sendViaSocket } = useSocket({
		userId: user?.id,
		onNewMessage: handleNewSocketMessage,
		onMessageUpdated: upsertMessage,
		onMessageDeleted: softDeleteMessage,
		onUnreadCountUpdated: handleUnreadCountUpdated,
		loadInbox,
	});

	const selectConversation = useCallback(async (conversationId, otherUser) => {
		stickToBottomRef.current = true;
		setSelectedConversation({ conversationId, otherUser });
		setReplyTo(null);
		setEditingMessageId(null);
		setEditingText('');
		setActiveConversationId(conversationId);
		joinConversationRoom(conversationId);
		await loadMessages(conversationId);
		markReadViaSocket(conversationId);
		await markRead(conversationId);
		await loadInbox({ silent: true });
	}, [joinConversationRoom, loadInbox, loadMessages, markRead, markReadViaSocket, setActiveConversationId]);

	const openConversationWithContact = useCallback(async (contact) => {
		try {
			const res = await openDirectConversation({ participantId: contact.id });
			const conversation = res.data?.conversation;
			const participant = res.data?.participant;
			if (!conversation) return;
			await selectConversation(conversation.id, participant || contact);
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to open conversation.');
		}
	}, [openToast, selectConversation]);

	const openConversationFromInbox = useCallback(async (item) => {
		const otherUser = {
			id: item.other_user_id,
			username: item.other_username,
			role: item.other_role,
			profile_pic: item.other_profile_pic,
		};
		await selectConversation(item.conversation_id, otherUser);
	}, [selectConversation]);

	const handleSendMessage = useCallback(async () => {
		const conversationId = selectedConversation?.conversationId;
		if (!conversationId || !draft.trim()) return;
		const content = draft.trim();
		setSending(true);
		const payload = { conversationId, content, replyToMessageId: replyTo?.id || null };
		const sentViaSocket = sendViaSocket(payload, (result) => {
			setSending(false);
			if (!result?.ok) {
				openToast('error', result?.message || 'Failed to send message.');
				return;
			}
			setDraft('');
			setReplyTo(null);
			loadInbox({ silent: true });
		});
		if (sentViaSocket) return;
		try {
			await sendCommunicationMessage(payload);
			setDraft('');
			setReplyTo(null);
			await loadMessages(conversationId);
			await loadInbox({ silent: true });
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to send message.');
		} finally {
			setSending(false);
		}
	}, [draft, loadInbox, loadMessages, openToast, replyTo?.id, selectedConversation?.conversationId, sendViaSocket]);

	const handleEditMessage = useCallback(async (messageId) => {
		if (!editingText.trim()) { openToast('warning', 'Message cannot be empty.'); return; }
		try {
			const res = await editCommunicationMessage(messageId, { content: editingText.trim() });
			upsertMessage(res.data);
			setEditingMessageId(null);
			setEditingText('');
			await loadInbox({ silent: true });
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to edit message.');
		}
	}, [editingText, loadInbox, openToast, upsertMessage]);

	const handleDeleteMessage = useCallback(async (messageId) => {
		if (!window.confirm('Delete this message?')) return;
		try {
			await deleteCommunicationMessage(messageId);
			if (selectedConversation?.conversationId) {
				await loadMessages(selectedConversation.conversationId);
			}
			await loadInbox({ silent: true });
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to delete message.');
		}
	}, [loadInbox, loadMessages, openToast, selectedConversation?.conversationId]);

	const handleCopyMessage = useCallback(async (content) => {
		try {
			await navigator.clipboard.writeText(content);
			openToast('success', 'Copied to clipboard.');
		} catch {
			openToast('error', 'Failed to copy.');
		}
	}, [openToast]);

	const openTeacherProfile = useCallback(async () => {
		if (!selectedConversation?.otherUser?.id) return;
		setTeacherProfileLoading(true);
		setProfileModalOpen(true);
		try {
			const res = await getTeacherCommunicationProfile(selectedConversation.otherUser.id);
			setTeacherProfile(res.data || null);
		} catch (err) {
			openToast('error', err?.response?.data?.message || 'Failed to load profile.');
			setProfileModalOpen(false);
		} finally {
			setTeacherProfileLoading(false);
		}
	}, [openToast, selectedConversation?.otherUser?.id]);

	const onMessagesScroll = useCallback(() => {
		const el = messageViewportRef.current;
		if (!el) return;
		stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
	}, []);

	const sortedContacts = useMemo(
		() => [...contacts].sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || ''))),
		[contacts],
	);

	useEffect(() => {
		loadInbox();
		loadContacts();
		getCommunicationUnreadCount()
			.then((res) => syncUnreadCount(Number(res.data?.unreadCount || 0)))
			.catch(() => {});
	}, []);

	useEffect(() => {
		const id = setInterval(() => {
			loadInbox({ silent: true });
			getCommunicationUnreadCount()
				.then((res) => syncUnreadCount(Number(res.data?.unreadCount || 0)))
				.catch(() => {});
		}, 12000);
		return () => clearInterval(id);
	}, [loadInbox, syncUnreadCount]);

	useEffect(() => {
		const el = messageViewportRef.current;
		if (!el || !stickToBottomRef.current) return;
		el.scrollTop = el.scrollHeight;
	}, [messages, selectedConversation?.conversationId]);

	useEffect(() => {
		stickToBottomRef.current = true;
	}, [selectedConversation?.conversationId]);

	return {
		inbox, contacts: sortedContacts, messages,
		inboxLoading, contactsLoading, messagesLoading, sending,
		selectedConversation,
		searchText, setSearchText,
		subjectText, setSubjectText,
		searchRole, setSearchRole,
		draft, setDraft,
		replyTo, setReplyTo,
		editingMessageId, setEditingMessageId,
		editingText, setEditingText,
		unreadCount,
		profileModalOpen, setProfileModalOpen,
		teacherProfile, teacherProfileLoading,
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