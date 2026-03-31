import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
	getInstituteReports,
	getReportMeta,
	updateInstituteReportStatus,
} from '../../../../../api/api';
import Toast from '../../../../Toast';

function toLabel(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
	if (status === 'resolved' || status === 'closed') {
		return 'bg-green-500/10 text-green-600 border border-green-500/20';
	}
	if (status === 'rejected') {
		return 'bg-red-500/10 text-red-600 border border-red-500/20';
	}
	if (status === 'under_process') {
		return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
	}
	return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
}

export default function AdminReports() {
	const [meta, setMeta] = useState({ kinds: [], types: [], statuses: [] });
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [savingById, setSavingById] = useState({});
	const [statusById, setStatusById] = useState({});
	const [feedbackById, setFeedbackById] = useState({});
	const [filters, setFilters] = useState({
		status: 'all',
		kind: 'all',
		reportType: 'all',
		reporterRole: 'all',
		search: '',
	});
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const loadMeta = useCallback(async () => {
		try {
			const response = await getReportMeta();
			setMeta(response.data || { kinds: [], types: [], statuses: [] });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load report metadata.');
		}
	}, [openToast]);

	const loadReports = useCallback(async (currentFilters = filters, options = {}) => {
		const { silent = false } = options;
		if (!silent) {
			setLoading(true);
		}
		try {
			const response = await getInstituteReports(currentFilters);
			const list = response.data || [];
			setReports(list);
			const statusMap = {};
			const feedbackMap = {};
			list.forEach((item) => {
				statusMap[item.id] = item.status;
				feedbackMap[item.id] = item.admin_feedback || '';
			});
			setStatusById(statusMap);
			setFeedbackById(feedbackMap);
		} catch (error) {
			if (!silent) {
				openToast('error', error?.response?.data?.message || 'Failed to load institute reports.');
			}
		} finally {
			if (!silent) {
				setLoading(false);
			}
		}
	}, [filters, openToast]);

	useEffect(() => {
		loadMeta();
		loadReports({
			status: 'all',
			kind: 'all',
			reportType: 'all',
			reporterRole: 'all',
			search: '',
		});
	}, [loadMeta, loadReports]);

	const summary = useMemo(() => {
		const stats = {
			total: reports.length,
			submitted: 0,
			under_process: 0,
			resolved: 0,
			rejected: 0,
			closed: 0,
		};
		reports.forEach((item) => {
			if (stats[item.status] !== undefined) {
				stats[item.status] += 1;
			}
		});
		return stats;
	}, [reports]);

	const handleApplyFilters = () => {
		loadReports(filters);
	};

	const handleManualRefresh = useCallback(async () => {
		if (refreshing) return;
		setRefreshing(true);
		await loadReports(filters, { silent: true });
		setRefreshing(false);
	}, [filters, loadReports, refreshing]);

	const handleUpdateStatus = async (reportId) => {
		const status = statusById[reportId];
		if (!status) {
			openToast('warning', 'Select a valid status.');
			return;
		}
		setSavingById((previous) => ({ ...previous, [reportId]: true }));
		try {
			await updateInstituteReportStatus(reportId, {
				status,
				adminFeedback: feedbackById[reportId] || '',
			});
			openToast('success', 'Report status updated.');
			await loadReports(filters);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to update report status.');
		} finally {
			setSavingById((previous) => ({ ...previous, [reportId]: false }));
		}
	};

	return (
		<div className='p-4 sm:p-6 lg:p-8 space-y-6'>
			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Reports</h1>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>Review reports and complaints from students, teachers, and admins in your institute.</p>
					</div>
					<button
						type='button'
						onClick={handleManualRefresh}
						disabled={refreshing || loading}
						className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
					>
						<RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
						{refreshing || loading ? 'Refreshing' : 'Refresh'}
					</button>
				</div>
				<div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Total</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.total}</p></div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Submitted</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.submitted}</p></div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Under process</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.under_process}</p></div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Resolved</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.resolved}</p></div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Rejected</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.rejected}</p></div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'><p className='text-xs text-[var(--color-text-muted)]'>Closed</p><p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.closed}</p></div>
				</div>
			</div>

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
				<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-5'>
					<select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]'>
						<option value='all'>All statuses</option>
						{meta.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
					</select>
					<select value={filters.kind} onChange={(event) => setFilters((prev) => ({ ...prev, kind: event.target.value }))} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]'>
						<option value='all'>All kinds</option>
						{meta.kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
					</select>
					<select value={filters.reportType} onChange={(event) => setFilters((prev) => ({ ...prev, reportType: event.target.value }))} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]'>
						<option value='all'>All types</option>
						{meta.types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
					</select>
					<select value={filters.reporterRole} onChange={(event) => setFilters((prev) => ({ ...prev, reporterRole: event.target.value }))} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]'>
						<option value='all'>All reporters</option>
						<option value='student'>Students</option>
						<option value='teacher'>Teachers</option>
						<option value='admin'>Admins</option>
						<option value='parent'>Parents</option>
					</select>
					<input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder='Search text/user' className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]' />
				</div>
				<button type='button' onClick={handleApplyFilters} className='mt-3 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'>Apply filters</button>
			</div>

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-3'>
				{loading ? (
					<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>Loading...</div>
				) : reports.length ? (
					reports.map((report) => (
						<div key={report.id} className='rounded-xl border border-[var(--color-border)] p-4'>
							<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
								<div>
									<p className='text-sm font-semibold text-[var(--color-text-primary)]'>{report.title}</p>
									<p className='text-xs text-[var(--color-text-muted)]'>
										{toLabel(report.kind)} • {toLabel(report.report_type)} • Reporter: {report.reporter_username} ({toLabel(report.reporter_role)})
									</p>
								</div>
								<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(report.status)}`}>
									{toLabel(report.status)}
								</span>
							</div>
							<p className='mt-2 text-sm text-[var(--color-text-secondary)]'>{report.description}</p>
							<div className='mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]'>
								<span>Created: {new Date(report.created_at).toLocaleString()}</span>
								{report.target_username && <span>Target: {report.target_username} ({toLabel(report.target_role)})</span>}
								{report.attachment_url && <a href={report.attachment_url} target='_blank' rel='noreferrer' className='text-[var(--color-primary)] hover:underline'>View attachment</a>}
							</div>
							<div className='mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto]'>
								<select value={statusById[report.id] || report.status} onChange={(event) => setStatusById((prev) => ({ ...prev, [report.id]: event.target.value }))} className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'>
									{meta.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
								</select>
								<textarea rows={2} value={feedbackById[report.id] || ''} onChange={(event) => setFeedbackById((prev) => ({ ...prev, [report.id]: event.target.value }))} placeholder='Admin feedback visible to reporter' className='rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]' />
								<button type='button' onClick={() => handleUpdateStatus(report.id)} disabled={savingById[report.id]} className='rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'>
									{savingById[report.id] ? 'Saving...' : 'Update'}
								</button>
							</div>
							{report.updated_by_admin_username && (
								<p className='mt-2 text-xs text-[var(--color-text-muted)]'>Last updated by {report.updated_by_admin_username} on {new Date(report.updated_at).toLocaleString()}</p>
							)}
						</div>
					))
				) : (
					<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>No reports found for selected filters.</div>
				)}
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
