import { useCallback, useState } from 'react';
import { useAuth } from '../../../../../context/useAuth';
import { useCommunication } from './utils/useCommunication';
import { InboxPanel } from './InboxPanel';
import { DirectoryPanel } from './DirectoryPanel';
import { ConversationView } from './ConversationView';
import { TeacherProfileModal } from './TeacherProfileModal';
import { MobileTabBar } from './MobileTabBar';
import Toast from '../../../../Toast';

export default function CommunicationCenter() {
	const { user } = useAuth();
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
	const [mobileTab, setMobileTab] = useState('inbox');

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const comm = useCommunication({ user, openToast });

	const handleInboxSelect = useCallback(async (item) => {
		const opened = await comm.openConversationFromInbox(item);
		if (!opened) return;
		setMobileTab('chat');
	}, [comm]);

	const handleContactSelect = useCallback(async (contact) => {
		const opened = await comm.openConversationWithContact(contact);
		if (!opened) return;
		setMobileTab('chat');
	}, [comm]);

	const handleMobileBack = useCallback(() => {
		setMobileTab('inbox');
	}, []);

	return (
		<div className='min-h-full bg-[var(--color-bg)]'>
			<div className='mx-auto max-w-7xl px-0 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pb-20 lg:px-8 lg:pb-8 lg:pt-8'>

				<div className='hidden lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-3 lg:gap-5'>
					<div className='flex flex-col gap-5 overflow-hidden'>
						<div className='flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm' style={{ maxHeight: '45%' }}>
							<InboxPanel
								inbox={comm.inbox}
								inboxLoading={comm.inboxLoading}
								selectedConversation={comm.selectedConversation}
								onSelect={comm.openConversationFromInbox}
							/>
						</div>
						<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'>
							<DirectoryPanel
								contacts={comm.contacts}
								contactsLoading={comm.contactsLoading}
								searchText={comm.searchText}
								setSearchText={comm.setSearchText}
								subjectText={comm.subjectText}
								setSubjectText={comm.setSubjectText}
								searchRole={comm.searchRole}
								setSearchRole={comm.setSearchRole}
								userRole={user?.role}
								onSearch={comm.loadContacts}
								onSelect={comm.openConversationWithContact}
							/>
						</div>
					</div>

					<div className='lg:col-span-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'>
						<ConversationView
							selectedConversation={comm.selectedConversation}
							messages={comm.messages}
							messagesLoading={comm.messagesLoading}
							draft={comm.draft}
							setDraft={comm.setDraft}
							replyTo={comm.replyTo}
							setReplyTo={comm.setReplyTo}
							editingMessageId={comm.editingMessageId}
							setEditingMessageId={comm.setEditingMessageId}
							editingText={comm.editingText}
							setEditingText={comm.setEditingText}
							sending={comm.sending}
							user={user}
							messageViewportRef={comm.messageViewportRef}
							onScroll={comm.onMessagesScroll}
							onSend={comm.handleSendMessage}
							onEditSave={comm.handleEditMessage}
							onDelete={comm.handleDeleteMessage}
							onCopy={comm.handleCopyMessage}
							onViewProfile={comm.openTeacherProfile}
							showBackButton={false}
						/>
					</div>
				</div>

				<div className='lg:hidden min-h-[calc(100dvh-8rem)] border-b border-[var(--color-border)] bg-[var(--color-surface)]'>
					{mobileTab === 'inbox' && (
						<div className='h-[calc(100dvh-8rem)]'>
							<InboxPanel
								inbox={comm.inbox}
								inboxLoading={comm.inboxLoading}
								selectedConversation={comm.selectedConversation}
								onSelect={handleInboxSelect}
							/>
						</div>
					)}

					{mobileTab === 'directory' && (
						<div className='h-[calc(100dvh-8rem)]'>
							<DirectoryPanel
								contacts={comm.contacts}
								contactsLoading={comm.contactsLoading}
								searchText={comm.searchText}
								setSearchText={comm.setSearchText}
								subjectText={comm.subjectText}
								setSubjectText={comm.setSubjectText}
								searchRole={comm.searchRole}
								setSearchRole={comm.setSearchRole}
								userRole={user?.role}
								onSearch={comm.loadContacts}
								onSelect={handleContactSelect}
							/>
						</div>
					)}

					{mobileTab === 'chat' && (
						<div className='h-[calc(100dvh-8rem)]'>
							<ConversationView
								selectedConversation={comm.selectedConversation}
								messages={comm.messages}
								messagesLoading={comm.messagesLoading}
								draft={comm.draft}
								setDraft={comm.setDraft}
								replyTo={comm.replyTo}
								setReplyTo={comm.setReplyTo}
								editingMessageId={comm.editingMessageId}
								setEditingMessageId={comm.setEditingMessageId}
								editingText={comm.editingText}
								setEditingText={comm.setEditingText}
								sending={comm.sending}
								user={user}
								messageViewportRef={comm.messageViewportRef}
								onScroll={comm.onMessagesScroll}
								onSend={comm.handleSendMessage}
								onEditSave={comm.handleEditMessage}
								onDelete={comm.handleDeleteMessage}
								onCopy={comm.handleCopyMessage}
								onViewProfile={comm.openTeacherProfile}
								onBack={handleMobileBack}
								showBackButton
							/>
						</div>
					)}
				</div>
			</div>

			<MobileTabBar
				activeTab={mobileTab}
				onTabChange={setMobileTab}
				unreadCount={comm.unreadCount}
			/>

			<TeacherProfileModal
				isOpen={comm.profileModalOpen}
				onClose={() => comm.setProfileModalOpen(false)}
				profile={comm.teacherProfile}
				loading={comm.teacherProfileLoading}
			/>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
			/>
		</div>
	);
}