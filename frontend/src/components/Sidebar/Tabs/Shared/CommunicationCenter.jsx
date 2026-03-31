import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
	BellRing,
	ChevronRight,
	Clock3,
	Copy,
	Inbox,
	Loader2,
	MessageSquare,
	Pencil,
	Reply,
	Search,
	SendHorizontal,
	Trash2,
	User,
	Users,
	X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
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
} from '../../../../api/api';
import Toast from '../../../Toast';

function toLabel(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeContact(contact) {
	if (contact.role === 'teacher') {
		const list = Array.isArray(contact.teacher_subjects) ? contact.teacher_subjects.filter(Boolean) : [];
		return list.slice(0, 3).join(', ') || 'Teacher';
	}
	if (contact.role === 'student') {
		const list = Array.isArray(contact.student_subjects) ? contact.student_subjects.filter(Boolean) : [];
		return list.slice(0, 3).join(', ') || 'Student';
	}
	return toLabel(contact.role);
}

function avatarContent(user) {
	return String(user?.username || '?').charAt(0).toUpperCase();
}

function formatTime(value) {
	if (!value) return '--';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '--';
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value) {
	if (!value) return 'No activity yet';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'No activity yet';
	return date.toLocaleString([], {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatMessagePreview(content) {
	const text = String(content || '').trim();
	if (!text) return 'No messages yet';
	return text;
}

export default function CommunicationCenter() {
	const { user } = useAuth();
	const socketRef = useRef(null);
	const activeConversationIdRef = useRef(null);
	const messageViewportRef = useRef(null);
	const stickToBottomRef = useRef(true);
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
	const [searchRole, setSearchRole] = useState(
		user?.role === 'student' ? 'teacher' : 'student',
	);
	const [draft, setDraft] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [editingMessageId, setEditingMessageId] = useState(null);
	const [editingText, setEditingText] = useState('');
	const [unreadCount, setUnreadCount] = useState(0);
	const [profileModalOpen, setProfileModalOpen] = useState(false);
	const [teacherProfile, setTeacherProfile] = useState(null);
	const [teacherProfileLoading, setTeacherProfileLoading] = useState(false);
	const [activeSidebarPanel, setActiveSidebarPanel] = useState('inbox');
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const emitUnreadEvent = useCallback((count) => {
		window.dispatchEvent(
			new CustomEvent('communication-unread', {
				detail: { count },
			}),
		);
	}, []);

	const syncUnreadCount = useCallback((count) => {
		setUnreadCount(count);
		emitUnreadEvent(count);
	}, [emitUnreadEvent]);

	const upsertMessage = useCallback((incomingMessage) => {
		setMessages((previous) => {
			const index = previous.findIndex((item) => item.id === incomingMessage.id);
			if (index === -1) {
				return [...previous, incomingMessage];
			}
			const copy = [...previous];
			copy[index] = incomingMessage;
			return copy;
		});
	}, []);

	const removeOrUpdateDeletedMessage = useCallback((incomingMessage) => {
		setMessages((previous) =>
			previous.map((item) =>
				item.id === incomingMessage.id
					? {
						...item,
						content: incomingMessage.content,
						is_deleted: incomingMessage.is_deleted,
						updated_at: incomingMessage.updated_at,
					}
					: item,
			),
		);
	}, []);

	const loadUnreadCount = useCallback(async () => {
		try {
			const response = await getCommunicationUnreadCount();
			const count = Number(response.data?.unreadCount || 0);
			syncUnreadCount(count);
		} catch {
			return null;
		}
	}, [syncUnreadCount]);

	const loadInbox = useCallback(async ({ silent = false } = {}) => {
		if (!silent) {
			setInboxLoading(true);
		}
		try {
			const response = await getCommunicationInbox();
			const list = Array.isArray(response.data) ? response.data : [];
			setInbox(list);
			const totalUnread = list.reduce(
				(sum, item) => sum + Number(item.unread_count || 0),
				0,
			);
			syncUnreadCount(totalUnread);
		} catch (error) {
			if (!silent) {
				openToast('error', error?.response?.data?.message || 'Failed to load inbox.');
			}
		} finally {
			if (!silent) {
				setInboxLoading(false);
			}
		}
	}, [openToast, syncUnreadCount]);

	const loadContacts = useCallback(async ({ silent = false } = {}) => {
		if (!silent) {
			setContactsLoading(true);
		}
		try {
			const response = await searchCommunicationContacts({
				role: user?.role === 'student' ? 'teacher' : searchRole,
				search: searchText,
				subject: subjectText,
			});
			setContacts(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (!silent) {
				openToast('error', error?.response?.data?.message || 'Failed to load contacts.');
			}
		} finally {
			if (!silent) {
				setContactsLoading(false);
			}
		}
	}, [openToast, searchRole, searchText, subjectText, user?.role]);

	const joinConversationRoom = useCallback((conversationId) => {
		const socket = socketRef.current;
		if (!socket || !socket.connected) return;
		socket.emit('chat:join-conversation', { conversationId }, () => {});
	}, []);

	const markRead = useCallback(async (conversationId) => {
		if (!conversationId) return;
		const socket = socketRef.current;
		if (socket && socket.connected) {
			socket.emit('chat:mark-read', { conversationId }, () => {});
		}
		try {
			await markConversationRead(conversationId);
		} catch {
			return;
		}
		loadInbox({ silent: true });
	}, [loadInbox]);

	const loadConversationMessages = useCallback(async (conversationId) => {
		setMessagesLoading(true);
		try {
			const response = await getConversationMessages(conversationId, { limit: 200 });
			setMessages(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load messages.');
		} finally {
			setMessagesLoading(false);
		}
	}, [openToast]);

	const openConversationWithContact = useCallback(async (contact) => {
		try {
			const response = await openDirectConversation({ participantId: contact.id });
			const conversation = response.data?.conversation;
			const participant = response.data?.participant;
			if (!conversation) return;

			setSelectedConversation({
				conversationId: conversation.id,
				otherUser: participant || contact,
			});
			setReplyTo(null);
			setEditingMessageId(null);
			setEditingText('');
			setActiveSidebarPanel('inbox');
			joinConversationRoom(conversation.id);
			await loadConversationMessages(conversation.id);
			await markRead(conversation.id);
			await loadInbox({ silent: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to open conversation.');
		}
	}, [joinConversationRoom, loadConversationMessages, loadInbox, markRead, openToast]);

	const openConversationFromInbox = useCallback(async (item) => {
		const otherUser = {
			id: item.other_user_id,
			username: item.other_username,
			role: item.other_role,
			profile_pic: item.other_profile_pic,
		};
		setSelectedConversation({
			conversationId: item.conversation_id,
			otherUser,
		});
		setReplyTo(null);
		setEditingMessageId(null);
		setEditingText('');
		setActiveSidebarPanel('inbox');
		joinConversationRoom(item.conversation_id);
		await loadConversationMessages(item.conversation_id);
		await markRead(item.conversation_id);
	}, [joinConversationRoom, loadConversationMessages, markRead]);

	useEffect(() => {
		activeConversationIdRef.current = selectedConversation?.conversationId || null;
	}, [selectedConversation]);

	useEffect(() => {
		stickToBottomRef.current = true;
	}, [selectedConversation?.conversationId]);

	useEffect(() => {
		if (!selectedConversation?.conversationId) return;
		joinConversationRoom(selectedConversation.conversationId);
	}, [joinConversationRoom, selectedConversation?.conversationId]);

	useEffect(() => {
		loadInbox();
		loadContacts();
		loadUnreadCount();
	}, [loadContacts, loadInbox, loadUnreadCount]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			loadInbox({ silent: true });
			loadUnreadCount();
		}, 12000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [loadInbox, loadUnreadCount]);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) return;

		const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', {
			auth: { token },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;

		socket.on('connect', () => {
			const conversationId = activeConversationIdRef.current;
			if (conversationId) {
				socket.emit('chat:join-conversation', { conversationId }, () => {});
			}
		});

		socket.on('chat:new-message', (incomingMessage) => {
			const currentConversationId = activeConversationIdRef.current;
			if (incomingMessage.conversation_id === currentConversationId) {
				upsertMessage(incomingMessage);
				if (incomingMessage.sender_id !== user?.id) {
					markRead(currentConversationId);
				}
			}
			loadInbox({ silent: true });
		});

		socket.on('chat:message-updated', (incomingMessage) => {
			if (incomingMessage.conversation_id === activeConversationIdRef.current) {
				upsertMessage(incomingMessage);
			}
			loadInbox({ silent: true });
		});

		socket.on('chat:message-deleted', (incomingMessage) => {
			if (incomingMessage.conversation_id === activeConversationIdRef.current) {
				removeOrUpdateDeletedMessage(incomingMessage);
			}
			loadInbox({ silent: true });
		});

		socket.on('chat:unread-count-updated', (payload) => {
			const count = Number(payload?.unreadCount || 0);
			syncUnreadCount(count);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [loadInbox, markRead, removeOrUpdateDeletedMessage, syncUnreadCount, upsertMessage, user?.id]);

	useEffect(() => {
		const viewport = messageViewportRef.current;
		if (!viewport || !stickToBottomRef.current) return;
		viewport.scrollTop = viewport.scrollHeight;
	}, [messages, selectedConversation?.conversationId]);

	const sortedContacts = useMemo(
		() => [...contacts].sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || ''))),
		[contacts],
	);

	const unreadConversationsCount = useMemo(
		() => inbox.reduce((total, item) => (Number(item.unread_count || 0) > 0 ? total + 1 : total), 0),
		[inbox],
	);

	const canManageOwnMessage = useCallback((message) => {
		return user?.role === 'teacher' && message.sender_id === user.id;
	}, [user?.id, user?.role]);

	const onMessagesScroll = useCallback(() => {
		const viewport = messageViewportRef.current;
		if (!viewport) return;
		const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
		stickToBottomRef.current = distanceFromBottom < 96;
	}, []);

	const handleSendMessage = useCallback(async () => {
		const conversationId = selectedConversation?.conversationId;
		if (!conversationId) {
			openToast('warning', 'Select a conversation first.');
			return;
		}
		if (!draft.trim()) return;

		const content = draft.trim();
		setSending(true);
		const socket = socketRef.current;

		if (socket && socket.connected) {
			socket.emit(
				'chat:send-message',
				{
					conversationId,
					content,
					replyToMessageId: replyTo?.id || null,
				},
				(result) => {
					setSending(false);
					if (!result?.ok) {
						openToast('error', result?.message || 'Failed to send message.');
						return;
					}
					setDraft('');
					setReplyTo(null);
					loadInbox({ silent: true });
				},
			);
			return;
		}

		try {
			await sendCommunicationMessage({
				conversationId,
				content,
				replyToMessageId: replyTo?.id || null,
			});
			setDraft('');
			setReplyTo(null);
			await loadConversationMessages(conversationId);
			await loadInbox({ silent: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to send message.');
		} finally {
			setSending(false);
		}
	}, [draft, loadConversationMessages, loadInbox, openToast, replyTo?.id, selectedConversation?.conversationId]);

	const handleEditMessage = useCallback(async (messageId) => {
		if (!editingText.trim()) {
			openToast('warning', 'Message content is required.');
			return;
		}
		try {
			const response = await editCommunicationMessage(messageId, {
				content: editingText.trim(),
			});
			upsertMessage(response.data);
			setEditingMessageId(null);
			setEditingText('');
			await loadInbox({ silent: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to edit message.');
		}
	}, [editingText, loadInbox, openToast, upsertMessage]);

	const handleDeleteMessage = useCallback(async (messageId) => {
		const confirmed = window.confirm('Delete this message?');
		if (!confirmed) return;
		try {
			await deleteCommunicationMessage(messageId);
			if (selectedConversation?.conversationId) {
				await loadConversationMessages(selectedConversation.conversationId);
			}
			await loadInbox({ silent: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to delete message.');
		}
	}, [loadConversationMessages, loadInbox, openToast, selectedConversation?.conversationId]);

	const handleCopyMessage = useCallback(async (messageContent) => {
		try {
			await navigator.clipboard.writeText(messageContent);
			openToast('success', 'Message copied.');
		} catch {
			openToast('error', 'Failed to copy message.');
		}
	}, [openToast]);

	const openTeacherProfile = useCallback(async () => {
		if (!selectedConversation?.otherUser?.id) return;
		setTeacherProfileLoading(true);
		setProfileModalOpen(true);
		try {
			const response = await getTeacherCommunicationProfile(
				selectedConversation.otherUser.id,
			);
			setTeacherProfile(response.data || null);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load teacher profile.');
			setProfileModalOpen(false);
		} finally {
			setTeacherProfileLoading(false);
		}
	}, [openToast, selectedConversation?.otherUser?.id]);

	const actionButtonClass =
		'inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40';

	const activeSidebarButtonClass =
		'rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40';

	return (
		<div className='p-3 sm:p-5 lg:p-8'>
			<div className='mx-auto grid max-w-[1460px] gap-4 xl:grid-cols-[360px_1fr]'>
				<aside className='space-y-4'>
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm'>
						<div className='grid grid-cols-2 rounded-xl bg-[var(--color-input-bg)] p-1 xl:hidden'>
							<button
								type='button'
								onClick={() => setActiveSidebarPanel('inbox')}
								className={`${activeSidebarButtonClass} ${
									activeSidebarPanel === 'inbox'
										? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
										: 'text-[var(--color-text-muted)]'
								}`}
							>
								Inbox
							</button>
							<button
								type='button'
								onClick={() => setActiveSidebarPanel('contacts')}
								className={`${activeSidebarButtonClass} ${
									activeSidebarPanel === 'contacts'
										? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
										: 'text-[var(--color-text-muted)]'
								}`}
							>
								Directory
							</button>
						</div>

						<section className={`${activeSidebarPanel !== 'inbox' ? 'hidden xl:block' : 'block'} mt-3 xl:mt-0`}>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]'>Messages</p>
									<h2 className='mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]'>
										<Inbox size={18} />
										Inbox
									</h2>
								</div>
								<div className='rounded-full bg-[var(--color-primary)]/12 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]'>
									{unreadCount} unread
								</div>
							</div>
							<p className='mt-1 text-xs text-[var(--color-text-muted)]'>
								{unreadConversationsCount} conversations need your attention.
							</p>

							<div className='mt-3 max-h-[360px] space-y-2 overflow-auto pr-1'>
								{inboxLoading ? (
									<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-muted)]'>
										Loading inbox...
									</div>
								) : inbox.length ? (
									inbox.map((item) => (
										<button
											key={item.conversation_id}
											type='button'
											onClick={() => openConversationFromInbox(item)}
											className={`w-full rounded-xl border p-3 text-left transition ${
												selectedConversation?.conversationId === item.conversation_id
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 shadow-sm'
													: 'border-[var(--color-border)] hover:bg-[var(--color-border)]/30'
											}`}
										>
											<div className='flex items-start justify-between gap-2'>
												<div className='min-w-0'>
													<p className='truncate text-sm font-semibold text-[var(--color-text-primary)]'>
														{item.other_username}
													</p>
													<p className='mt-0.5 truncate text-xs text-[var(--color-text-muted)]'>
														{formatMessagePreview(item.last_message_content)}
													</p>
												</div>
												<div className='flex shrink-0 items-center gap-1.5'>
													{Number(item.unread_count || 0) > 0 && (
														<span className='rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white'>
															{item.unread_count}
														</span>
													)}
													<ChevronRight size={14} className='text-[var(--color-text-muted)]' />
												</div>
											</div>
											<p className='mt-2 flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]'>
												<Clock3 size={12} />
												{formatDateTime(item.last_message_at || item.updated_at || item.created_at)}
											</p>
										</button>
									))
								) : (
									<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-muted)]'>
										No conversations yet. Start one from the directory below.
									</div>
								)}
							</div>
						</section>

						<section className={`${activeSidebarPanel !== 'contacts' ? 'hidden xl:block' : 'block'} mt-4`}>
							<div>
								<p className='text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]'>People</p>
								<h2 className='mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]'>
									<Users size={18} />
									Directory
								</h2>
							</div>
							<div className='mt-3 space-y-2'>
								{user?.role !== 'student' && (
									<select
										value={searchRole}
										onChange={(event) => setSearchRole(event.target.value)}
										className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
									>
										<option value='student'>Students</option>
										<option value='teacher'>Teachers</option>
										<option value='all'>All</option>
									</select>
								)}
								<div className='relative'>
									<Search size={14} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]' />
									<input
										value={searchText}
										onChange={(event) => setSearchText(event.target.value)}
										placeholder='Search by name'
										className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
									/>
								</div>
								<input
									value={subjectText}
									onChange={(event) => setSubjectText(event.target.value)}
									placeholder='Filter by subject'
									className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
								/>
								<button
									type='button'
									onClick={() => loadContacts()}
									disabled={contactsLoading}
									className='inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40 disabled:cursor-not-allowed disabled:opacity-60'
								>
									{contactsLoading ? <Loader2 size={14} className='animate-spin' /> : <Search size={14} />}
									{contactsLoading ? 'Searching...' : 'Search Contacts'}
								</button>
							</div>

							<div className='mt-3 max-h-[320px] space-y-2 overflow-auto pr-1'>
								{sortedContacts.map((contact) => (
									<button
										key={contact.id}
										type='button'
										onClick={() => openConversationWithContact(contact)}
										className='w-full rounded-xl border border-[var(--color-border)] p-3 text-left transition hover:bg-[var(--color-border)]/30'
									>
										<div className='flex items-center gap-2'>
											<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-xs font-semibold text-[var(--color-primary)]'>
												{avatarContent(contact)}
											</div>
											<div className='min-w-0'>
												<p className='truncate text-sm font-semibold text-[var(--color-text-primary)]'>
													{contact.username}
												</p>
												<p className='truncate text-xs text-[var(--color-text-muted)]'>{summarizeContact(contact)}</p>
											</div>
										</div>
									</button>
								))}
								{!contactsLoading && !sortedContacts.length && (
									<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-muted)]'>
										No contacts found. Try a broader search.
									</div>
								)}
							</div>
						</section>
					</div>
				</aside>

				<section className='min-h-[68vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'>
					{selectedConversation ? (
						<>
							<div className='flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3'>
								<div className='flex min-w-0 items-center gap-3'>
									<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-semibold text-[var(--color-primary)]'>
										{avatarContent(selectedConversation.otherUser)}
									</div>
									<div className='min-w-0'>
										<p className='truncate text-lg font-semibold text-[var(--color-text-primary)]'>
											{selectedConversation.otherUser?.username}
										</p>
										<p className='text-xs text-[var(--color-text-muted)] capitalize'>
											{toLabel(selectedConversation.otherUser?.role)}
										</p>
									</div>
								</div>

								<div className='flex items-center gap-2'>
									{user?.role === 'student' && selectedConversation.otherUser?.role === 'teacher' && (
										<button
											type='button'
											onClick={openTeacherProfile}
											className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40'
										>
											View teacher profile
										</button>
									)}
								</div>
							</div>

							<div
								ref={messageViewportRef}
								onScroll={onMessagesScroll}
								aria-live='polite'
								className='mt-4 h-[52vh] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 sm:h-[470px] sm:p-4'
							>
								{messagesLoading ? (
									<div className='flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]'>
										<Loader2 size={18} className='mr-2 animate-spin' />
										Loading messages...
									</div>
								) : messages.length ? (
									<div className='space-y-3'>
										{messages.map((message) => {
											const mine = message.sender_id === user?.id;
											const canManage = canManageOwnMessage(message);
											const isDeleted = Boolean(message.is_deleted);

											return (
												<div key={message.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
													<div
														className={`max-w-[90%] rounded-2xl border px-3 py-2 shadow-sm sm:max-w-[78%] ${
															mine
																? 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10'
																: 'border-[var(--color-border)] bg-[var(--color-surface)]'
														}`}
													>
														<div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-text-muted)]'>
															<span className='font-semibold'>
																{mine ? 'You' : message.sender_username || 'User'}
															</span>
															<span>{formatTime(message.created_at)}</span>
															{message.edited_at && (
																<span className='rounded bg-[var(--color-border)] px-1.5 py-0.5'>edited</span>
															)}
														</div>

														{message.reply_to_message_id && (
															<div className='mt-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]'>
																Reply to {message.reply_sender_username || 'user'}:{' '}
																{message.reply_is_deleted ? '[deleted]' : message.reply_content}
															</div>
														)}

														{editingMessageId === message.id ? (
															<div className='mt-2 space-y-2'>
																<textarea
																	rows={2}
																	value={editingText}
																	onChange={(event) => setEditingText(event.target.value)}
																	className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
																/>
																<div className='flex flex-wrap gap-2'>
																	<button
																		type='button'
																		onClick={() => handleEditMessage(message.id)}
																		className={actionButtonClass}
																	>
																		<Pencil size={12} /> Save
																	</button>
																	<button
																		type='button'
																		onClick={() => {
																			setEditingMessageId(null);
																			setEditingText('');
																		}}
																		className={actionButtonClass}
																	>
																		<X size={12} /> Cancel
																	</button>
																</div>
															</div>
														) : (
															<p
																className={`mt-1.5 whitespace-pre-wrap text-sm ${
																	isDeleted
																		? 'italic text-[var(--color-text-muted)]'
																		: 'text-[var(--color-text-primary)]'
																}`}
															>
																{message.content}
															</p>
														)}

														<div className='mt-2 flex flex-wrap gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100'>
															<button
																type='button'
																onClick={() => setReplyTo(message)}
																className={actionButtonClass}
															>
																<Reply size={12} /> Reply
															</button>
															<button
																type='button'
																onClick={() => handleCopyMessage(message.content)}
																disabled={!message.content}
																className={`${actionButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
															>
																<Copy size={12} /> Copy
															</button>
															{canManage && !isDeleted && (
																<>
																	<button
																		type='button'
																		onClick={() => {
																			setEditingMessageId(message.id);
																			setEditingText(message.content);
																		}}
																		className={actionButtonClass}
																	>
																		<Pencil size={12} /> Edit
																	</button>
																	<button
																		type='button'
																		onClick={() => handleDeleteMessage(message.id)}
																		className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-500/10'
																	>
																		<Trash2 size={12} /> Delete
																	</button>
																</>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className='flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]'>
										No messages yet. Say hello to start the conversation.
									</div>
								)}
							</div>

							<div className='mt-4 space-y-2 border-t border-[var(--color-border)] pt-3'>
								{replyTo && (
									<div className='flex items-start justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]'>
										<p className='truncate'>
											Replying to {replyTo.sender_username || 'user'}: {replyTo.content}
										</p>
										<button
											type='button'
											onClick={() => setReplyTo(null)}
											className='text-[var(--color-primary)] hover:underline'
										>
											Clear
										</button>
									</div>
								)}

								<div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
									<div className='w-full'>
										<textarea
											rows={2}
											value={draft}
											onChange={(event) => setDraft(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter' && !event.shiftKey) {
													event.preventDefault();
													handleSendMessage();
												}
											}}
											placeholder='Type a message. Press Enter to send, Shift + Enter for a new line.'
											className='min-h-[84px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
										<p className='mt-1 text-right text-[11px] text-[var(--color-text-muted)]'>
											{draft.trim().length} characters
										</p>
									</div>
									<button
										type='button'
										onClick={handleSendMessage}
										disabled={sending || !draft.trim()}
										className='inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60'
									>
										{sending ? <Loader2 size={16} className='animate-spin' /> : <SendHorizontal size={16} />}
										{sending ? 'Sending...' : 'Send'}
									</button>
								</div>
							</div>
						</>
					) : (
						<div className='flex h-[62vh] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-input-bg)] text-center sm:h-[640px]'>
							<div className='mb-3 rounded-full bg-[var(--color-primary)]/12 p-3 text-[var(--color-primary)]'>
								<MessageSquare size={24} />
							</div>
							<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Your communication center is ready</h3>
							<p className='mt-1 max-w-md px-4 text-sm text-[var(--color-text-muted)]'>
								Select a conversation from the inbox or search your directory to start messaging.
							</p>
						</div>
					)}
				</section>
			</div>

			{profileModalOpen && (
				<div className='overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'>
					<div className='fade-scale-in w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl'>
						<div className='flex items-start justify-between gap-3'>
							<div>
								<p className='text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]'>Teacher details</p>
								<h3 className='mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]'>
									<BellRing size={18} />
									Teacher profile
								</h3>
							</div>
							<button
								type='button'
								onClick={() => setProfileModalOpen(false)}
								className='rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text-primary)]'
								aria-label='Close teacher profile'
							>
								<X size={14} />
							</button>
						</div>

						{teacherProfileLoading ? (
							<div className='mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-muted)]'>
								Loading profile...
							</div>
						) : teacherProfile?.teacher ? (
							<div className='mt-4 space-y-4'>
								<div className='flex items-center gap-3'>
									{teacherProfile.teacher.profile_pic ? (
										<img
											src={teacherProfile.teacher.profile_pic}
											alt={teacherProfile.teacher.username}
											className='h-12 w-12 rounded-full object-cover'
										/>
									) : (
										<div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]'>
											<User size={18} />
										</div>
									)}
									<div>
										<p className='text-sm font-semibold text-[var(--color-text-primary)]'>{teacherProfile.teacher.username}</p>
										<p className='text-xs text-[var(--color-text-muted)]'>{teacherProfile.teacher.email}</p>
									</div>
								</div>

								<div>
									<p className='text-sm font-medium text-[var(--color-text-secondary)]'>Classes</p>
									<div className='mt-2 max-h-56 space-y-2 overflow-auto'>
										{teacherProfile.classes?.length ? (
											teacherProfile.classes.map((classItem) => (
												<div key={classItem.id} className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-2.5'>
													<p className='text-sm font-medium text-[var(--color-text-primary)]'>{classItem.class_name}</p>
													<p className='text-xs text-[var(--color-text-muted)]'>
														{classItem.subject || 'No subject'} - {classItem.grade_level || 'No grade level'}
													</p>
												</div>
											))
										) : (
											<div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-2 text-xs text-[var(--color-text-muted)]'>
												No classes found.
											</div>
										)}
									</div>
								</div>
							</div>
						) : (
							<div className='mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-muted)]'>
								Teacher profile is not available right now.
							</div>
						)}
					</div>
				</div>
			)}

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
			/>
		</div>
	);
}
