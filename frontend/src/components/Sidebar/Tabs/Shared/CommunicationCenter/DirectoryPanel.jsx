import { Loader2, Search, Users } from 'lucide-react';
import { avatarInitial, summarizeContact } from '../utils';

export function DirectoryPanel({ contacts, contactsLoading, searchText, setSearchText, subjectText, setSubjectText, searchRole, setSearchRole, userRole, onSearch, onSelect }) {
	return (
		<div className='flex h-full flex-col'>
			<div className='shrink-0 px-4 pt-4 pb-3 border-b border-[var(--color-border)]'>
				<p className='text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
					People
				</p>
				<h2 className='mt-1 flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]'>
					<Users size={18} strokeWidth={2} />
					Directory
				</h2>
			</div>

			<div className='shrink-0 space-y-2 px-4 py-3 border-b border-[var(--color-border)]'>
				{userRole !== 'student' && (
					<select
						value={searchRole}
						onChange={(e) => setSearchRole(e.target.value)}
						className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition'
					>
						<option value='student'>Students</option>
						<option value='teacher'>Teachers</option>
						<option value='all'>All</option>
					</select>
				)}
				<div className='relative'>
					<Search size={13} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]' />
					<input
						type='text'
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && onSearch()}
						placeholder='Search by name'
						className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition'
					/>
				</div>
				<input
					type='text'
					value={subjectText}
					onChange={(e) => setSubjectText(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onSearch()}
					placeholder='Filter by subject'
					className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition'
				/>
				<button
					onClick={onSearch}
					disabled={contactsLoading}
					className='flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
				>
					{contactsLoading ? <Loader2 size={14} className='animate-spin' /> : <Search size={14} />}
					{contactsLoading ? 'Searching…' : 'Search'}
				</button>
			</div>

			<div className='flex-1 overflow-y-auto'>
				{contacts.length === 0 && !contactsLoading ? (
					<div className='flex flex-col items-center justify-center gap-2 py-12 px-6 text-center'>
						<p className='text-sm text-[var(--color-text-muted)]'>No contacts found.</p>
						<p className='text-xs text-[var(--color-text-muted)]'>Try a different name or subject.</p>
					</div>
				) : (
					<ul className='divide-y divide-[var(--color-border)]'>
						{contacts.map((contact) => (
							<li key={contact.id}>
								<button
									onClick={() => onSelect(contact)}
									className='w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-border)]/30'
								>
									<div className='flex items-center gap-3'>
										<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]'>
											{avatarInitial(contact)}
										</div>
										<div className='min-w-0'>
											<p className='truncate text-sm font-semibold text-[var(--color-text-primary)]'>
												{contact.username}
											</p>
											<p className='truncate text-xs text-[var(--color-text-muted)]'>
												{summarizeContact(contact)}
											</p>
										</div>
									</div>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}