import { useState, useEffect, useCallback } from 'react';
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

export default function TeacherAttendance() {
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClass, setSelectedClass] = useState(null);
	const [students, setStudents] = useState([]);
	const [loadingRoster, setLoadingRoster] = useState(false);
	const [selectedDate, setSelectedDate] = useState(
		new Date().toISOString().split('T')[0],
	);
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

	// Fetch teacher's classes
	const fetchClasses = async () => {
		setLoading(true);
		try {
			const res = await getMyClasses();
			setClasses(res.data);
		} catch (error) {
			console.error('Failed to load classes:', error);
			setError('Failed to load classes');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchClasses();
	}, []);

	// When a class is selected, fetch its roster and current attendance for the selected date
	const fetchAttendanceForClass = async (classId, date) => {
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
		} finally {
			setLoadingRoster(false);
		}
	};

	const fetchMonthlySummary = useCallback(async () => {
		if (!selectedClass) return;
		setSummaryLoading(true);
		try {
			const response = await getClassAttendanceSummary(selectedClass.id, selectedMonth);
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
	}, [selectedClass, selectedMonth]);

	// When selectedClass or selectedMonth changes, fetch summary
	useEffect(() => {
		if (selectedClass) {
			fetchMonthlySummary();
		}
	}, [fetchMonthlySummary, selectedClass]);
	// When selectedClass or selectedDate changes, fetch attendance
	useEffect(() => {
		if (selectedClass) {
			fetchAttendanceForClass(selectedClass.id, selectedDate);
		}
	}, [selectedClass, selectedDate]);

	// Handle status change for a student
	const handleStatusChange = (studentId, newStatus) => {
		setAttendanceMap((prev) => ({ ...prev, [studentId]: newStatus }));
	};

	const getRiskPillClass = (riskLevel) => {
		switch (riskLevel) {
			case 'high':
				return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
			case 'medium':
				return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
			case 'low':
				return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
			default:
				return 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300';
		}
	};

	const toRiskLabel = (riskLevel) => {
		if (riskLevel === 'high') return 'High risk';
		if (riskLevel === 'medium') return 'Medium risk';
		if (riskLevel === 'low') return 'Low risk';
		return 'No data';
	};

	// Save all changes
	const handleSave = async () => {
		setSaving(true);
		const attendanceData = students.map((student) => ({
			studentId: student.student_id,
			status: attendanceMap[student.student_id] || 'present',
		}));
		try {
			await postAttendance(selectedClass.id, {
				date: selectedDate,
				attendance: attendanceData,
			});
			setToast({
				isOpen: true,
				type: 'success',
				message: 'Attendance saved successfully!',
			});
			setDateRecorded(true);
			fetchMonthlySummary();
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

	if (!selectedClass) {
		// Show class selection grid
		return (
			<div className='p-6'>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
					Student Attendance
				</h1>
				{error && <AlertBox message={error} />}
				{classes.length === 0 ? (
					<p className='text-[var(--color-text-muted)]'>
						You haven't created any classes yet. Please create a class first.
					</p>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{classes.map((cls) => (
							<div
								key={cls.id}
								onClick={() => setSelectedClass(cls)}
								className='cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow'
							>
								<h3 className='text-lg font-semibold text-[var(--color-text-primary)]'>
									{cls.class_name}
								</h3>
								{cls.subject && (
									<p className='text-sm text-[var(--color-text-secondary)] mt-1'>
										{cls.subject}
									</p>
								)}
								<div className='mt-4'>
									<span className='text-sm text-[var(--color-primary)]'>
										Mark Attendance →
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	// Attendance view for selected class
	return (
		<div className='p-6'>
			<div className='flex items-center justify-between mb-6'>
				<button
					onClick={() => setSelectedClass(null)}
					className='text-[var(--color-primary)] hover:underline flex items-center gap-1'
				>
					← Back to Classes
				</button>
				<div className='flex items-center gap-4'>
					<div className='relative'>
						<input
							type='date'
							value={selectedDate}
							onChange={(e) => setSelectedDate(e.target.value)}
							className='appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]'
						/>
						<Calendar
							className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]'
							size={16}
						/>
					</div>
					<button
						onClick={handleSave}
						disabled={saving || loadingRoster}
						className='inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors'
					>
						{saving ? <SpinnerIcon /> : <Save size={16} />}
						{saving ? 'Saving...' : 'Save Attendance'}
					</button>
				</div>
			</div>

			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-4'>
				{selectedClass.class_name} – Attendance
			</h1>
			<p className='text-sm text-[var(--color-text-muted)] mb-2'>
				Mark attendance for {selectedDate}
			</p>
			<p className='mb-6 text-xs'>
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${
						dateRecorded
							? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
							: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
					}`}
				>
					{dateRecorded ? 'Attendance already recorded for this date' : 'Attendance not recorded yet for this date'}
				</span>
			</p>

			{loadingRoster ? (
				<div className='flex justify-center py-8'>
					<SpinnerIcon />
				</div>
			) : students.length === 0 ? (
				<p className='text-[var(--color-text-muted)] text-center py-8'>
					No students enrolled in this class yet.
				</p>
			) : (
				<div className='overflow-x-auto'>
					<table className='min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden'>
						<thead className='bg-[var(--color-border)]/30'>
							<tr>
								<th className='px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider'>
									Student
								</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider'>
									Status
								</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-[var(--color-border)]'>
							{students.map((student) => (
								<tr key={student.student_id}>
									<td className='px-6 py-4 whitespace-nowrap'>
										<div className='flex items-center'>
											{student.profile_pic ? (
												<img
													src={student.profile_pic}
													alt={student.username}
													className='h-8 w-8 rounded-full object-cover'
												/>
											) : (
												<div className='h-8 w-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm font-medium'>
													{student.username.charAt(0).toUpperCase()}
												</div>
											)}
											<div className='ml-3'>
												<p className='text-sm font-medium text-[var(--color-text-primary)]'>
													{student.username}
												</p>
											</div>
										</div>
									</td>
									<td className='px-6 py-4 whitespace-nowrap'>
										<select
											value={attendanceMap[student.student_id] || 'present'}
											onChange={(e) =>
												handleStatusChange(student.student_id, e.target.value)
											}
											className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
										>
											<option value='present'>Present</option>
											<option value='absent'>Absent</option>
											<option value='late'>Late</option>
											<option value='excused'>Excused</option>
										</select>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<div className='mt-8'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>
						Monthly Summary
					</h2>
					<div className='relative'>
						<input
							type='month'
							value={selectedMonth}
							onChange={(e) => setSelectedMonth(e.target.value)}
							className='appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]'
						/>
					</div>
				</div>

				<div className='mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5'>
					<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2'>
						<p className='text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]'>Students</p>
						<p className='text-base font-semibold text-[var(--color-text-primary)]'>{summaryStats.totalStudents}</p>
					</div>
					<div className='rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20'>
						<p className='text-[10px] uppercase tracking-wide text-red-600 dark:text-red-300'>High Risk</p>
						<p className='text-base font-semibold text-red-700 dark:text-red-200'>{summaryStats.highRisk}</p>
					</div>
					<div className='rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/20'>
						<p className='text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300'>Medium Risk</p>
						<p className='text-base font-semibold text-amber-800 dark:text-amber-200'>{summaryStats.mediumRisk}</p>
					</div>
					<div className='rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-900/20'>
						<p className='text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300'>Low Risk</p>
						<p className='text-base font-semibold text-emerald-800 dark:text-emerald-200'>{summaryStats.lowRisk}</p>
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
					<p className='text-[var(--color-text-muted)] text-center py-4'>
						No attendance records for this month.
					</p>
				) : (
					<div className='overflow-x-auto'>
						<table className='min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden'>
							<thead className='bg-[var(--color-border)]/30'>
								<tr>
									<th className='px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>
										Student
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>
										Recorded Days
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-green-600'>
										Present
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-red-600'>
										Absent
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-yellow-600'>
										Late
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-blue-600'>
										Excused
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>
										Attendance %
									</th>
									<th className='px-4 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]'>
										Risk
									</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-[var(--color-border)]'>
								{summaryData.map((student) => (
									<tr key={student.studentId}>
										<td className='px-4 py-2 text-sm text-[var(--color-text-primary)]'>
											{student.name}
										</td>
										<td className='px-4 py-2 text-center text-sm text-[var(--color-text-secondary)]'>
											{student.recordedDays}
										</td>
										<td className='px-4 py-2 text-center text-sm text-green-600'>
											{student.present}
										</td>
										<td className='px-4 py-2 text-center text-sm text-red-600'>
											{student.absent}
										</td>
										<td className='px-4 py-2 text-center text-sm text-yellow-600'>
											{student.late}
										</td>
										<td className='px-4 py-2 text-center text-sm text-blue-600'>
											{student.excused}
										</td>
										<td className='px-4 py-2 text-center text-sm text-[var(--color-text-primary)]'>
											{student.attendanceRate === null ? 'N/A' : `${student.attendanceRate}%`}
										</td>
										<td className='px-4 py-2 text-center text-sm'>
											<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskPillClass(student.riskLevel)}`}>
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
			{/* Toast and confirm modal*/}
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
