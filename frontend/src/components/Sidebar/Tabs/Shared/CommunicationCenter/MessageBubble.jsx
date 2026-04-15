import { Copy, Pencil, Reply, Trash2, X } from 'lucide-react';
import { formatTime }  from './utils/utilis';

export function MessageBubble({
	message,
	isMine,
	canManage,
	editingMessageId,
	editingText,
	setEditingText,
	onEdit,
	onCancelEdit,
	onSaveEdit,
	onReply,
	onCopy,
	onDelete,
}) {
	const isDeleted = Boolean(message.is_deleted);
	const isEditing = editingMessageId === message.id;

	return (
		<div className={`group flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
			<div className={`flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-[11px] font-bold ${isMine ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
				{String(isMine ? 'Me' : (message.sender_username || '?')).charAt(0).toUpperCase()}
			</div>

			<div className={`flex max-w-[75%] flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
				<div className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm ${
					isMine
						? 'rounded-br-sm bg-[var(--color-primary)] text-white'
						: 'rounded-bl-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
				}`}>
					{message.reply_to_message_id && (
						<div className={`mb-2 rounded-lg border px-2.5 py-1.5 text-xs ${isMine ? 'border-white/30 bg-white/15 text-white/80' : 'border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-muted)]'}`}>
							<span className='font-semibold'>{message.reply_sender_username || 'user'}: </span>
							{message.reply_is_deleted ? '[deleted]' : message.reply_content}
						</div>
					)}

					{isEditing ? (
						<div className='space-y-2'>
							<textarea
								rows={2}
								value={editingText}
								onChange={(e) => setEditingText(e.target.value)}
								className='w-full min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
							<div className='flex gap-2'>
								<button onClick={() => onSaveEdit(message.id)} className='inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white'>
									<Pencil size={11} /> Save
								</button>
								<button onClick={onCancelEdit} className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]'>
									<X size={11} /> Cancel
								</button>
							</div>
						</div>
					) : (
						<p className={`whitespace-pre-wrap text-sm leading-relaxed ${isDeleted ? 'italic opacity-60' : ''}`}>
							{message.content}
						</p>
					)}
				</div>

				<div className={`flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
					<span>{formatTime(message.created_at)}</span>
					{message.edited_at && <span className='rounded bg-[var(--color-border)] px-1.5 py-0.5'>edited</span>}
				</div>

				{!isEditing && (
					<div className={`flex flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 ${isMine ? 'justify-end' : 'justify-start'}`}>
						<button onClick={() => onReply(message)} className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-text-muted)] shadow-sm transition hover:bg-[var(--color-border)]/50'>
							<Reply size={11} /> Reply
						</button>
						<button onClick={() => onCopy(message.content)} disabled={!message.content} className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-text-muted)] shadow-sm transition hover:bg-[var(--color-border)]/50 disabled:opacity-40'>
							<Copy size={11} /> Copy
						</button>
						{canManage && !isDeleted && (
							<>
								<button onClick={() => onEdit(message)} className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-text-muted)] shadow-sm transition hover:bg-[var(--color-border)]/50'>
									<Pencil size={11} /> Edit
								</button>
								<button onClick={() => onDelete(message.id)} className='inline-flex items-center gap-1 rounded-md border border-red-200 bg-[var(--color-surface)] px-2 py-1 text-[10px] text-red-500 shadow-sm transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-500/10'>
									<Trash2 size={11} /> Delete
								</button>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}