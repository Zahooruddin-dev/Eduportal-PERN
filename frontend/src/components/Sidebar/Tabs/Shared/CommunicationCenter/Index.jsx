import { useCallback, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useCommunication } from './hooks/useCommunication';
import { InboxPanel } from './components/InboxPanel';
import { DirectoryPanel } from './components/DirectoryPanel';
import { ConversationView } from './components/ConversationView';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { MobileTabBar } from './components/MobileTabBar';
import Toast from '../../../Toast';

export default function CommunicationCenter() {
	const { user } = useAuth();
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
	const [mobileTab, setMobileTab] = useState('inbox');

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const comm = useCommunication({ user, openToast });

	const handleInboxSelect = useCallback(async (item) => {
		await comm.openConversationFromInbox(item);
		setMobileTab('chat');
	}, [comm]);

	const handleContactSelect = useCallback(async (contact) => {
		await comm.openConversationWithContact(contact);
		setMobileTab('chat');
	}, [comm]);

	const handleMobileBack = useCallback(() => {
		setMobileTab('inbox');
	}, []);

	return (
		<div className='min-h-screen bg-[var(--color-bg)]'>
			<div className='mx-auto max-w-7xl px-0 pb-20 sm:px-4 sm:pb-20 lg:px-8 lg:pb-8 lg:pt-8'>

				<div className='hidden lg:grid lg:h-[calc(100vh-4rem)] lg:grid-cols-3 lg:gap-5'>
					<div className='flex flex-col gap-5 overflow-hidden'>
						<div className='flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm' style={{ maxHeight: '45%' }}>
							<InboxPanel
								inbox={comm.inbox}
								inboxLoading={comm.inboxLoading}
								selectedConversation={comm.selectedConversation}
								onSelect={comm.openConversationFromInbox}
							/>
						</div>
						<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'>
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

					<div className='lg:col-span-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'>
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

				<div className='lg:hidden'>
					<div className={`${mobileTab === 'inbox' ? 'block' : 'hidden'} min-h-[calc(100vh-8rem)]`}>
						<div className='h-full bg-[var(--color-surface)] border-b border-[var(--color-border)]'>
							<InboxPanel
								inbox={comm.inbox}
								inboxLoading={comm.inboxLoading}
								selectedConversation={comm.selectedConversation}
								onSelect={handleInboxSelect}
							/>
						</div>
					</div>

					<div className={`${mobileTab === 'directory' ? 'block' : 'hidden'} min-h-[calc(100vh-8rem)]`}>
						<div className='h-full bg-[var(--color-surface)] border-b border-[var(--color-border)]'>
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
					</div>

					<div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} h-[calc(100vh-8rem)] flex-col bg-[var(--color-surface)]`}>
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
				</div>
			</div>

			<MobileTabBar
				activeTab={mobileTab}
				onTabChange={setMobileTab}
				unreadCount={comm.unreadCount}
				hasConversation={Boolean(comm.selectedConversation)}
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