import { useMemo, useState } from 'react';
import { Clock3, Inbox, Loader2 } from 'lucide-react';
import { formatDateTime, formatMessagePreview }  from './utils/utilis';

export function InboxPanel({ inbox, inboxLoading, selectedConversation, onSelect }) {
	const [query, setQuery] = useState('');
	const [unreadOnly, setUnreadOnly] = useState(false);

	const filteredInbox = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return inbox.filter((item) => {
			if (unreadOnly && Number(item.unread_count || 0) <= 0) return false;
			if (!normalized) return true;
			const username = String(item.other_username || '').toLowerCase();
			const preview = String(item.last_message_content || '').toLowerCase();
			return username.includes(normalized) || preview.includes(normalized);
		});
	}, [inbox, query, unreadOnly]);

	return (
		<div className='flex h-full flex-col'>
			<div className='shrink-0 px-4 pt-4 pb-3 border-b border-[var(--color-border)]'>
				<p className='text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
					Messages
				</p>
				<div className='mt-1 flex items-center justify-between'>
					<h2 className='flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]'>
						<Inbox size={18} strokeWidth={2} />
						Inbox
					</h2>
				</div>
				<div className='mt-3 flex items-center gap-2'>
					<input
						type='text'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder='Search conversation'
						className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition'
					/>
					<button
						onClick={() => setUnreadOnly((prev) => !prev)}
						className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
							unreadOnly
								? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
								: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30'
						}`}
					>
						Unread
					</button>
				</div>
			</div>

			<div className='flex-1 overflow-y-auto'>
				{inboxLoading ? (
					<div className='flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-text-muted)]'>
						<Loader2 size={16} className='animate-spin' />
						Loading...
					</div>
				) : inbox.length === 0 ? (
					<div className='flex flex-col items-center justify-center gap-2 py-16 px-6 text-center'>
						<div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-border)]'>
							<Inbox size={20} className='text-[var(--color-text-muted)]' />
						</div>
						<p className='text-sm font-medium text-[var(--color-text-secondary)]'>No conversations yet</p>
						<p className='text-xs text-[var(--color-text-muted)]'>Search your directory to start one</p>
					</div>
				) : filteredInbox.length === 0 ? (
					<div className='flex flex-col items-center justify-center gap-2 py-16 px-6 text-center'>
						<div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-border)]'>
							<Inbox size={20} className='text-[var(--color-text-muted)]' />
						</div>
						<p className='text-sm font-medium text-[var(--color-text-secondary)]'>No matching conversations</p>
						<p className='text-xs text-[var(--color-text-muted)]'>Adjust your search or unread filter</p>
					</div>
				) : (
					<ul className='divide-y divide-[var(--color-border)]'>
						{filteredInbox.map((item) => {
							const isActive = selectedConversation?.conversationId === item.conversation_id;
							const hasUnread = Number(item.unread_count || 0) > 0;
							return (
								<li key={item.conversation_id}>
									<button
										onClick={() => onSelect(item)}
										className={`w-full px-4 py-3 text-left transition-colors ${
											isActive
												? 'bg-[var(--color-primary)]/10'
												: 'hover:bg-[var(--color-border)]/30'
										}`}
									>
										<div className='flex items-start gap-3'>
											<div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
												isActive
													? 'bg-[var(--color-primary)] text-white'
													: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
											}`}>
												{String(item.other_username || '?').charAt(0).toUpperCase()}
											</div>
											<div className='min-w-0 flex-1'>
												<div className='flex items-center justify-between gap-2'>
													<p className={`truncate text-sm ${hasUnread ? 'font-bold text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-primary)]'}`}>
														{item.other_username}
													</p>
													<div className='flex shrink-0 items-center gap-1.5'>
														{hasUnread && (
															<span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-bold text-white'>
																{item.unread_count}
															</span>
														)}
													</div>
												</div>
												<p className={`mt-0.5 truncate text-xs ${hasUnread ? 'font-medium text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}`}>
													{formatMessagePreview(item.last_message_content)}
												</p>
												<div className='mt-1 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]'>
													<Clock3 size={10} />
													{formatDateTime(item.last_message_at || item.updated_at || item.created_at)}
												</div>
											</div>
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}