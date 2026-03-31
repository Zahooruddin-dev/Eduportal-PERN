import { useState, useEffect, useCallback, useMemo } from 'react';
import {
	getMyClasses,
	getClassEnrolledRooster,
	getClassAttendance,
	getClassAttendanceSummary,
	postAttendance,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import { Calendar, Save } from 'lucide-react';
import Toast from '../../../../../components/Toast';

const STATUS_OPTIONS = [
	{ value: 'present', label: 'Present' },
	{ value: 'absent', label: 'Absent' },
	{ value: 'late', label: 'Late' },
	{ value: 'excused', label: 'Excused' },
];

const STATUS_THEME = {
	present: { color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
	absent: { color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
	late: { color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
	excused: { color: 'var(--color-info)', soft: 'var(--color-info-soft)' },
};

function getStatusStyles(status, isActive) {
	const palette = STATUS_THEME[status] || STATUS_THEME.present;
	return {
		borderColor: palette.color,
		color: palette.color,
		backgroundColor: isActive ? palette.soft : 'transparent',
		opacity: isActive ? 1 : 0.9,
	};
}

function getToneStyles(tone) {
	if (tone === 'danger') {
		return {
			color: 'var(--color-danger)',
			borderColor: 'var(--color-danger)',
			backgroundColor: 'var(--color-danger-soft)',
		};
	}
	if (tone === 'warning') {
		return {
			color: 'var(--color-warning)',
			borderColor: 'var(--color-warning)',
			backgroundColor: 'var(--color-warning-soft)',
		};
	}
	if (tone === 'info') {
		return {
			color: 'var(--color-info)',
			borderColor: 'var(--color-info)',
			backgroundColor: 'var(--color-info-soft)',
		};
	}
	return {
		color: 'var(--color-success)',
		borderColor: 'var(--color-success)',
		backgroundColor: 'var(--color-success-soft)',
	};
}

export default function TeacherAttendance() {
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [students, setStudents] = useState([]);
	const [loadingRoster, setLoadingRoster] = useState(false);
	const [selectedDate, setSelectedDate] = useState(
		new Date().toISOString().split('T')[0],
	);
	const [studentSearch, setStudentSearch] = useState('');
	const [attendanceMap, setAttendanceMap] = useState({});
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'success',
		message: '',
	});
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	});
	const [dateRecorded, setDateRecorded] = useState(false);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryData, setSummaryData] = useState([]);
	const [summaryStats, setSummaryStats] = useState({
		totalStudents: 0,
		highRisk: 0,
		mediumRisk: 0,
		lowRisk: 0,
		noData: 0,
	});
	const [showSummary, setShowSummary] = useState(false);

	const selectedClass = useMemo(
		() => classes.find((entry) => entry.id === selectedClassId) || null,
		[classes, selectedClassId],
	);

	const fetchClasses = useCallback(async () => {
		setLoading(true);
		try {
			const res = await getMyClasses();
			setClasses(Array.isArray(res.data) ? res.data : []);
			setError('');
		} catch (error) {
			console.error('Failed to load classes:', error);
			setError('Failed to load classes');
			setClasses([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchClasses();
	}, [fetchClasses]);

	useEffect(() => {
		if (!classes.length) {
			setSelectedClassId('');
			return;
		}
		if (!classes.some((entry) => entry.id === selectedClassId)) {
			setSelectedClassId(classes[0].id);
		}
	}, [classes, selectedClassId]);

	const fetchAttendanceForClass = useCallback(async (classId, date) => {
		setLoadingRoster(true);
		try {
			const rosterRes = await getClassEnrolledRooster(classId);
			const studentsList = Array.isArray(rosterRes.data) ? rosterRes.data : [];
			setStudents(studentsList);

			const attendanceRes = await getClassAttendance(classId, date);
			const attendancePayload = attendanceRes.data || {};
			const attendanceData = Array.isArray(attendancePayload.attendance)
				? attendancePayload.attendance
				: [];
			setDateRecorded(Boolean(attendancePayload.hasRecordedAttendance));

			const map = {};
			attendanceData.forEach((record) => {
				map[record.studentId] = record.status;
			});

			studentsList.forEach((student) => {
				if (!map[student.student_id]) map[student.student_id] = 'present';
			});

			setAttendanceMap(map);
			setError('');
		} catch (error) {
			console.error('Failed to load attendance data:', error);
			setError('Failed to load attendance data');
			setDateRecorded(false);
			setStudents([]);
			setAttendanceMap({});
		} finally {
			setLoadingRoster(false);
		}
	}, []);

	const fetchMonthlySummary = useCallback(async () => {
		if (!selectedClassId) return;
		setSummaryLoading(true);
		try {
			const response = await getClassAttendanceSummary(selectedClassId, selectedMonth);
			setSummaryData(Array.isArray(response.data?.summary) ? response.data.summary : []);
			setSummaryStats({
				totalStudents: Number(response.data?.stats?.totalStudents || 0),
				highRisk: Number(response.data?.stats?.highRisk || 0),
				mediumRisk: Number(response.data?.stats?.mediumRisk || 0),
				lowRisk: Number(response.data?.stats?.lowRisk || 0),
				noData: Number(response.data?.stats?.noData || 0),
			});
		} catch (err) {
			console.error(err);
			setToast({
				isOpen: true,
				type: 'error',
				message: 'Failed to load monthly summary',
			});
			setSummaryData([]);
			setSummaryStats({
				totalStudents: 0,
				highRisk: 0,
				mediumRisk: 0,
				lowRisk: 0,
				noData: 0,
			});
		} finally {
			setSummaryLoading(false);
		}
	}, [selectedClassId, selectedMonth]);

	useEffect(() => {
		if (showSummary && selectedClassId) {
			fetchMonthlySummary();
		}
	}, [fetchMonthlySummary, selectedClassId, showSummary]);

	useEffect(() => {
		if (selectedClassId) {
			fetchAttendanceForClass(selectedClassId, selectedDate);
		} else {
			setStudents([]);
			setAttendanceMap({});
		}
	}, [selectedClassId, selectedDate, fetchAttendanceForClass]);

	const handleStatusChange = (studentId, newStatus) => {
		setAttendanceMap((prev) => ({ ...prev, [studentId]: newStatus }));
	};

	const applyStatusToAll = (status) => {
		const next = {};
		students.forEach((student) => {
			next[student.student_id] = status;
		});
		setAttendanceMap(next);
	};

	const filteredStudents = useMemo(() => {
		const query = String(studentSearch || '').trim().toLowerCase();
		if (!query) return students;
		return students.filter((student) => {
			const username = String(student.username || '').toLowerCase();
			const email = String(student.email || '').toLowerCase();
			return username.includes(query) || email.includes(query);
		});
	}, [students, studentSearch]);

	const statusCounts = useMemo(() => {
		const initial = { present: 0, absent: 0, late: 0, excused: 0 };
		students.forEach((student) => {
			const status = attendanceMap[student.student_id] || 'present';
			if (initial[status] !== undefined) {
				initial[status] += 1;
			}
		});
		return initial;
	}, [students, attendanceMap]);

	const getRiskPillClass = (riskLevel) => {
		switch (riskLevel) {
			case 'high':
				return getToneStyles('danger');
			case 'medium':
				return getToneStyles('warning');
			case 'low':
				return getToneStyles('success');
			default:
				return {
					color: 'var(--color-text-muted)',
					borderColor: 'var(--color-border)',
					backgroundColor: 'var(--color-input-bg)',
				};
		}
	};

	const toRiskLabel = (riskLevel) => {
		if (riskLevel === 'high') return 'High risk';
		if (riskLevel === 'medium') return 'Medium risk';
		if (riskLevel === 'low') return 'Low risk';
		return 'No data';
	};

	const handleSave = async () => {
		if (!selectedClassId || students.length === 0) return;
		setSaving(true);
		const attendanceData = students.map((student) => ({
			studentId: student.student_id,
			status: attendanceMap[student.student_id] || 'present',
		}));
		try {
			await postAttendance(selectedClassId, {
				date: selectedDate,
				attendance: attendanceData,
			});
			setToast({
				isOpen: true,
				type: 'success',
				message: 'Attendance saved successfully!',
			});
			setDateRecorded(true);
			if (showSummary) {
				fetchMonthlySummary();
			}
		} catch (err) {
			setToast({
				isOpen: true,
				type: 'error',
				message: err.response?.data?.error || 'Failed to save attendance',
			});
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	if (error && !selectedClass) {
		return (
			<div className='p-6'>
				<AlertBox message={error} />
			</div>
		);
	}

	return (
		<div className='p-4 sm:p-6 space-y-5'>
			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5'>
				<div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
					<div>
						<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Teacher Attendance</h1>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
							Select class and date, mark quickly, then save once.
						</p>
					</div>
					<button
						onClick={handleSave}
						disabled={saving || loadingRoster || !selectedClassId || students.length === 0}
						className='inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
					>
						{saving ? <SpinnerIcon /> : <Save size={16} />}
						{saving ? 'Saving...' : 'Save Attendance'}
					</button>
				</div>

				<div className='mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]'>
					<div>
						<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Class</label>
						<select
							value={selectedClassId}
							onChange={(event) => setSelectedClassId(event.target.value)}
							disabled={!classes.length}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
						>
							{classes.length === 0 ? (
								<option value=''>No classes available</option>
							) : (
								classes.map((entry) => (
									<option key={entry.id} value={entry.id}>
										{entry.class_name}{entry.subject ? ` • ${entry.subject}` : ''}
									</option>
								))
							)}
						</select>
					</div>

					<div>
						<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Date</label>
						<div className='relative'>
							<input
								type='date'
								value={selectedDate}
								onChange={(event) => setSelectedDate(event.target.value)}
								className='w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
							/>
							<Calendar
								className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
								size={16}
							/>
						</div>
					</div>

					<div>
						<label className='mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'>Find Student</label>
						<input
							value={studentSearch}
							onChange={(event) => setStudentSearch(event.target.value)}
							placeholder='Search name or email'
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
						/>
					</div>
				</div>

				<div className='mt-3 flex flex-wrap items-center gap-2'>
					<span
						className='inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium'
						style={dateRecorded ? getToneStyles('success') : getToneStyles('warning')}
					>
						{dateRecorded ? 'Already recorded for this date' : 'Not recorded yet for this date'}
					</span>
					<span className='rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]'>
						Students: {students.length}
					</span>
					<span className='rounded-full border px-2.5 py-1 text-xs' style={getToneStyles('success')}>
						P {statusCounts.present}
					</span>
					<span className='rounded-full border px-2.5 py-1 text-xs' style={getToneStyles('danger')}>
						A {statusCounts.absent}
					</span>
					<span className='rounded-full border px-2.5 py-1 text-xs' style={getToneStyles('warning')}>
						L {statusCounts.late}
					</span>
					<span className='rounded-full border px-2.5 py-1 text-xs' style={getToneStyles('info')}>
						E {statusCounts.excused}
					</span>
				</div>

				<div className='mt-3 flex flex-wrap gap-2'>
					{STATUS_OPTIONS.map((option) => (
						<button
							key={option.value}
							type='button'
							onClick={() => applyStatusToAll(option.value)}
							disabled={students.length === 0 || loadingRoster}
							className='rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60'
							style={getStatusStyles(option.value, false)}
						>
							Mark All {option.label}
						</button>
					))}
				</div>
			</div>

			{error && <AlertBox message={error} />}
			{loadingRoster ? (
				<div className='flex justify-center py-10'>
					<SpinnerIcon />
				</div>
			) : students.length === 0 ? (
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]'>
					{classes.length === 0
						? "You don't have any classes yet. Create a class first."
						: 'No students enrolled in this class yet.'}
				</div>
			) : filteredStudents.length === 0 ? (
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]'>
					No students match your search.
				</div>
			) : (
				<div className='overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'>
					<table className='min-w-full'>
						<thead className='bg-[var(--color-input-bg)]'>
							<tr>
								<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]'>
									Student
								</th>
								<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]'>
									Status
								</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-[var(--color-border)]'>
							{filteredStudents.map((student) => (
								<tr key={student.student_id}>
									<td className='px-4 py-3 whitespace-nowrap'>
										<div className='flex items-center'>
											{student.profile_pic ? (
												<img
													src={student.profile_pic}
													alt={student.username}
													className='h-9 w-9 rounded-full object-cover'
												/>
											) : (
												<div className='flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-medium text-[var(--color-primary)]'>
													{student.username.charAt(0).toUpperCase()}
												</div>
											)}
											<div className='ml-3'>
												<p className='text-sm font-medium leading-5 text-[var(--color-text-primary)]'>
													{student.username}
												</p>
												{student.email && (
													<p className='text-xs text-[var(--color-text-muted)]'>{student.email}</p>
												)}
											</div>
										</div>
									</td>
									<td className='px-4 py-3'>
										<div className='flex flex-wrap gap-1.5'>
											{STATUS_OPTIONS.map((option) => {
												const active = (attendanceMap[student.student_id] || 'present') === option.value;
												return (
													<button
														key={option.value}
														type='button'
														onClick={() => handleStatusChange(student.student_id, option.value)}
														className='rounded-md border px-2.5 py-1 text-xs font-medium transition-colors'
														style={getStatusStyles(option.value, active)}
													>
														{option.label}
													</button>
												);
											})}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div>
						<h2 className='text-base font-semibold text-[var(--color-text-primary)]'>Monthly Insights</h2>
						<p className='text-xs text-[var(--color-text-muted)]'>Optional risk view for follow-up planning.</p>
					</div>
					<button
						type='button'
						onClick={() => setShowSummary((prev) => !prev)}
						className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
					>
						{showSummary ? 'Hide Insights' : 'Show Insights'}
					</button>
				</div>

				{showSummary && (
					<div className='mt-4 space-y-4'>
						<div className='flex items-center justify-end'>
							<input
								type='month'
								value={selectedMonth}
								onChange={(event) => setSelectedMonth(event.target.value)}
								className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
							/>
						</div>

						<div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
							<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2'>
								<p className='text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]'>Students</p>
								<p className='text-base font-semibold text-[var(--color-text-primary)]'>{summaryStats.totalStudents}</p>
							</div>
							<div className='rounded-xl border px-3 py-2' style={getToneStyles('danger')}>
								<p className='text-[10px] uppercase tracking-wide'>High Risk</p>
								<p className='text-base font-semibold'>{summaryStats.highRisk}</p>
							</div>
							<div className='rounded-xl border px-3 py-2' style={getToneStyles('warning')}>
								<p className='text-[10px] uppercase tracking-wide'>Medium Risk</p>
								<p className='text-base font-semibold'>{summaryStats.mediumRisk}</p>
							</div>
							<div className='rounded-xl border px-3 py-2' style={getToneStyles('success')}>
								<p className='text-[10px] uppercase tracking-wide'>Low Risk</p>
								<p className='text-base font-semibold'>{summaryStats.lowRisk}</p>
							</div>
							<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2'>
								<p className='text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]'>No Data</p>
								<p className='text-base font-semibold text-[var(--color-text-primary)]'>{summaryStats.noData}</p>
							</div>
						</div>

						{summaryLoading ? (
							<div className='flex justify-center py-4'>
								<SpinnerIcon />
							</div>
						) : summaryData.length === 0 ? (
							<p className='py-4 text-center text-sm text-[var(--color-text-muted)]'>No attendance records for this month.</p>
						) : (
							<div className='overflow-x-auto rounded-xl border border-[var(--color-border)]'>
								<table className='min-w-full bg-[var(--color-surface)]'>
									<thead className='bg-[var(--color-input-bg)]'>
										<tr>
											<th className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>Student</th>
											<th className='px-3 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>Days</th>
											<th className='px-3 py-2 text-center text-xs font-medium' style={{ color: 'var(--color-success)' }}>P</th>
											<th className='px-3 py-2 text-center text-xs font-medium' style={{ color: 'var(--color-danger)' }}>A</th>
											<th className='px-3 py-2 text-center text-xs font-medium' style={{ color: 'var(--color-warning)' }}>L</th>
											<th className='px-3 py-2 text-center text-xs font-medium' style={{ color: 'var(--color-info)' }}>E</th>
											<th className='px-3 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>%</th>
											<th className='px-3 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>Risk</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-[var(--color-border)]'>
										{summaryData.map((student) => (
											<tr key={student.studentId}>
												<td className='px-3 py-2 text-sm text-[var(--color-text-primary)]'>{student.name}</td>
												<td className='px-3 py-2 text-center text-sm text-[var(--color-text-secondary)]'>{student.recordedDays}</td>
												<td className='px-3 py-2 text-center text-sm' style={{ color: 'var(--color-success)' }}>{student.present}</td>
												<td className='px-3 py-2 text-center text-sm' style={{ color: 'var(--color-danger)' }}>{student.absent}</td>
												<td className='px-3 py-2 text-center text-sm' style={{ color: 'var(--color-warning)' }}>{student.late}</td>
												<td className='px-3 py-2 text-center text-sm' style={{ color: 'var(--color-info)' }}>{student.excused}</td>
												<td className='px-3 py-2 text-center text-sm text-[var(--color-text-primary)]'>
													{student.attendanceRate === null ? 'N/A' : `${student.attendanceRate}%`}
												</td>
												<td className='px-3 py-2 text-center text-sm'>
													<span
														className='inline-flex rounded-full border px-2 py-0.5 text-xs font-medium'
														style={getRiskPillClass(student.riskLevel)}
													>
														{toRiskLabel(student.riskLevel)}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
			</div>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() =>
					setToast({ isOpen: false, type: 'success', message: '' })
				}
			/>
		</div>
	);
}
