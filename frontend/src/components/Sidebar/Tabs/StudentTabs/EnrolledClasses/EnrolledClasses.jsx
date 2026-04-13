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

	const CardSkeleton = () => (
		<div className='animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm'>
			<div className='h-5 bg-[var(--color-border)] rounded w-1/2 mb-3' />
			<div className='h-4 bg-[var(--color-border)] rounded w-3/4 mb-2' />
			<div className='h-4 bg-[var(--color-border)] rounded w-2/3 mb-4' />
			<div className='h-20 bg-[var(--color-border)] rounded mt-auto' />
		</div>
	);

	const ClassCard = ({ cls, enrolled = false }) => {
		const id = cls.class_id ?? cls.id;
		const isLoadingEnroll = enrollingId === id;
		const isLoadingUnenroll = unenrollingId === id;
		const scheduleBlocks = getScheduleBlocksFromClass(cls);

		return (
			<div className='flex flex-col h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--color-border-hover)]'>
				<div className='flex justify-between items-start gap-2'>
					<h3 className='text-lg font-semibold text-[var(--color-text-primary)] truncate'>
						{cls.class_name}
					</h3>
					{enrolled && (
						<span className='shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20'>
							Enrolled
						</span>
					)}
				</div>

				<div className='mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]'>
					{scheduleBlocks.length > 0 ? (
						<>
							{scheduleBlocks.slice(0, 2).map((block, index) => (
								<p
									key={`${block.day}-${block.start_time}-${index}`}
									className='flex items-center gap-1.5'
								>
									<span className='w-12 text-xs font-medium text-[var(--color-text-muted)]'>
										{block.day}
									</span>
									<span>
										{formatTimeRange(block.start_time, block.end_time)}
									</span>
								</p>
							))}
							{scheduleBlocks.length > 2 && (
								<p className='text-xs text-[var(--color-text-muted)] pl-14'>
									+ {scheduleBlocks.length - 2} more
								</p>
							)}
						</>
					) : (
						<p className='text-[var(--color-text-muted)] italic'>
							No schedule listed
						</p>
					)}
					{cls.room_number && (
						<p className='flex items-center gap-1.5'>
							<span className='w-12 text-xs font-medium text-[var(--color-text-muted)]'>
								Room
							</span>
							<span>{cls.room_number}</span>
						</p>
					)}
				</div>

				{!enrolled && cls.description && (
					<p className='mt-3 text-sm text-[var(--color-text-muted)] line-clamp-2'>
						{cls.description}
					</p>
				)}

				{cls.meeting_link && (
					<a
						href={cls.meeting_link}
						target='_blank'
						rel='noreferrer'
						className='mt-3 inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors'
					>
						<svg
							className='w-4 h-4 mr-1'
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
					<p className='mt-3 text-xs text-[var(--color-text-muted)]'>
						Enrolled {new Date(cls.enrollment_date).toLocaleDateString()}
					</p>
				)}

				<div className='mt-auto pt-4 flex gap-2'>
					{enrolled ? (
						<>
							<button
								onClick={() => handleShowAnnouncements(cls)}
								className='flex-1 px-3 py-2 text-sm font-medium text-[var(--color-primary)] bg-transparent border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2'
							>
								Announcements
							</button>
							<button
								onClick={() => requestUnenroll(id)}
								disabled={isLoadingUnenroll}
								className='flex-1 px-3 py-2 text-sm font-medium text-[var(--color-danger)] bg-transparent border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-danger-soft)] hover:border-[var(--color-danger)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:ring-offset-2'
							>
								{isLoadingUnenroll ? (
									<SpinnerIcon className='w-4 h-4 animate-spin mx-auto' />
								) : (
									'Unenroll'
								)}
							</button>
						</>
					) : (
						<button
							onClick={() => requestEnroll(id)}
							disabled={isLoadingEnroll}
							className='w-full px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2'
						>
							{isLoadingEnroll ? (
								<SpinnerIcon className='w-4 h-4 animate-spin mx-auto' />
							) : (
								'Enroll now'
							)}
						</button>
					)}
				</div>
			</div>
		);
	};

	if (loadingEnrolled) {
		return (
			<div className='p-4 sm:p-6'>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
					My Enrolled Classes
				</h1>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
					{[1, 2, 3].map((i) => (
						<CardSkeleton key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className='p-4 sm:p-6'>
			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
				My Enrolled Classes
			</h1>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
			/>

			<div className='mb-10'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-lg font-medium text-[var(--color-text-primary)]'>
						Enrolled Classes
					</h2>
					<span className='text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] px-3 py-1 rounded-full border border-[var(--color-border)]'>
						{enrolledClasses.length}
					</span>
				</div>
				{enrolledClasses.length === 0 ? (
					<div className='text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl'>
						<p className='text-[var(--color-text-muted)]'>
							You are not enrolled in any classes yet.
						</p>
					</div>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
						{enrolledClasses.map((cls) => (
							<ClassCard key={cls.class_id ?? cls.id} cls={cls} enrolled />
						))}
					</div>
				)}
			</div>

			<div>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-lg font-medium text-[var(--color-text-primary)]'>
						Available Classes
					</h2>
					<span className='text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] px-3 py-1 rounded-full border border-[var(--color-border)]'>
						{availableClasses.length}
					</span>
				</div>
				{loadingAvailable ? (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
						{[1, 2, 3].map((i) => (
							<CardSkeleton key={i} />
						))}
					</div>
				) : availableClasses.length === 0 ? (
					<div className='text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl'>
						<p className='text-[var(--color-text-muted)]'>
							No classes available to enroll.
						</p>
					</div>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
						{availableClasses.map((cls) => (
							<ClassCard key={cls.id} cls={cls} enrolled={false} />
						))}
					</div>
				)}
			</div>

			{showAnnouncementsModal && selectedClass && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div
						className='absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity'
						onClick={closeAnnouncementsModal}
						aria-hidden='true'
					/>
					<section
						role='dialog'
						aria-modal='true'
						aria-labelledby='announcements-title'
						className='relative z-10 w-full max-w-3xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden transform transition-all duration-200'
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
									</p>
								</div>
								<button
									onClick={closeAnnouncementsModal}
									aria-label='Close announcements'
									className='shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
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
						<div className='max-h-[70vh] overflow-y-auto p-4 sm:p-6'>
							{loadingAnnouncements ? (
								<div className='space-y-3'>
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className='animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 h-24'
										/>
									))}
								</div>
							) : announcements.length === 0 ? (
								<div className='py-12 text-center'>
									<p className='text-[var(--color-text-muted)]'>
										No announcements yet.
									</p>
								</div>
							) : (
								<ul className='space-y-4'>
									{announcements.map((ann) => (
										<li
											key={ann.id}
											className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5'
										>
											<div className='flex flex-col sm:flex-row sm:items-start justify-between gap-2'>
												<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>
													{ann.title}
												</h3>
												<span className='text-xs text-[var(--color-text-muted)] whitespace-nowrap'>
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
