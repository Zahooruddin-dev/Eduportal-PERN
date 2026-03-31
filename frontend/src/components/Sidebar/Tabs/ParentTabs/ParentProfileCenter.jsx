import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	getParentLinkedStudentOverview,
	updateParentProfile,
} from '../../../../api/authApi';
import Toast from '../../../Toast';

const INITIAL_FORM = {
	childFullName: '',
	childGrade: '',
	relationshipToChild: '',
	parentPhone: '',
	alternatePhone: '',
	address: '',
	notes: '',
};

const DEFAULT_ATTENDANCE_TOTALS = {
	total: 0,
	present: 0,
	absent: 0,
	late: 0,
	excused: 0,
};

function toFormValues(profile) {
	if (!profile) return INITIAL_FORM;
	return {
		childFullName: profile.child_full_name || '',
		childGrade: profile.child_grade || '',
		relationshipToChild: profile.relationship_to_child || '',
		parentPhone: profile.parent_phone || '',
		alternatePhone: profile.alternate_phone || '',
		address: profile.address || '',
		notes: profile.notes || '',
	};
}

function formatTime(value) {
	if (!value) return 'N/A';
	const text = String(value);
	if (text.length >= 5) return text.slice(0, 5);
	return text;
}

function formatDate(value) {
	if (!value) return 'N/A';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return 'N/A';
	return parsed.toLocaleDateString();
}

function getAttendanceRate(totals) {
	const total = Number(totals?.total || 0);
	const present = Number(totals?.present || 0);
	if (!Number.isFinite(total) || total <= 0) return null;
	if (!Number.isFinite(present) || present < 0) return null;
	return Math.round((present / total) * 100);
}

function getGradeRate(grades) {
	if (!Array.isArray(grades) || !grades.length) return null;
	let earned = 0;
	let maximum = 0;
	grades.forEach((gradeItem) => {
		const grade = Number(gradeItem.grade);
		const maxGrade = Number(gradeItem.max_grade);
		if (Number.isFinite(grade) && Number.isFinite(maxGrade) && maxGrade > 0) {
			earned += grade;
			maximum += maxGrade;
		}
	});
	if (maximum <= 0) return null;
	return Math.round((earned / maximum) * 100);
}

export default function ParentProfileCenter() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [overview, setOverview] = useState(null);
	const [form, setForm] = useState(INITIAL_FORM);
	const [errors, setErrors] = useState({});
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const loadOverview = useCallback(async ({ silent = false, refresh = false } = {}) => {
		if (!silent) {
			setLoading(true);
		}
		try {
			const response = await getParentLinkedStudentOverview({ refresh });
			const payload = response.data || null;
			setOverview(payload);
			setForm(toFormValues(payload?.parentProfile));
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load parent details.');
		} finally {
			if (!silent) {
				setLoading(false);
			}
			setRefreshing(false);
		}
	}, [openToast]);

	useEffect(() => {
		loadOverview();
	}, [loadOverview]);

	const attendanceTotals = overview?.attendanceSummary?.totals || DEFAULT_ATTENDANCE_TOTALS;
	const attendanceRate = getAttendanceRate(attendanceTotals);
	const gradeRate = useMemo(() => getGradeRate(overview?.grades || []), [overview?.grades]);

	const validate = useCallback(() => {
		const nextErrors = {};
		if (!form.childFullName.trim()) nextErrors.childFullName = 'Child full name is required.';
		if (!form.childGrade.trim()) nextErrors.childGrade = 'Child grade is required.';
		if (!form.relationshipToChild.trim()) nextErrors.relationshipToChild = 'Relationship is required.';
		if (!form.parentPhone.trim()) nextErrors.parentPhone = 'Primary phone is required.';
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [form]);

	const handleSave = async (event) => {
		event.preventDefault();
		if (!validate()) {
			openToast('warning', 'Please fill in all required parent profile fields.');
			return;
		}

		setSaving(true);
		try {
			const payload = {
				childFullName: form.childFullName.trim(),
				childGrade: form.childGrade.trim(),
				relationshipToChild: form.relationshipToChild.trim(),
				parentPhone: form.parentPhone.trim(),
				alternatePhone: form.alternatePhone.trim(),
				address: form.address.trim(),
				notes: form.notes.trim(),
			};
			const response = await updateParentProfile(payload);
			const updatedProfile = response.data?.parentProfile;
			if (updatedProfile) {
				setOverview((previous) => ({
					...(previous || {}),
					parentProfile: updatedProfile,
				}));
				setForm(toFormValues(updatedProfile));
			}
			openToast('success', 'Parent profile updated successfully.');
			setRefreshing(true);
			await loadOverview({ silent: true, refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to update parent profile.');
		} finally {
			setSaving(false);
		}
	};

	const linkedStudent = overview?.linkedStudent;
	const byClassAttendance = overview?.attendanceSummary?.byClass || [];
	const grades = overview?.grades || [];
	const schedule = overview?.schedule || [];
	const weeklySnapshot = overview?.weeklySnapshot || null;
	const weeklyTotals = weeklySnapshot?.totals || DEFAULT_ATTENDANCE_TOTALS;
	const weeklyAttendanceRate = Number.isFinite(Number(weeklySnapshot?.attendanceRate))
		? Number(weeklySnapshot.attendanceRate)
		: null;
	const weeklyAlerts = Array.isArray(weeklySnapshot?.alerts) ? weeklySnapshot.alerts : [];
	const weeklyAttendanceByDay = Array.isArray(weeklySnapshot?.attendanceByDay)
		? weeklySnapshot.attendanceByDay
		: [];
	const weeklyRecentGrades = Array.isArray(weeklySnapshot?.recentGrades)
		? weeklySnapshot.recentGrades
		: [];

	if (loading) {
		return (
			<div className='p-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]'>
					Loading parent profile...
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[var(--color-bg)] p-4 sm:p-6 lg:p-8'>
			<div className='mx-auto max-w-7xl space-y-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
					<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Parent Profile Center</h1>
					<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
						Update your parent details and monitor your linked student profile, grades, and attendance.
					</p>
				</div>

				<div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
					<form onSubmit={handleSave} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Editable Parent Details</h2>

						<div className='grid gap-4 sm:grid-cols-2'>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Child Full Name *</label>
								<input
									value={form.childFullName}
									onChange={(event) => setForm((previous) => ({ ...previous, childFullName: event.target.value }))}
									className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 ${errors.childFullName ? 'border-red-500' : 'border-[var(--color-border)]'}`}
								/>
								{errors.childFullName && <p className='mt-1 text-xs text-red-500'>{errors.childFullName}</p>}
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Child Grade *</label>
								<input
									value={form.childGrade}
									onChange={(event) => setForm((previous) => ({ ...previous, childGrade: event.target.value }))}
									className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 ${errors.childGrade ? 'border-red-500' : 'border-[var(--color-border)]'}`}
								/>
								{errors.childGrade && <p className='mt-1 text-xs text-red-500'>{errors.childGrade}</p>}
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Relationship To Child *</label>
								<input
									value={form.relationshipToChild}
									onChange={(event) => setForm((previous) => ({ ...previous, relationshipToChild: event.target.value }))}
									className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 ${errors.relationshipToChild ? 'border-red-500' : 'border-[var(--color-border)]'}`}
								/>
								{errors.relationshipToChild && <p className='mt-1 text-xs text-red-500'>{errors.relationshipToChild}</p>}
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Primary Phone *</label>
								<input
									value={form.parentPhone}
									onChange={(event) => setForm((previous) => ({ ...previous, parentPhone: event.target.value }))}
									className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 ${errors.parentPhone ? 'border-red-500' : 'border-[var(--color-border)]'}`}
								/>
								{errors.parentPhone && <p className='mt-1 text-xs text-red-500'>{errors.parentPhone}</p>}
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Alternate Phone</label>
								<input
									value={form.alternatePhone}
									onChange={(event) => setForm((previous) => ({ ...previous, alternatePhone: event.target.value }))}
									className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
								/>
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Address</label>
								<input
									value={form.address}
									onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
									className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
								/>
							</div>
						</div>

						<div>
							<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Notes</label>
							<textarea
								rows={4}
								value={form.notes}
								onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
							/>
						</div>

						<div className='flex justify-end'>
							<button
								type='submit'
								disabled={saving}
								className='rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
							>
								{saving ? 'Saving...' : 'Save Parent Details'}
							</button>
						</div>
					</form>

					<div className='space-y-6'>
						<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
							<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Linked Student Overview</h2>
							{!linkedStudent ? (
								<p className='mt-2 text-sm text-[var(--color-text-muted)]'>
									No student is linked yet. Ask your institute admin to map your parent account to your child account.
								</p>
							) : (
								<div className='mt-3 space-y-3 text-sm text-[var(--color-text-secondary)]'>
									<p><span className='font-medium text-[var(--color-text-primary)]'>Student:</span> {linkedStudent.username}</p>
									<p><span className='font-medium text-[var(--color-text-primary)]'>Email:</span> {linkedStudent.email}</p>
									<p><span className='font-medium text-[var(--color-text-primary)]'>Joined:</span> {formatDate(linkedStudent.created_at)}</p>
									<div className='mt-2 grid grid-cols-2 gap-2'>
										<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
											<p className='text-xs text-[var(--color-text-muted)]'>Attendance</p>
											<p className='text-lg font-semibold text-[var(--color-text-primary)]'>
												{attendanceRate === null ? 'N/A' : `${attendanceRate}%`}
											</p>
										</div>
										<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
											<p className='text-xs text-[var(--color-text-muted)]'>Overall Grades</p>
											<p className='text-lg font-semibold text-[var(--color-text-primary)]'>
												{gradeRate === null ? 'N/A' : `${gradeRate}%`}
											</p>
										</div>
									</div>
								</div>
							)}
						</div>

						<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
							<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Attendance Summary</h3>
							<div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
								<div className='rounded-lg border border-[var(--color-border)] p-2'>Present: {attendanceTotals.present}</div>
								<div className='rounded-lg border border-[var(--color-border)] p-2'>Absent: {attendanceTotals.absent}</div>
								<div className='rounded-lg border border-[var(--color-border)] p-2'>Late: {attendanceTotals.late}</div>
								<div className='rounded-lg border border-[var(--color-border)] p-2'>Excused: {attendanceTotals.excused}</div>
							</div>
							{byClassAttendance.length > 0 && (
								<div className='mt-3 space-y-2 text-xs text-[var(--color-text-secondary)]'>
									{byClassAttendance.map((row) => (
										<div key={row.class_id} className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
											<p className='font-medium text-[var(--color-text-primary)]'>{row.class_name || row.class_id}</p>
											<p className='mt-1'>P: {row.present_count} | A: {row.absent_count} | L: {row.late_count} | E: {row.excused_count}</p>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<div className='grid gap-6 xl:grid-cols-2'>
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Weekly Snapshot</h3>
							<p className='text-xs text-[var(--color-text-muted)]'>
								{weeklySnapshot?.startDate && weeklySnapshot?.endDate
									? `${formatDate(weeklySnapshot.startDate)} - ${formatDate(weeklySnapshot.endDate)}`
									: 'Last 7 days'}
							</p>
						</div>

						<div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
							<div className='rounded-lg border border-[var(--color-border)] p-2'>
								<p className='text-xs text-[var(--color-text-muted)]'>Attendance Rate</p>
								<p className='font-semibold text-[var(--color-text-primary)]'>
									{weeklyAttendanceRate === null ? 'N/A' : `${weeklyAttendanceRate}%`}
								</p>
							</div>
							<div className='rounded-lg border border-[var(--color-border)] p-2'>
								<p className='text-xs text-[var(--color-text-muted)]'>Recorded Entries</p>
								<p className='font-semibold text-[var(--color-text-primary)]'>{weeklyTotals.total || 0}</p>
							</div>
							<div className='rounded-lg border border-[var(--color-border)] p-2'>
								<p className='text-xs text-[var(--color-text-muted)]'>Absences</p>
								<p className='font-semibold text-[var(--color-text-primary)]'>{weeklyTotals.absent || 0}</p>
							</div>
							<div className='rounded-lg border border-[var(--color-border)] p-2'>
								<p className='text-xs text-[var(--color-text-muted)]'>Late</p>
								<p className='font-semibold text-[var(--color-text-primary)]'>{weeklyTotals.late || 0}</p>
							</div>
						</div>

						<div className='mt-4 space-y-2'>
							{weeklyAlerts.length === 0 ? (
								<p className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-secondary)]'>
									No active weekly alerts.
								</p>
							) : (
								weeklyAlerts.map((alert) => (
									<div
										key={`${alert.type || 'notice'}-${alert.message || 'notice'}`}
										className={`rounded-lg border px-3 py-2 text-sm ${alert.type === 'warning'
											? 'border-amber-200 bg-amber-50 text-amber-900'
											: 'border-blue-200 bg-blue-50 text-blue-900'}`}
									>
										{alert.message}
									</div>
								))
							)}
						</div>

						{weeklyAttendanceByDay.length > 0 && (
							<div className='mt-4 rounded-xl border border-[var(--color-border)]'>
								<div className='max-h-48 overflow-auto'>
									<table className='min-w-full divide-y divide-[var(--color-border)] text-xs'>
										<thead className='bg-[var(--color-input-bg)]'>
											<tr>
												<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Date</th>
												<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>P</th>
												<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>A</th>
												<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>L</th>
												<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>E</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-[var(--color-border)]'>
											{weeklyAttendanceByDay.map((day) => (
												<tr key={day.date}>
													<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{formatDate(day.date)}</td>
													<td className='px-3 py-2 text-[var(--color-text-primary)]'>{day.present || 0}</td>
													<td className='px-3 py-2 text-[var(--color-text-primary)]'>{day.absent || 0}</td>
													<td className='px-3 py-2 text-[var(--color-text-primary)]'>{day.late || 0}</td>
													<td className='px-3 py-2 text-[var(--color-text-primary)]'>{day.excused || 0}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>

					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Recent Weekly Grades</h3>
						{weeklyRecentGrades.length === 0 ? (
							<p className='mt-2 text-sm text-[var(--color-text-muted)]'>No recent grade activity in the last 2 weeks.</p>
						) : (
							<div className='mt-3 max-h-72 overflow-auto rounded-xl border border-[var(--color-border)]'>
								<table className='min-w-full divide-y divide-[var(--color-border)] text-sm'>
									<thead className='bg-[var(--color-input-bg)]'>
										<tr>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Date</th>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Class</th>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Type</th>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Score</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-[var(--color-border)]'>
										{weeklyRecentGrades.map((gradeItem) => (
											<tr key={gradeItem.id}>
												<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{formatDate(gradeItem.createdAt)}</td>
												<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{gradeItem.className || gradeItem.classId}</td>
												<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{gradeItem.gradeType || 'N/A'}</td>
												<td className={`px-3 py-2 font-medium ${(gradeItem.percentage ?? 100) < 50 ? 'text-rose-600' : 'text-[var(--color-text-primary)]'}`}>
													{gradeItem.grade} / {gradeItem.maxGrade}
													{gradeItem.percentage !== null ? ` (${gradeItem.percentage}%)` : ''}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

				<div className='grid gap-6 xl:grid-cols-2'>
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Linked Student Grades</h3>
						{grades.length === 0 ? (
							<p className='mt-2 text-sm text-[var(--color-text-muted)]'>No released grades available.</p>
						) : (
							<div className='mt-3 max-h-72 overflow-auto rounded-xl border border-[var(--color-border)]'>
								<table className='min-w-full divide-y divide-[var(--color-border)] text-sm'>
									<thead className='bg-[var(--color-input-bg)]'>
										<tr>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Class</th>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Type</th>
											<th className='px-3 py-2 text-left font-medium text-[var(--color-text-muted)]'>Score</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-[var(--color-border)]'>
										{grades.map((gradeItem) => (
											<tr key={gradeItem.id}>
												<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{gradeItem.class_name || gradeItem.class_id}</td>
												<td className='px-3 py-2 text-[var(--color-text-secondary)]'>{gradeItem.grade_type || 'N/A'}</td>
												<td className='px-3 py-2 text-[var(--color-text-primary)] font-medium'>
													{gradeItem.grade} / {gradeItem.max_grade}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h3 className='text-base font-semibold text-[var(--color-text-primary)]'>Linked Student Schedule</h3>
						{schedule.length === 0 ? (
							<p className='mt-2 text-sm text-[var(--color-text-muted)]'>No enrolled classes found.</p>
						) : (
							<div className='mt-3 space-y-2'>
								{schedule.map((item) => (
									<div key={item.class_id} className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm'>
										<p className='font-medium text-[var(--color-text-primary)]'>{item.class_name}</p>
										<p className='text-[var(--color-text-secondary)]'>
											{item.subject || 'Subject N/A'} • Grade {item.grade_level || 'N/A'}
										</p>
										<p className='text-xs text-[var(--color-text-muted)]'>
											{formatTime(item.start_time)} - {formatTime(item.end_time)}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{refreshing && (
				<div className='fixed bottom-4 right-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)] shadow-lg'>
					Refreshing linked student data...
				</div>
			)}

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
			/>
		</div>
	);
}
