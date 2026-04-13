import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getMyAnnouncements } from '../../../../../api/api';

const BellIcon = () => (
	<svg
		width='26'
		height='26'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
		<path d='M13.73 21a2 2 0 0 1-3.46 0' />
	</svg>
);

const RefreshIcon = () => (
	<svg
		width='14'
		height='14'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
		<path d='M21 3v5h-5' />
		<path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
		<path d='M8 16H3v5' />
	</svg>
);

const AlertIcon = () => (
	<svg
		width='16'
		height='16'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<circle cx='12' cy='12' r='10' />
		<line x1='12' x2='12' y1='8' y2='12' />
		<line x1='12' x2='12.01' y1='16' y2='16' />
	</svg>
);

const XIcon = () => (
	<svg
		width='18'
		height='18'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<path d='M18 6 6 18' />
		<path d='m6 6 12 12' />
	</svg>
);

const CalendarIcon = () => (
	<svg
		width='13'
		height='13'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<rect width='18' height='18' x='3' y='4' rx='2' ry='2' />
		<line x1='16' x2='16' y1='2' y2='6' />
		<line x1='8' x2='8' y1='2' y2='6' />
		<line x1='3' x2='21' y1='10' y2='10' />
	</svg>
);

const ArrowIcon = () => (
	<svg
		width='13'
		height='13'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
	>
		<path d='M5 12h14' />
		<path d='m12 5 7 7-7 7' />
	</svg>
);

function getInitials(name) {
	if (!name) return '?';
	return name
		.split(' ')
		.map((n) => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

function formatDate(dateStr) {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now - date;
	const diffDays = Math.floor(diffMs / 86400000);
	const timeStr = date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});
	if (diffDays === 0) return `Today at ${timeStr}`;
	if (diffDays === 1) return `Yesterday at ${timeStr}`;
	if (diffDays < 7) return `${diffDays} days ago`;
	return date.toLocaleDateString([], {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	});
}

function formatDateFull(dateStr) {
	const date = new Date(dateStr);
	return (
		date.toLocaleDateString([], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}) +
		' at ' +
		date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	);
}

function AnnouncementCard({ ann, onOpen }) {
	return (
		<button
			type='button'
			onClick={() => onOpen(ann)}
			aria-label={`Open announcement: ${ann.title}`}
			className='group text-left w-full flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[var(--color-primary)]/50 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
		>
			<div
				className='h-[3px] w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] opacity-60 group-hover:opacity-100 transition-opacity duration-200'
				aria-hidden='true'
			/>

			<div className='flex flex-col flex-1 p-4 sm:p-5 gap-3'>
				<div className='flex items-start gap-3'>
					<div
						className='flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-primary)] select-none'
						aria-hidden='true'
					>
						{getInitials(ann.teacher_name)}
					</div>
					<div className='flex-1 min-w-0 pt-0.5'>
						<p className='text-sm font-semibold text-[var(--color-text-primary)] truncate leading-none mb-1'>
							{ann.teacher_name}
						</p>
						<time
							dateTime={ann.created_at}
							className='text-xs text-[var(--color-text-muted)]'
						>
							{formatDate(ann.created_at)}
						</time>
					</div>
					<span className='flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'>
						{ann.class_name}
					</span>
				</div>

				<div className='border-t border-[var(--color-border)] pt-3'>
					<h2 className='text-sm sm:text-base font-bold text-[var(--color-text-primary)] leading-snug'>
						{ann.title}
					</h2>
				</div>

				<div className='flex-1'>
					<p className='text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3'>
						{ann.content}
					</p>
				</div>

				<div className='pt-2 border-t border-[var(--color-border)] flex items-center justify-between'>
					<span className='text-xs text-[var(--color-text-muted)]'>
						Click to view full announcement
					</span>
					<span className='text-[var(--color-primary)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150'>
						<ArrowIcon />
					</span>
				</div>
			</div>
		</button>
	);
}

function AnnouncementModal({ ann, onClose }) {
	const closeBtnRef = useRef(null);
	const overlayRef = useRef(null);

	useEffect(() => {
		closeBtnRef.current?.focus();
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, []);

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'Tab') {
				const modal = overlayRef.current?.querySelector('[role="dialog"]');
				if (!modal) return;
				const focusable = modal.querySelectorAll(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				);
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey) {
					if (document.activeElement === first) {
						e.preventDefault();
						last.focus();
					}
				} else {
					if (document.activeElement === last) {
						e.preventDefault();
						first.focus();
					}
				}
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);

	const handleOverlayClick = useCallback(
		(e) => {
			if (e.target === overlayRef.current) onClose();
		},
		[onClose],
	);

	return createPortal(
		<div
			ref={overlayRef}
			onClick={handleOverlayClick}
			className='overlay-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'
			style={{
				backgroundColor: 'rgba(0,0,0,0.55)',
				backdropFilter: 'blur(3px)',
			}}
			aria-hidden='false'
		>
			<div
				role='dialog'
				aria-modal='true'
				aria-labelledby='ann-modal-title'
				className='fade-scale-in relative w-full sm:max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[80vh] overflow-hidden'
			>
				<div
					className='h-[3px] w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex-shrink-0'
					aria-hidden='true'
				/>

				<div className='flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--color-border)] flex-shrink-0'>
					<div className='flex items-start gap-3 min-w-0'>
						<div
							className='flex-shrink-0 w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-primary)] select-none'
							aria-hidden='true'
						>
							{getInitials(ann.teacher_name)}
						</div>
						<div className='min-w-0'>
							<p className='text-sm font-bold text-[var(--color-text-primary)] truncate'>
								{ann.teacher_name}
							</p>
							<span className='inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'>
								{ann.class_name}
							</span>
						</div>
					</div>
					<button
						ref={closeBtnRef}
						onClick={onClose}
						aria-label='Close announcement'
						className='flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
					>
						<XIcon />
					</button>
				</div>

				<div className='flex-1 overflow-y-auto px-5 py-5 space-y-4'>
					<h2
						id='ann-modal-title'
						className='text-lg sm:text-xl font-bold text-[var(--color-text-primary)] leading-snug'
					>
						{ann.title}
					</h2>

					<div className='flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]'>
						<CalendarIcon />
						<time dateTime={ann.created_at}>
							{formatDateFull(ann.created_at)}
						</time>
					</div>

					<div className='h-px bg-[var(--color-border)]' aria-hidden='true' />

					<div className='text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap'>
						{ann.content}
					</div>
				</div>

				<div className='flex-shrink-0 px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]/60'>
					<p className='text-xs text-[var(--color-text-muted)]'>
						Posted in{' '}
						<span className='font-semibold text-[var(--color-text-secondary)]'>
							{ann.class_name}
						</span>
					</p>
					<button
						onClick={onClose}
						className='px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
					>
						Close
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

function SkeletonCard() {
	return (
		<div
			className='flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-pulse'
			aria-hidden='true'
		>
			<div className='h-[3px] w-full bg-[var(--color-border)]' />
			<div className='p-4 sm:p-5 flex flex-col gap-3'>
				<div className='flex items-start gap-3'>
					<div className='flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-border)]' />
					<div className='flex-1 pt-0.5 space-y-1.5'>
						<div className='h-3.5 bg-[var(--color-border)] rounded w-1/3' />
						<div className='h-3 bg-[var(--color-border)] rounded w-1/4' />
					</div>
					<div className='h-6 w-20 bg-[var(--color-border)] rounded-full' />
				</div>
				<div className='border-t border-[var(--color-border)] pt-3'>
					<div className='h-4 bg-[var(--color-border)] rounded w-3/4' />
				</div>
				<div className='space-y-2'>
					<div className='h-3 bg-[var(--color-border)] rounded w-full' />
					<div className='h-3 bg-[var(--color-border)] rounded w-5/6' />
					<div className='h-3 bg-[var(--color-border)] rounded w-2/3' />
				</div>
			</div>
		</div>
	);
}

export default function StudentAnnouncements() {
	const [announcements, setAnnouncements] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [activeClass, setActiveClass] = useState('all');
	const [refreshing, setRefreshing] = useState(false);
	const [selectedAnn, setSelectedAnn] = useState(null);
	const lastFocusedRef = useRef(null);

	const openModal = useCallback((ann) => {
		lastFocusedRef.current = document.activeElement;
		setSelectedAnn(ann);
	}, []);

	const closeModal = useCallback(() => {
		setSelectedAnn(null);
		lastFocusedRef.current?.focus();
	}, []);

	const fetchAnnouncements = async (isRefresh = false) => {
		if (isRefresh) setRefreshing(true);
		else setLoading(true);
		setError('');
		try {
			const res = await getMyAnnouncements();
			setAnnouncements(res.data);
			setActiveClass('all');
		} catch (err) {
			setError(
				err.response?.data?.error ||
					'Failed to load announcements. Please try again.',
			);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchAnnouncements();
	}, []);

	const classNames = [
		'all',
		...new Set(announcements.map((a) => a.class_name).filter(Boolean)),
	];
	const filtered =
		activeClass === 'all'
			? announcements
			: announcements.filter((a) => a.class_name === activeClass);

	const showClassFilter =
		!loading && announcements.length > 0 && classNames.length > 2;

	return (
		<div className='min-h-full bg-[var(--color-bg)]'>
			<div className='max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
				<header className='mb-6 sm:mb-8'>
					<div className='flex items-start justify-between gap-4'>
						<div>
							<h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]'>
								Announcements
							</h1>
							<p
								className='mt-1 text-sm text-[var(--color-text-muted)]'
								aria-live='polite'
								aria-atomic='true'
							>
								{loading
									? 'Loading your announcements…'
									: announcements.length === 0
										? 'No announcements from your classes yet'
										: `${filtered.length} announcement${filtered.length !== 1 ? 's' : ''}${activeClass !== 'all' ? ` in ${activeClass}` : ' across all classes'}`}
							</p>
						</div>
						<button
							onClick={() => fetchAnnouncements(true)}
							disabled={loading || refreshing}
							aria-label='Refresh announcements'
							className='flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
						>
							<span
								style={{
									display: 'inline-block',
									animation: refreshing ? 'spin 0.7s linear infinite' : 'none',
								}}
							>
								<RefreshIcon />
							</span>
							<span className='hidden sm:inline'>Refresh</span>
						</button>
					</div>
				</header>

				{error && (
					<div
						role='alert'
						className='mb-6 flex items-start gap-3 p-4 rounded-xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/25 text-[var(--color-danger)]'
					>
						<span className='flex-shrink-0 mt-0.5'>
							<AlertIcon />
						</span>
						<div>
							<p className='text-sm font-semibold'>Failed to load</p>
							<p className='text-sm mt-0.5 opacity-80'>{error}</p>
						</div>
						<button
							onClick={() => fetchAnnouncements(true)}
							className='ml-auto flex-shrink-0 text-xs font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)] rounded-sm'
						>
							Try again
						</button>
					</div>
				)}

				{showClassFilter && (
					<nav aria-label='Filter announcements by class' className='mb-6'>
						<div
							role='group'
							className='flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none'
							style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
						>
							{classNames.map((cls) => (
								<button
									key={cls}
									onClick={() => setActiveClass(cls)}
									aria-pressed={activeClass === cls}
									className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
										activeClass === cls
											? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm'
											: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary)]'
									}`}
								>
									{cls === 'all' ? 'All Classes' : cls}
									{cls !== 'all' && (
										<span
											className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full ${
												activeClass === cls
													? 'bg-white/25 text-white'
													: 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
											}`}
											aria-label={`${announcements.filter((a) => a.class_name === cls).length} announcements`}
										>
											{announcements.filter((a) => a.class_name === cls).length}
										</span>
									)}
								</button>
							))}
						</div>
					</nav>
				)}

				{loading ? (
					<div
						aria-busy='true'
						aria-label='Loading announcements'
						className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'
					>
						{[1, 2, 3, 4, 5, 6].map((n) => (
							<SkeletonCard key={n} />
						))}
					</div>
				) : announcements.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl'>
						<div
							className='w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] mb-4'
							aria-hidden='true'
						>
							<BellIcon />
						</div>
						<h2 className='text-base font-bold text-[var(--color-text-primary)]'>
							No announcements yet
						</h2>
						<p className='mt-1.5 text-sm text-[var(--color-text-muted)] max-w-xs'>
							When your teachers post announcements for your enrolled classes,
							they'll appear here.
						</p>
					</div>
				) : filtered.length === 0 ? (
					<div className='py-12 text-center text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl'>
						No announcements found for{' '}
						<strong className='text-[var(--color-text-primary)]'>
							{activeClass}
						</strong>
						.
					</div>
				) : (
					<section aria-label='Announcement cards'>
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'>
							{filtered.map((ann) => (
								<AnnouncementCard key={ann.id} ann={ann} onOpen={openModal} />
							))}
						</div>
					</section>
				)}
			</div>

			{selectedAnn && (
				<AnnouncementModal ann={selectedAnn} onClose={closeModal} />
			)}

			<style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
		</div>
	);
}
