import { Inbox, MessageSquare, Users } from 'lucide-react';

const tabs = [
	{ id: 'inbox', label: 'Inbox', Icon: Inbox },
	{ id: 'directory', label: 'People', Icon: Users },
	{ id: 'chat', label: 'Chat', Icon: MessageSquare },
];

export function MobileTabBar({ activeTab, onTabChange, unreadCount, hasConversation }) {
	return (
		<nav className='fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-safe lg:hidden'>
			<div className='flex'>
				{tabs.map(({ id, label, Icon }) => {
					const isActive = activeTab === id;
					const showBadge = id === 'inbox' && unreadCount > 0;
					const isDisabled = id === 'chat' && !hasConversation;

					return (
						<button
							key={id}
							onClick={() => !isDisabled && onTabChange(id)}
							className={`relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
								isDisabled
									? 'cursor-default opacity-40'
									: isActive
										? 'text-[var(--color-primary)]'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
							}`}
						>
							<div className='relative'>
								<Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
								{showBadge && (
									<span className='absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-white'>
										{unreadCount > 99 ? '99+' : unreadCount}
									</span>
								)}
							</div>
							<span className={`text-[10px] font-medium ${isActive ? 'text-[var(--color-primary)]' : ''}`}>
								{label}
							</span>
							{isActive && (
								<span className='absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--color-primary)]' />
							)}
						</button>
					);
				})}
			</div>
		</nav>
	);
}