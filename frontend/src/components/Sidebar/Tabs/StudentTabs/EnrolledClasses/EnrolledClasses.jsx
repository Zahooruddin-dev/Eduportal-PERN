import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
	getStudentEnrolledShedule,
	getStudentBannedClasses,
	getClasses,
	postEnrollement,
	unenrollStudent,
	getClassAnnouncements,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';
import {
	formatTimeRange,
	getScheduleBlocksFromClass,
} from '../../../../../utils/scheduleUtils';

// Helper function to get avatar initial
function getAvatarInitial(username) {
	return String(username || '?').charAt(0).toUpperCase();
}

export default function EnrolledClasses() {
	const { user } = useAuth();
	const [enrolledClasses, setEnrolledClasses] = useState([]);
	const [availableClasses, setAvailableClasses] = useState([]);
	const [loadingEnrolled, setLoadingEnrolled] = useState(true);
	const [loadingAvailable, setLoadingAvailable] = useState(true);
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'success',
		message: '',
	});
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [unenrollTarget, setUnenrollTarget] = useState(null);
	const [enrollConfirmOpen, setEnrollConfirmOpen] = useState(false);
	const [enrollTarget, setEnrollTarget] = useState(null);
	const [selectedClass, setSelectedClass] = useState(null);
	const [announcements, setAnnouncements] = useState([]);
	const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
	const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
	const [enrollingId, setEnrollingId] = useState(null);
	const [unenrollingId, setUnenrollingId] = useState(null);
	const [bannedClassIds, setBannedClassIds] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');

	const fetchEnrolled = useCallback(async () => {
		if (!user?.id) return;
		setLoadingEnrolled(true);
		try {
			const res = await getStudentEnrolledShedule(user.id);
			setEnrolledClasses(res.data);
		} catch {
			setToast({
				isOpen: true,
				type: 'error',
				message: 'Failed to load enrolled classes',
			});
		} finally {
			setLoadingEnrolled(false);
		}
	}, [user?.id]);

	const fetchAvailable = useCallback(async () => {
		setLoadingAvailable(true);
		try {
			const res = await getClasses();
			const enrolledIds = enrolledClasses.map((c) => c.class_id ?? c.id);
			const filtered = res.data.filter(
				(cls) =>
					!enrolledIds.includes(cls.id) && !bannedClassIds.includes(cls.id),
			);
			setAvailableClasses(filtered);
		} catch {
			setToast({
				isOpen: true,
				type: 'error',
				message: 'Failed to load available classes',
			});
		} finally {
			setLoadingAvailable(false);
		}
	}, [enrolledClasses, bannedClassIds]);

	const fetchBanned = useCallback(async () => {
		if (!user?.id) return;
		try {
			const res = await getStudentBannedClasses(user.id);
			setBannedClassIds(res.data?.bannedClassIds || []);
		} catch {
			setBannedClassIds([]);
		}
	}, [user?.id]);

	// Filter enrolled classes based on search query
	const filteredEnrolledClasses = enrolledClasses.filter((cls) => {
		const query = searchQuery.toLowerCase();
		const className = cls.class_name?.toLowerCase() || '';
		const teacherName = cls.teacher_name?.toLowerCase() || '';
		return className.includes(query) || teacherName.includes(query);
	});

	// Filter available classes based on search query
	const filteredAvailableClasses = availableClasses.filter((cls) => {
		const query = searchQuery.toLowerCase();
		const className = cls.class_name?.toLowerCase() || '';
		const teacherName = cls.teacher_name?.toLowerCase() || '';
		return className.includes(query) || teacherName.includes(query);
	});

	useEffect(() => {
		if (user) {
			fetchEnrolled();
			fetchBanned();
		}
	}, [user, fetchEnrolled, fetchBanned]);

	useEffect(() => {
		if (!loadingEnrolled) fetchAvailable();
	}, [loadingEnrolled, fetchAvailable]);

	const requestEnroll = (classId) => {
		setEnrollTarget(classId);
		setEnrollConfirmOpen(true);
	};

	const performEnroll = async () => {
		if (!enrollTarget) return;
		setEnrollingId(enrollTarget);
		try {
			await postEnrollement({ student_id: user.id, class_id: enrollTarget });
			setToast({
				isOpen: true,
				type: 'success',
				message: 'Successfully enrolled!',
			});
			setEnrollTarget(null);
			setEnrollConfirmOpen(false);
			fetchEnrolled();
		} catch (err) {
			const msg = err.response?.data?.message || 'Enrollment failed';
			setToast({ isOpen: true, type: 'error', message: msg });
			setEnrollConfirmOpen(false);
			setEnrollTarget(null);
		} finally {
			setEnrollingId(null);
		}
	};

	const requestUnenroll = (classId) => {
		setUnenrollTarget(classId);
		setConfirmOpen(true);
	};

	const performUnenroll = async () => {
		if (!unenrollTarget) return;
		setUnenrollingId(unenrollTarget);
		try {
			await unenrollStudent(user.id, unenrollTarget);
			setToast({
				isOpen: true,
				type: 'success',
				message: 'Successfully unenrolled',
			});
			setUnenrollTarget(null);
			fetchEnrolled();
		} catch (err) {
			const msg = err.response?.data?.error || 'Unenrollment failed';
			setToast({ isOpen: true, type: 'error', message: msg });
		} finally {
			setUnenrollingId(null);
		}
	};

	const handleShowAnnouncements = async (cls) => {
		const id = cls.class_id ?? cls.id;
		setSelectedClass(cls);
		setShowAnnouncementsModal(true);
		setLoadingAnnouncements(true);
		try {
			const res = await getClassAnnouncements(id);
			setAnnouncements(res.data);
		} catch {
			setToast({
				isOpen: true,
				type: 'error',
				message: 'Failed to load announcements',
			});
		} finally {
			setLoadingAnnouncements(false);
		}
	};

	const closeAnnouncementsModal = () => {
		setShowAnnouncementsModal(false);
		setSelectedClass(null);
		setAnnouncements([]);
		setLoadingAnnouncements(false);
	};

	const cardGridClasses =
		'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5';

	const SectionHeader = ({ title, subtitle, count, tone = 'primary' }) => {
		const dotClass =
			tone === 'success'
				? 'bg-[var(--color-success)] ring-[var(--color-success)]/15'
				: 'bg-[var(--color-primary)] ring-[var(--color-primary)]/15';

		return (
			<div className='mb-4 flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3 sm:items-center'>
				<div className='min-w-0'>
					<h2 className='flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]'>
						<span
							className={`inline-block h-2.5 w-2.5 rounded-full ring-4 ${dotClass}`}
							aria-hidden='true'
						/>
						{title}
					</h2>
					<p className='mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]'>
						{subtitle}
					</p>
				</div>
				<span className='inline-flex min-w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-text-secondary)]'>
					{count}
				</span>
			</div>
		);
	};

	const CardSkeleton = () => (
		<div className='animate-pulse overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm'>
			<div className='h-[3px] w-full bg-[var(--color-primary)]/30' />
			<div className='p-5'>
				<div className='h-5 bg-[var(--color-border)] rounded w-1/2 mb-3' />
				<div className='h-4 bg-[var(--color-border)] rounded w-3/4 mb-2' />
				<div className='h-4 bg-[var(--color-border)] rounded w-2/3 mb-4' />
				<div className='h-9 bg-[var(--color-border)] rounded-xl mt-5' />
			</div>
		</div>
	);

	const ClassCard = ({ cls, enrolled = false }) => {
		const id = cls.class_id ?? cls.id;
		const isLoadingEnroll = enrollingId === id;
		const isLoadingUnenroll = unenrollingId === id;
		const scheduleBlocks = getScheduleBlocksFromClass(cls);

		return (
			<article className='group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md'>
				<div className='h-[3px] w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] opacity-45 transition-opacity duration-200 group-hover:opacity-100' />
				<div className='flex h-full flex-col p-5'>
					<div className='flex items-start justify-between gap-2'>
						<h3 className='truncate text-base sm:text-lg font-semibold text-[var(--color-text-primary)]'>
							{cls.class_name}
						</h3>
						{enrolled && (
							<span className='shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'>
								Enrolled
							</span>
						)}
					</div>

					{cls.teacher_name && (
					<div className='mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)]/50 p-2.5'>
						<div className='flex-shrink-0'>
							{cls.teacher_profile_pic ? (
								<img
									src={cls.teacher_profile_pic}
									alt={cls.teacher_name}
									className='h-8 w-8 rounded-full object-cover ring-1 ring-[var(--color-border)]'
								/>
							) : (
								<div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)]/40 to-[var(--color-primary)] text-xs font-bold text-white ring-1 ring-[var(--color-primary)]/30'>
									{getAvatarInitial(cls.teacher_name)}
								</div>
							)}
						</div>
						<div className='min-w-0 flex-1'>
							<p className='text-xs font-semibold text-[var(--color-text-muted)] leading-none'>
								Teacher
							</p>
							<p className='truncate text-sm font-medium text-[var(--color-text-primary)]'>
								{cls.teacher_name}
							</p>
						</div>
					</div>
				)}

				<div className='mt-3 rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-bg)]/40 p-3 space-y-1.5 text-sm text-[var(--color-text-secondary)]'>
					{scheduleBlocks.length > 0 ? (
						<>
							{scheduleBlocks.slice(0, 2).map((block, index) => (
								<p
									key={`${block.day}-${block.start_time}-${index}`}
									className='flex items-center gap-1.5'
								>
									<span className='w-14 text-xs font-semibold text-[var(--color-text-muted)]'>
										{block.day}
									</span>
									<span>
										{formatTimeRange(block.start_time, block.end_time)}
									</span>
								</p>
							))}
							{scheduleBlocks.length > 2 && (
								<p className='pl-[3.8rem] text-xs text-[var(--color-text-muted)]'>
									+ {scheduleBlocks.length - 2} more sessions
								</p>
							)}
						</>
					) : (
						<p className='italic text-[var(--color-text-muted)]'>
							No schedule listed
						</p>
					)}
					{cls.room_number && (
						<p className='flex items-center gap-1.5'>
							<span className='w-14 text-xs font-semibold text-[var(--color-text-muted)]'>
								Room
							</span>
							<span>{cls.room_number}</span>
						</p>
					)}
				</div>

				{!enrolled && cls.description && (
					<p className='mt-3 text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2'>
						{cls.description}
					</p>
				)}

				{cls.meeting_link && (
					<a
						href={cls.meeting_link}
						target='_blank'
						rel='noreferrer'
						className='mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-[color,border-color,background-color] duration-200 ease-out hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary-soft)]/60 hover:text-[var(--color-primary-hover)]'
					>
						<svg
							className='h-4 w-4'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
							/>
						</svg>
						Join meeting
					</a>
				)}


					{enrolled && cls.enrollment_date && (
						<p className='mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]'>
							Enrolled {new Date(cls.enrollment_date).toLocaleDateString()}
						</p>
					)}

					<div className='mt-auto flex gap-2 pt-4'>
						{enrolled ? (
							<>
								<button
									type='button'
									onClick={() => handleShowAnnouncements(cls)}
									className='flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--color-primary)] transition-[background-color,border-color,color,box-shadow] duration-200 ease-out hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary-soft)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
								>
									Announcements
								</button>
								<button
									type='button'
									onClick={() => requestUnenroll(id)}
									disabled={isLoadingUnenroll}
									className='flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--color-danger)] transition-[background-color,border-color,color,box-shadow] duration-200 ease-out hover:border-[var(--color-danger)]/35 hover:bg-[var(--color-danger-soft)]/70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
								>
									{isLoadingUnenroll ? (
										<SpinnerIcon className='mx-auto h-4 w-4 animate-spin' />
									) : (
										'Unenroll'
									)}
								</button>
							</>
						) : (
							<button
								type='button'
								onClick={() => requestEnroll(id)}
								disabled={isLoadingEnroll}
								className='w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-[var(--color-primary-hover)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
							>
								{isLoadingEnroll ? (
									<SpinnerIcon className='mx-auto h-4 w-4 animate-spin' />
								) : (
									'Enroll now'
								)}
							</button>
						)}
					</div>
				</div>
			</article>
		);
	};

	if (loadingEnrolled) {
		return (
			<div className='space-y-5 p-4 sm:p-6'>
				<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6'>
					<div className='mb-4 h-5 w-52 animate-pulse rounded bg-[var(--color-border)]' />
					<div className={cardGridClasses}>
						{[1, 2, 3, 4].map((i) => (
							<CardSkeleton key={`enrolled-${i}`} />
						))}
					</div>
				</section>
				<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6'>
					<div className='mb-4 h-5 w-48 animate-pulse rounded bg-[var(--color-border)]' />
					<div className={cardGridClasses}>
					{[1, 2, 3].map((i) => (
							<CardSkeleton key={`available-${i}`} />
					))}
				</div>
				</section>
			</div>
		);
	}

	return (
		<div className='space-y-5 p-4 sm:p-6'>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
			/>

			<div className='sticky top-0 z-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-sm'>
				<div className='relative'>
					<svg
						className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth='2'
							d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
						/>
					</svg>
					<input
						type='text'
						placeholder='Search classes by name or teacher...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
					/>
					{searchQuery && (
						<button
							type='button'
							onClick={() => setSearchQuery('')}
							className='absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors'
							aria-label='Clear search'
						>
							<svg
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
					)}
				</div>
			</div>

			<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6'>
				<SectionHeader
					title='Enrolled Classes'
					subtitle='Active enrollments with quick access to announcements and class links.'
					count={filteredEnrolledClasses.length}
				/>
				{filteredEnrolledClasses.length === 0 ? (
					<div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-14 text-center'>
						<div
							className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
							aria-hidden='true'
						>
							<svg
								className='h-6 w-6'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M12 6.253v13m0-13C10.832 5.483 9.246 5 7.5 5S4.168 5.483 3 6.253v13C4.168 18.483 5.754 18 7.5 18s3.332.483 4.5 1.253m0-13C13.168 5.483 14.754 5 16.5 5s3.332.483 4.5 1.253v13C19.832 18.483 18.246 18 16.5 18s-3.332.483-4.5 1.253'
								/>
							</svg>
						</div>
						<p className='text-sm text-[var(--color-text-muted)]'>
						{searchQuery ? 'No enrolled classes match your search.' : 'You are not enrolled in any classes yet.'}
						</p>
					</div>
				) : (
					<div className={cardGridClasses}>
						{filteredEnrolledClasses.map((cls) => (
							<ClassCard key={cls.class_id ?? cls.id} cls={cls} enrolled />
						))}
					</div>
				)}
			</section>

			<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6'>
				<SectionHeader
					title='Available Classes'
					subtitle='Open classes ready for enrollment based on your current schedule.'
					count={filteredAvailableClasses.length}
					tone='success'
				/>
				{loadingAvailable ? (
					<div className={cardGridClasses}>
						{[1, 2, 3].map((i) => (
							<CardSkeleton key={i} />
						))}
					</div>
				) : filteredAvailableClasses.length === 0 ? (
					<div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-14 text-center'>
						<div
							className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
							aria-hidden='true'
						>
							<svg
								className='h-6 w-6'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M12 4v16m8-8H4'
								/>
							</svg>
						</div>
						<p className='text-sm text-[var(--color-text-muted)]'>
							{searchQuery ? 'No available classes match your search.' : 'No classes available to enroll.'}
						</p>
					</div>
				) : (
					<div className={cardGridClasses}>
						{filteredAvailableClasses.map((cls) => (
							<ClassCard key={cls.id} cls={cls} enrolled={false} />
						))}
					</div>
				)}
			</section>

			{showAnnouncementsModal && selectedClass && (
				<div className='fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'>
					<div
						className='overlay-fade absolute inset-0 bg-black/55 backdrop-blur-[2px]'
						onClick={closeAnnouncementsModal}
						aria-hidden='true'
					/>
					<section
						role='dialog'
						aria-modal='true'
						aria-labelledby='announcements-title'
						className='fade-scale-in relative z-10 mx-auto w-full overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:max-w-3xl sm:rounded-2xl'
					>
						<div className='px-4 py-4 sm:px-6 sm:py-5 border-b border-[var(--color-border)]'>
							<div className='flex items-start sm:items-center justify-between gap-4'>
								<div className='min-w-0'>
									<h2
										id='announcements-title'
										className='text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] truncate'
									>
										{selectedClass.class_name}
									</h2>
									<p className='mt-0.5 text-sm text-[var(--color-text-muted)]'>
										Class announcements
										{!loadingAnnouncements && announcements.length > 0
											? ` (${announcements.length})`
											: ''}
									</p>
								</div>
								<button
									type='button'
									onClick={closeAnnouncementsModal}
									aria-label='Close announcements'
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
						<div className='max-h-[78vh] overflow-y-auto bg-[var(--color-bg)]/30 p-4 sm:p-6'>
							{loadingAnnouncements ? (
								<div className='space-y-3'>
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className='h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
										/>
									))}
								</div>
							) : announcements.length === 0 ? (
								<div className='rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center'>
									<p className='text-sm text-[var(--color-text-muted)]'>
										No announcements yet.
									</p>
								</div>
							) : (
								<ul className='space-y-4'>
									{announcements.map((ann) => (
										<li
											key={ann.id}
											className='group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-[var(--color-primary)]/30 hover:shadow-sm'
										>
											<div className='flex flex-col sm:flex-row sm:items-start justify-between gap-2'>
												<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>
													{ann.title}
												</h3>
												<span className='whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]'>
													{new Date(ann.created_at).toLocaleDateString()}
													{ann.expires_at &&
														` · Expires ${new Date(ann.expires_at).toLocaleDateString()}`}
												</span>
											</div>
											<p className='mt-3 text-[var(--color-text-secondary)] whitespace-pre-wrap text-sm leading-relaxed'>
												{ann.content}
											</p>
										</li>
									))}
								</ul>
							)}
						</div>
					</section>
				</div>
			)}

			<ConfirmModal
				isOpen={confirmOpen}
				onClose={() => {
					setConfirmOpen(false);
					setUnenrollTarget(null);
				}}
				onConfirm={performUnenroll}
				title='Unenroll from class'
				message='Are you sure you want to unenroll from this class?'
				confirmText='Unenroll'
				cancelText='Cancel'
				type='warning'
			/>

			<ConfirmModal
				isOpen={enrollConfirmOpen}
				onClose={() => {
					setEnrollConfirmOpen(false);
					setEnrollTarget(null);
				}}
				onConfirm={performEnroll}
				title='Enroll in class'
				message='Are you sure you want to enroll in this class?'
				confirmText='Enroll'
				cancelText='Cancel'
				type='success'
			/>
		</div>
	);
}
