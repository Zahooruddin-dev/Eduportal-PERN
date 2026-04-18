import ConfirmModal from '../../../../ConfirmModal';

export default function EnrollmentConfirmModals({
	confirmOpen,
	enrollConfirmOpen,
	onCloseUnenroll,
	onConfirmUnenroll,
	onCloseEnroll,
	onConfirmEnroll,
}) {
	return (
		<>
			<ConfirmModal
				isOpen={confirmOpen}
				onClose={onCloseUnenroll}
				onConfirm={onConfirmUnenroll}
				title='Unenroll from class'
				message='Are you sure you want to unenroll from this class?'
				confirmText='Unenroll'
				cancelText='Cancel'
				type='warning'
			/>

			<ConfirmModal
				isOpen={enrollConfirmOpen}
				onClose={onCloseEnroll}
				onConfirm={onConfirmEnroll}
				title='Enroll in class'
				message='Are you sure you want to enroll in this class?'
				confirmText='Enroll'
				cancelText='Cancel'
				type='success'
			/>
		</>
	);
}
