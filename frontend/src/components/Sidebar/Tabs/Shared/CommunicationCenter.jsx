import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
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

export default function CommunicationCenter() {
	const { user } = useAuth();
	const socketRef = useRef(null);
	const activeConversationIdRef = useRef(null);
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
		joinConversationRoom(item.conversation_id);
		await loadConversationMessages(item.conversation_id);
		await markRead(item.conversation_id);
	}, [joinConversationRoom, loadConversationMessages, markRead]);

	useEffect(() => {
		activeConversationIdRef.current = selectedConversation?.conversationId || null;
	}, [selectedConversation]);

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

	const sortedContacts = useMemo(() => contacts, [contacts]);

	const canManageOwnMessage = useCallback((message) => {
		return user?.role === 'teacher' && message.sender_id === user.id;
	}, [user?.id, user?.role]);

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
			await loadInbox({ silent: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to delete message.');
		}
	}, [loadInbox, openToast]);

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

	return (
		<div className='p-4 sm:p-6 lg:p-8'>
			<div className='grid gap-4 lg:grid-cols-[340px_1fr]'>
				<div className='space-y-4'>
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
						<div className='flex items-center justify-between'>
							<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Inbox</h2>
							<span className='rounded-full bg-[var(--color-primary)]/12 px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]'>
								Unread {unreadCount}
							</span>
						</div>
						<div className='mt-3 max-h-[320px] space-y-2 overflow-auto'>
							{inboxLoading ? (
								<div className='rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>Loading inbox...</div>
							) : inbox.length ? (
								inbox.map((item) => (
									<button
										key={item.conversation_id}
										type='button'
										onClick={() => openConversationFromInbox(item)}
										className={`w-full rounded-xl border p-3 text-left transition ${
											selectedConversation?.conversationId === item.conversation_id
												? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8'
												: 'border-[var(--color-border)] hover:bg-[var(--color-border)]/30'
										}`}
									>
										<div className='flex items-center justify-between gap-2'>
											<p className='truncate text-sm font-medium text-[var(--color-text-primary)]'>
												{item.other_username}
											</p>
											{Number(item.unread_count || 0) > 0 && (
												<span className='rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white'>
													{item.unread_count}
												</span>
											)}
										</div>
										<p className='mt-1 truncate text-xs text-[var(--color-text-muted)]'>
											{item.last_message_content || 'No messages yet'}
										</p>
									</button>
								))
							) : (
								<div className='rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>No conversations yet.</div>
							)}
						</div>
					</div>

					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Search</h2>
						<div className='mt-3 space-y-2'>
							{user?.role !== 'student' && (
								<select
									value={searchRole}
									onChange={(event) => setSearchRole(event.target.value)}
									className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								>
									<option value='student'>Students</option>
									<option value='teacher'>Teachers</option>
									<option value='all'>All</option>
								</select>
							)}
							<input
								value={searchText}
								onChange={(event) => setSearchText(event.target.value)}
								placeholder='Search by name'
								className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							/>
							<input
								value={subjectText}
								onChange={(event) => setSubjectText(event.target.value)}
								placeholder='Search by subject'
								className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							/>
							<button
								type='button'
								onClick={() => loadContacts()}
								disabled={contactsLoading}
								className='w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
							>
								{contactsLoading ? 'Searching...' : 'Search'}
							</button>
						</div>
						<div className='mt-3 max-h-[260px] space-y-2 overflow-auto'>
							{sortedContacts.map((contact) => (
								<button
									key={contact.id}
									type='button'
									onClick={() => openConversationWithContact(contact)}
									className='w-full rounded-xl border border-[var(--color-border)] p-3 text-left hover:bg-[var(--color-border)]/30'
								>
									<div className='flex items-center gap-2'>
										<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-xs font-semibold text-[var(--color-primary)]'>
											{avatarContent(contact)}
										</div>
										<div className='min-w-0'>
											<p className='truncate text-sm font-medium text-[var(--color-text-primary)]'>{contact.username}</p>
											<p className='truncate text-xs text-[var(--color-text-muted)]'>{summarizeContact(contact)}</p>
										</div>
									</div>
								</button>
							))}
							{!contactsLoading && !sortedContacts.length && (
								<div className='rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>No contacts found.</div>
							)}
						</div>
					</div>
				</div>

				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
					{selectedConversation ? (
						<>
							<div className='flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3'>
								<div className='min-w-0'>
									<p className='truncate text-lg font-semibold text-[var(--color-text-primary)]'>
										{selectedConversation.otherUser?.username}
									</p>
									<p className='text-xs text-[var(--color-text-muted)] capitalize'>
										{selectedConversation.otherUser?.role}
									</p>
								</div>
								{user?.role === 'student' && selectedConversation.otherUser?.role === 'teacher' && (
									<button
										type='button'
										onClick={openTeacherProfile}
										className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
									>
										View teacher profile
									</button>
								)}
							</div>

							<div className='mt-3 h-[50vh] overflow-auto rounded-xl border border-[var(--color-border)] p-3 sm:h-[460px]'>
								{messagesLoading ? (
									<div className='rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>Loading messages...</div>
								) : messages.length ? (
									<div className='space-y-3'>
										{messages.map((message) => {
											const mine = message.sender_id === user?.id;
											const canManage = canManageOwnMessage(message);
											return (
												<div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
													<div className={`max-w-[80%] rounded-xl border px-3 py-2 ${mine ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] bg-[var(--color-input-bg)]'}`}>
														<p className='text-[11px] font-medium text-[var(--color-text-muted)]'>
															{message.sender_username} • {new Date(message.created_at).toLocaleTimeString()}
															{message.edited_at ? ' • edited' : ''}
														</p>
														{message.reply_to_message_id && (
															<div className='mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-muted)]'>
																Reply to {message.reply_sender_username || 'user'}: {message.reply_is_deleted ? '[deleted]' : message.reply_content}
															</div>
														)}
														{editingMessageId === message.id ? (
															<div className='mt-2 space-y-2'>
																<textarea
																	rows={2}
																	value={editingText}
																	onChange={(event) => setEditingText(event.target.value)}
																	className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text-primary)]'
																/>
																<div className='flex gap-2'>
																	<button type='button' onClick={() => handleEditMessage(message.id)} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-border)]/40'>Save</button>
																	<button type='button' onClick={() => { setEditingMessageId(null); setEditingText(''); }} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-border)]/40'>Cancel</button>
																</div>
															</div>
														) : (
															<p className='mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]'>
																{message.content}
															</p>
														)}
														<div className='mt-2 flex flex-wrap gap-2'>
															<button type='button' onClick={() => setReplyTo(message)} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] hover:bg-[var(--color-border)]/40'>Reply</button>
															<button type='button' onClick={() => handleCopyMessage(message.content)} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] hover:bg-[var(--color-border)]/40'>Copy</button>
															{canManage && !message.is_deleted && (
																<>
																	<button type='button' onClick={() => { setEditingMessageId(message.id); setEditingText(message.content); }} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] hover:bg-[var(--color-border)]/40'>Edit</button>
																	<button type='button' onClick={() => handleDeleteMessage(message.id)} className='rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50'>Delete</button>
																</>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className='rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>No messages yet.</div>
								)}
							</div>

							<div className='mt-3 space-y-2'>
								{replyTo && (
									<div className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]'>
										Replying to {replyTo.sender_username}: {replyTo.content}
										<button type='button' onClick={() => setReplyTo(null)} className='ml-2 text-[var(--color-primary)]'>Cancel</button>
									</div>
								)}
								<div className='flex flex-col gap-2 sm:flex-row'>
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
										placeholder='Write your message'
										className='flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
									/>
									<button
										type='button'
										onClick={handleSendMessage}
										disabled={sending || !draft.trim()}
										className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
									>
										{sending ? 'Sending...' : 'Send'}
									</button>
								</div>
							</div>
						</>
					) : (
						<div className='flex h-[55vh] items-center justify-center rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] sm:h-[620px]'>
							Select a contact or inbox conversation to start messaging.
						</div>
					)}
				</div>
			</div>

			{profileModalOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
					<div className='w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5'>
						<div className='flex items-center justify-between'>
							<h3 className='text-lg font-semibold text-[var(--color-text-primary)]'>Teacher profile</h3>
							<button type='button' onClick={() => setProfileModalOpen(false)} className='rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-border)]/40'>Close</button>
						</div>
						{teacherProfileLoading ? (
							<div className='mt-3 rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]'>Loading profile...</div>
						) : (
							teacherProfile?.teacher && (
								<div className='mt-3 space-y-3'>
									<div className='flex items-center gap-3'>
										{teacherProfile.teacher.profile_pic ? (
											<img src={teacherProfile.teacher.profile_pic} alt={teacherProfile.teacher.username} className='h-12 w-12 rounded-full object-cover' />
										) : (
											<div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-semibold text-[var(--color-primary)]'>
												{avatarContent(teacherProfile.teacher)}
											</div>
										)}
										<div>
											<p className='text-sm font-semibold text-[var(--color-text-primary)]'>
												{teacherProfile.teacher.username}
											</p>
											<p className='text-xs text-[var(--color-text-muted)]'>{teacherProfile.teacher.email}</p>
										</div>
									</div>
									<div>
										<p className='text-sm font-medium text-[var(--color-text-secondary)]'>Classes</p>
										<div className='mt-2 max-h-56 space-y-2 overflow-auto'>
											{teacherProfile.classes?.length ? (
												teacherProfile.classes.map((classItem) => (
													<div key={classItem.id} className='rounded-lg border border-[var(--color-border)] p-2'>
														<p className='text-sm font-medium text-[var(--color-text-primary)]'>{classItem.class_name}</p>
														<p className='text-xs text-[var(--color-text-muted)]'>
															{classItem.subject || 'No subject'} • {classItem.grade_level || 'No grade level'}
														</p>
													</div>
												))
											) : (
												<div className='rounded-lg border border-[var(--color-border)] p-2 text-xs text-[var(--color-text-muted)]'>No classes found.</div>
											)}
										</div>
									</div>
								</div>
							)
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
