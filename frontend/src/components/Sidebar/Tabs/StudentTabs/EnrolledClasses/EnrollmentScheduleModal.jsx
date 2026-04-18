import { useEffect } from 'react';
import { formatTimeRange } from '../../../../../utils/scheduleUtils';

export default function EnrollmentScheduleModal({
	isOpen,
	selectedClass,
	scheduleBlocks,
	nextScheduleBlock,
	onClose,
}) {
	useEffect(() => {
		if (!isOpen) return undefined;

		const handleEscape = (event) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen || !selectedClass) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'>
			<div
				className='overlay-fade absolute inset-0 bg-black/55 backdrop-blur-[2px]'
				onClick={onClose}
				aria-hidden='true'
			/>
			<section
				role='dialog'
				aria-modal='true'
				aria-labelledby='schedule-title'
				className='fade-scale-in relative z-10 mx-auto w-full overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:max-w-xl sm:rounded-2xl'
			>
				<div className='border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent px-6 py-5'>
					<div className='flex items-start justify-between gap-4'>
						<div className='min-w-0 flex-1'>
							<h2
								id='schedule-title'
								className='text-lg font-bold text-[var(--color-text-primary)] truncate'
							>
								{selectedClass.class_name}
							</h2>
							<p className='mt-1.5 text-sm font-medium text-[var(--color-primary)]'>
								Full Schedule
							</p>
						</div>
						<button
							type='button'
							onClick={onClose}
							aria-label='Close schedule'
							className='shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--color-text-muted)] transition-[background-color,color,border-color] duration-200 ease-out hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
						>
							<svg
								className='w-5 h-5'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M6 18L18 6M6 6l12 12'
								/>
							</svg>
						</button>
					</div>
				</div>

				<div className='max-h-[72vh] overflow-y-auto bg-[var(--color-bg)]/20 p-6'>
					{scheduleBlocks.length > 0 && (
						<div className='mb-4 flex flex-wrap gap-2'>
							<span className='rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]'>
								{scheduleBlocks.length} session
								{scheduleBlocks.length > 1 ? 's' : ''}
							</span>
							{nextScheduleBlock && (
								<span className='rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]'>
									Next: {nextScheduleBlock.day}{' '}
									{formatTimeRange(
										nextScheduleBlock.start_time,
										nextScheduleBlock.end_time,
									)}
								</span>
							)}
						</div>
					)}

					{scheduleBlocks.length === 0 ? (
						<div className='rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-10 text-center'>
							<svg
								className='mx-auto h-10 w-10 mb-3 text-[var(--color-text-muted)]/40'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M12 8v4l3 2m6-11a9 9 0 11-18 0 9 9 0 0118 0z'
								/>
							</svg>
							<p className='text-sm text-[var(--color-text-muted)]'>
								No schedule listed
							</p>
						</div>
					) : (
						<div className='space-y-2.5'>
							{scheduleBlocks.map((block, index) => (
								<div
									key={`${block.day}-${block.start_time}-${index}`}
									className='group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 ease-out hover:border-[var(--color-primary)]/40 hover:shadow-md'
								>
									<div className='absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-hover)] opacity-0 transition-opacity group-hover:opacity-100' />

									<div className='grid grid-cols-[minmax(6.75rem,8rem)_1fr_auto] items-center gap-3 pl-1'>
										<div className='min-w-0'>
											<p className='text-xs font-semibold text-[var(--color-primary)] uppercase tracking-widest'>
												{block.day}
											</p>
										</div>
										<p className='min-w-0 text-base font-semibold text-[var(--color-text-primary)]'>
											{formatTimeRange(block.start_time, block.end_time)}
										</p>
										<div className='flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/20 transition-colors'>
											<svg
												className='h-5 w-5'
												fill='currentColor'
												viewBox='0 0 24 24'
											>
												<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' />
											</svg>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{selectedClass.room_number && (
						<div className='mt-6 pt-6 border-t border-[var(--color-border)]'>
							<div className='relative overflow-hidden rounded-xl border border-[var(--color-primary)]/25 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 p-4'>
								<div className='absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-[var(--color-primary)]/5' />
								<div className='relative z-10'>
									<p className='text-xs font-semibold text-[var(--color-primary)] uppercase tracking-widest'>
										Location
									</p>
									<p className='mt-2 text-lg font-bold text-[var(--color-text-primary)]'>
										Room {selectedClass.room_number}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className='border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4'>
					<button
						type='button'
						onClick={onClose}
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-[border-color,background-color,color] duration-200 ease-out hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary-soft)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
					>
						Done
					</button>
				</div>
			</section>
		</div>
	);
}
