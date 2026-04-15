import { useEffect, useRef } from 'react';
import { Loader2, MessageSquare, SendHorizontal, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { avatarInitial, toLabel }  from './utils/utilis';

export function ConversationView({
	selectedConversation,
	messages,
	messagesLoading,
	draft,
	setDraft,
	replyTo,
	setReplyTo,
	editingMessageId,
	setEditingMessageId,
	editingText,
	setEditingText,
	sending,
	user,
	messageViewportRef,
	onScroll,
	onSend,
	onEditSave,
	onDelete,
	onCopy,
	onViewProfile,
	onBack,
	showBackButton,
}) {
	const composerRef = useRef(null);

	useEffect(() => {
		if (draft.trim()) return;
		const node = composerRef.current;
		if (!node) return;
		node.style.height = '42px';
	}, [draft]);

	const resizeComposer = (node) => {
		node.style.height = 'auto';
		node.style.height = Math.min(node.scrollHeight, 120) + 'px';
	};

	if (!selectedConversation) {
		return (
			<div className='flex h-full flex-col items-center justify-center gap-4 p-8 text-center'>
				<div className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]'>
					<MessageSquare size={28} strokeWidth={1.5} />
				</div>
				<div>
					<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>
						Select a conversation
					</h3>
					<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
						Pick from your inbox or find someone in the directory
					</p>
				</div>
			</div>
		);
	}

	const { otherUser } = selectedConversation;
	const canViewProfile = user?.role === 'student' && otherUser?.role === 'teacher';

	return (
		<div className='flex h-full flex-col'>
			<div className='flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4 py-3'>
				{showBackButton && (
					<button
						onClick={onBack}
						className='mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/50'
					>
						<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
							<path d='M15 18l-6-6 6-6' />
						</svg>
					</button>
				)}
				<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white'>
					{avatarInitial(otherUser)}
				</div>
				<div className='min-w-0 flex-1'>
					<p className='truncate text-sm font-semibold text-[var(--color-text-primary)]'>
						{otherUser?.username}
					</p>
					<p className='text-xs capitalize text-[var(--color-text-muted)]'>
						{toLabel(otherUser?.role)}
					</p>
				</div>
				{canViewProfile && (
					<button
						onClick={onViewProfile}
						className='shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40'
					>
						View profile
					</button>
				)}
			</div>

			<div
				ref={messageViewportRef}
				onScroll={onScroll}
				className='flex-1 overflow-y-auto px-4 py-4'
			>
				{messagesLoading ? (
					<div className='flex h-full items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]'>
						<Loader2 size={16} className='animate-spin' />
						Loading messages…
					</div>
				) : messages.length === 0 ? (
					<div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
						<div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-border)]'>
							<MessageSquare size={20} className='text-[var(--color-text-muted)]' />
						</div>
						<p className='text-sm text-[var(--color-text-muted)]'>
							No messages yet — say hello!
						</p>
					</div>
				) : (
					<div className='flex flex-col gap-4'>
						{messages.map((msg) => {
							const isMine = msg.sender_id === user?.id;
							const canManage = user?.role === 'teacher' && msg.sender_id === user.id;
							return (
								<MessageBubble
									key={msg.id}
									message={msg}
									isMine={isMine}
									canManage={canManage}
									editingMessageId={editingMessageId}
									editingText={editingText}
									setEditingText={setEditingText}
									onEdit={(m) => { setEditingMessageId(m.id); setEditingText(m.content); }}
									onCancelEdit={() => { setEditingMessageId(null); setEditingText(''); }}
									onSaveEdit={onEditSave}
									onReply={setReplyTo}
									onCopy={onCopy}
									onDelete={onDelete}
								/>
							);
						})}
					</div>
				)}
			</div>

			<div className='shrink-0 border-t border-[var(--color-border)] px-4 py-3'>
				{replyTo && (
					<div className='mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
						<p className='min-w-0 truncate text-xs text-[var(--color-text-muted)]'>
							<span className='font-semibold text-[var(--color-text-secondary)]'>
								{replyTo.sender_username || 'User'}:
							</span>{' '}
							{replyTo.content}
						</p>
						<button
							onClick={() => setReplyTo(null)}
							className='shrink-0 rounded p-0.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]'
						>
							<X size={14} />
						</button>
					</div>
				)}
				<div className='flex items-end gap-2'>
					<textarea
						ref={composerRef}
						rows={1}
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
							resizeComposer(e.target);
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								onSend();
							}
						}}
						placeholder='Message…'
						className='flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition sm:text-sm'
						style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
						onInput={(e) => resizeComposer(e.target)}
					/>
					<button
						onClick={onSend}
						disabled={sending || !draft.trim()}
						className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50'
					>
						{sending ? <Loader2 size={16} className='animate-spin' /> : <SendHorizontal size={16} />}
					</button>
				</div>
				<p className='mt-1.5 text-right text-[10px] text-[var(--color-text-muted)]'>
					Enter to send · Shift+Enter for new line
				</p>
			</div>
		</div>
	);
}
