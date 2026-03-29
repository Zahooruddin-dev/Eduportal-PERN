import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
	getStudentEnrolledShedule,
	getClasses,
	postEnrollement,
	unenrollStudent,
	getClassAnnouncements,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';

export default function EnrolledClasses() {
	const { user } = useAuth();
	const [enrolledClasses, setEnrolledClasses] = useState([]);
	const [availableClasses, setAvailableClasses] = useState([]);
	const [loadingEnrolled, setLoadingEnrolled] = useState(true);
	const [loadingAvailable, setLoadingAvailable] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [unenrollTarget, setUnenrollTarget] = useState(null);
	const [enrollConfirmOpen, setEnrollConfirmOpen] = useState(false);
	const [enrollTarget, setEnrollTarget] = useState(null);
	const [selectedClass, setSelectedClass] = useState(null);
	const [announcements, setAnnouncements] = useState([]);
	const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
	const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

	// Auto‑hide messages after 3 seconds
	useEffect(() => {
		if (error || success) {
			const timer = setTimeout(() => {
				setError('');
				setSuccess('');
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [error, success]);

	// Fetch enrolled classes
	const fetchEnrolled = async () => {
		setLoadingEnrolled(true);
		setError('');
		try {
			const res = await getStudentEnrolledShedule(user.id);
			setEnrolledClasses(res.data);
		} catch (err) {
			setError('Failed to load enrolled classes');
		} finally {
			setLoadingEnrolled(false);
		}
	};

	// Fetch all available classes (filtered in useEffect)
	const fetchAvailable = async () => {
		setLoadingAvailable(true);
		try {
			const res = await getClasses();
			// Filter out already enrolled (support either `class_id` or `id` in enrolled entries)
			const enrolledIds = enrolledClasses.map((c) => c.class_id ?? c.id);
			const filtered = res.data.filter((cls) => !enrolledIds.includes(cls.id));
			setAvailableClasses(filtered);
		} catch (err) {
			setError('Failed to load available classes');
		} finally {
			setLoadingAvailable(false);
		}
	};

	useEffect(() => {
		if (user) {
			fetchEnrolled();
		}
	}, [user]);

	useEffect(() => {
		// Only fetch available classes after enrolled list finishes loading
		if (!loadingEnrolled) {
			fetchAvailable();
		}
	}, [enrolledClasses, loadingEnrolled]);

	// Request to open enroll confirmation
	const requestEnroll = (classId) => {
	 	setEnrollTarget(classId);
	 	setEnrollConfirmOpen(true);
	};

	// Perform actual enroll after confirmation
	const performEnroll = async () => {
	 	if (!enrollTarget) return;
	 	setError('');
	 	setSuccess('');
	 	try {
	 		await postEnrollement({ student_id: user.id, class_id: enrollTarget });
	 		setSuccess('Successfully enrolled!');
	 		setToast({ isOpen: true, type: 'success', message: 'Successfully enrolled!' });
	 		setEnrollTarget(null);
	 		setEnrollConfirmOpen(false);
	 		fetchEnrolled(); // refresh list
	 	} catch (err) {
	 		const msg = err.response?.data?.message || 'Enrollment failed';
	 		setError(msg);
	 		setToast({ isOpen: true, type: 'error', message: msg });
	 		setEnrollConfirmOpen(false);
	 		setEnrollTarget(null);
	 	}
	};

	const requestUnenroll = (classId) => {
		// accept either class_id or id
		const id = classId;
		setUnenrollTarget(id);
		setConfirmOpen(true);
	};

	const performUnenroll = async () => {
		if (!unenrollTarget) return;
		setError('');
		setSuccess('');
		try {
			await unenrollStudent(user.id, unenrollTarget);
			setSuccess('Successfully unenrolled');
			setToast({ isOpen: true, type: 'success', message: 'Successfully unenrolled' });
			setUnenrollTarget(null);
			fetchEnrolled();
		} catch (err) {
			const msg = err.response?.data?.error || 'Unenrollment failed';
			setError(msg);
			setToast({ isOpen: true, type: 'error', message: msg });
		}
	};

	const handleShowAnnouncements = async (cls) => {
		setSelectedClass(cls);
		setLoadingAnnouncements(true);
		const id = cls.class_id ?? cls.id;
		try {
			const res = await getClassAnnouncements(id);
			setAnnouncements(res.data);
			setShowAnnouncementsModal(true);
		} catch (err) {
			setError('Failed to load announcements');
		} finally {
			setLoadingAnnouncements(false);
		}
	};

	if (loadingEnrolled) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	return (
		<div className='p-6'>
			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
				My Enrolled Classes
			</h1>

			{/* Notifications */}
			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
			/>

			{/* Enrolled Classes Section */}
			<div className='mb-8'>
				<h2 className='text-lg font-medium text-[var(--color-text-primary)] mb-3'>
					Enrolled Classes ({enrolledClasses.length})
				</h2>
				{enrolledClasses.length === 0 ? (
					<p className='text-[var(--color-text-muted)]'>
						You are not enrolled in any classes yet.
					</p>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{enrolledClasses.map((cls) => (
							<div
								key={cls.class_id ?? cls.id}
								className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'
							>
								<h3 className='text-lg font-semibold text-[var(--color-text-primary)] mb-1'>
									{cls.class_name}
								</h3>
								<div className='space-y-1 text-sm text-[var(--color-text-secondary)]'>
									<p>📅 {cls.schedule_days}</p>
									<p>
										⏰ {cls.start_time} – {cls.end_time}
									</p>
								</div>
								<p className='text-xs text-[var(--color-text-muted)] mb-3'>
									Enrolled on{' '}
									{new Date(cls.enrollment_date).toLocaleDateString()}
								</p>
								<div className='flex gap-2'>
									<button
										onClick={() => handleShowAnnouncements(cls)}
										className='px-3 py-1 text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]/50 transition-colors'
									>
										Announcements
									</button>
									<button
										onClick={() => requestUnenroll(cls.class_id ?? cls.id)}
										className='px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
									>
										Unenroll
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Available Classes Section */}
			<div>
				<h2 className='text-lg font-medium text-[var(--color-text-primary)] mb-3'>
					Available Classes
				</h2>
				{loadingAvailable ? (
					<div className='flex justify-center py-4'>
						<SpinnerIcon />
					</div>
				) : availableClasses.length === 0 ? (
					<p className='text-[var(--color-text-muted)]'>
						No classes available to enroll.
					</p>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{availableClasses.map((cls) => (
							<div
								key={cls.id}
								className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'
							>
								<h3 className='text-lg font-semibold text-[var(--color-text-primary)] mb-1'>
									{cls.class_name}
								</h3>
								<div className='space-y-1 text-sm text-[var(--color-text-secondary)]'>
									<p>📅 {cls.schedule_days}</p>
									<p>
										⏰ {cls.start_time} – {cls.end_time}
									</p>
									{cls.room_number && <p>🚪 Room {cls.room_number}</p>}
								</div>
								{cls.description && (
									<p className='mt-2 text-sm text-[var(--color-text-muted)] line-clamp-2'>
										{cls.description}
									</p>
								)}
								<div className='mt-4'>
									<button
										onClick={() => requestEnroll(cls.id)}
										className='px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors'
									>
										Enroll
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Announcements Modal */}
			{showAnnouncementsModal && selectedClass && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
					<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6'>
						<div className='flex justify-between items-center mb-4'>
							<h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>
								Announcements for {selectedClass.class_name}
							</h2>
							<button
								onClick={() => setShowAnnouncementsModal(false)}
								className='text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
							>
								✕
							</button>
						</div>
						{loadingAnnouncements ? (
							<div className='flex justify-center py-4'>
								<SpinnerIcon />
							</div>
						) : announcements.length === 0 ? (
							<p className='text-[var(--color-text-muted)]'>
								No announcements yet.
							</p>
						) : (
							<div className='space-y-4'>
								{announcements.map((ann) => (
									<div
										key={ann.id}
										className='border-b border-[var(--color-border)] pb-3 last:border-0'
									>
										<h3 className='font-semibold text-[var(--color-text-primary)]'>
											{ann.title}
										</h3>
										<p className='text-xs text-[var(--color-text-muted)] mt-1'>
											Posted on {new Date(ann.created_at).toLocaleString()}
											{ann.expires_at &&
												` • Expires ${new Date(ann.expires_at).toLocaleString()}`}
										</p>
										<p className='mt-2 text-[var(--color-text-secondary)] whitespace-pre-wrap'>
											{ann.content}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Confirm unenroll modal */}
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
		
		{/* Confirm enroll modal */}
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
