import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Building2, Users } from 'lucide-react';
import { getAdminRiskOverview } from '../../../../../api/adminApi';
import Toast from '../../../../Toast';

function riskBadgeClass(level) {
	if (level === 'high') {
		return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
	}
	if (level === 'medium') {
		return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
	}
	return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
}

export default function AdminRiskOverview() {
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState(null);
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const loadOverview = useCallback(async () => {
		setLoading(true);
		try {
			const response = await getAdminRiskOverview();
			setOverview(response.data || null);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load risk overview.');
		} finally {
			setLoading(false);
		}
	}, [openToast]);

	useEffect(() => {
		loadOverview();
	}, [loadOverview]);

	if (loading) {
		return (
			<div className='p-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]'>
					Loading risk overview...
				</div>
			</div>
		);
	}

	const totals = overview?.totals || {
		totalStudents: 0,
		totalClasses: 0,
		unresolvedReports: 0,
	};
	const unresolved = overview?.unresolvedReportsByStatus || {
		submitted: 0,
		under_process: 0,
	};
	const atRiskStudents = Array.isArray(overview?.atRiskStudents) ? overview.atRiskStudents : [];
	const lowAttendanceClasses = Array.isArray(overview?.lowAttendanceClasses) ? overview.lowAttendanceClasses : [];

	return (
		<div className='min-h-screen bg-[var(--color-bg)] p-4 sm:p-6 lg:p-8'>
			<div className='mx-auto max-w-7xl space-y-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
					<div className='flex items-center justify-between gap-3'>
						<div>
							<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Institute Risk Overview</h1>
							<p className='mt-1 text-sm text-[var(--color-text-muted)]'>Track attendance risk and unresolved concern load this month.</p>
						</div>
						<button
							type='button'
							onClick={loadOverview}
							className='rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
						>
							Refresh
						</button>
					</div>

					<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs text-[var(--color-text-muted)]'>Total students</p>
							<p className='mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]'>
								<Users size={18} /> {totals.totalStudents}
							</p>
						</div>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs text-[var(--color-text-muted)]'>Total classes</p>
							<p className='mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]'>
								<Building2 size={18} /> {totals.totalClasses}
							</p>
						</div>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs text-[var(--color-text-muted)]'>Unresolved reports</p>
							<p className='mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]'>
								<AlertTriangle size={18} /> {totals.unresolvedReports}
							</p>
							<p className='mt-1 text-xs text-[var(--color-text-muted)]'>Submitted: {unresolved.submitted} | Under process: {unresolved.under_process}</p>
						</div>
					</div>
				</div>

				<div className='grid gap-6 xl:grid-cols-2'>
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>At-Risk Students</h2>
						{atRiskStudents.length === 0 ? (
							<p className='mt-2 text-sm text-[var(--color-text-muted)]'>No at-risk attendance signals found this month.</p>
						) : (
							<div className='mt-3 max-h-[420px] overflow-auto rounded-xl border border-[var(--color-border)]'>
								<table className='min-w-full divide-y divide-[var(--color-border)] text-sm'>
									<thead className='bg-[var(--color-input-bg)]'>
										<tr>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Student</th>
											<th className='px-3 py-2 text-center font-medium text-[var(--color-text-muted)]'>Rate</th>
											<th className='px-3 py-2 text-center font-medium text-[var(--color-text-muted)]'>Absent</th>
											<th className='px-3 py-2 text-center font-medium text-[var(--color-text-muted)]'>Late</th>
											<th className='px-3 py-2 text-center font-medium text-[var(--color-text-muted)]'>Risk</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-[var(--color-border)]'>
										{atRiskStudents.map((student) => (
											<tr key={student.studentId}>
												<td className='px-3 py-2 text-[var(--color-text-primary)]'>{student.studentName}</td>
												<td className='px-3 py-2 text-center text-[var(--color-text-secondary)]'>{student.attendanceRate}%</td>
												<td className='px-3 py-2 text-center text-red-600'>{student.absentCount}</td>
												<td className='px-3 py-2 text-center text-amber-600'>{student.lateCount}</td>
												<td className='px-3 py-2 text-center'>
													<span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskBadgeClass(student.riskLevel)}`}>
														{student.riskLevel}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Low Attendance Classes</h2>
						{lowAttendanceClasses.length === 0 ? (
							<p className='mt-2 text-sm text-[var(--color-text-muted)]'>No low-attendance classes detected this month.</p>
						) : (
							<div className='mt-3 space-y-2'>
								{lowAttendanceClasses.map((classItem) => (
									<div key={classItem.classId} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5'>
										<p className='text-sm font-medium text-[var(--color-text-primary)]'>{classItem.className}</p>
										<p className='mt-1 text-xs text-[var(--color-text-muted)]'>
											Attendance: <span className='font-semibold text-[var(--color-text-secondary)]'>{classItem.attendanceRate}%</span>
											 <span className='mx-1'>|</span>
											Absences: <span className='font-semibold text-red-600'>{classItem.absentCount}</span>
											 <span className='mx-1'>|</span>
											Entries: <span className='font-semibold text-[var(--color-text-secondary)]'>{classItem.recordedEntries}</span>
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
			/>
		</div>
	);
}
