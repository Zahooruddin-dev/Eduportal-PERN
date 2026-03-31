import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
	createReport,
	getMyReports,
	getReportMeta,
	getReportTargets,
} from '../../../../api/api';
import { useAuth } from '../../../../context/AuthContext';
import Toast from '../../../Toast';

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

function toLabel(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReportCenter() {
	const { user } = useAuth();
	const [meta, setMeta] = useState({ kinds: [], types: [], statuses: [] });
	const [targets, setTargets] = useState([]);
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const reportSnapshotRef = useRef(new Map());
	const hasInitialSnapshotRef = useRef(false);
	const [form, setForm] = useState({
		kind: 'report',
		reportType: 'technical_issue',
		title: '',
		description: '',
		targetUserId: '',
		attachment: null,
	});
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const syncSnapshotAndNotify = useCallback((nextReports) => {
		const previous = reportSnapshotRef.current;
		const next = new Map();
		const changedReports = [];

		nextReports.forEach((item) => {
			const signature = `${item.status}|${item.admin_feedback || ''}|${item.updated_at || ''}`;
			next.set(item.id, signature);
			if (previous.has(item.id) && previous.get(item.id) !== signature) {
				changedReports.push(item);
			}
		});

		reportSnapshotRef.current = next;

		if (!hasInitialSnapshotRef.current) {
			hasInitialSnapshotRef.current = true;
			return;
		}

		if (!changedReports.length) return;

		if (changedReports.length === 1) {
			const report = changedReports[0];
			openToast('info', `Update received: ${report.title} is now ${toLabel(report.status)}.`);
			return;
		}

		openToast('info', `${changedReports.length} report updates received.`);
	}, [openToast]);

	const loadMeta = useCallback(async () => {
		try {
			const response = await getReportMeta();
			const fetchedMeta = response.data || { kinds: [], types: [], statuses: [] };
			setMeta(fetchedMeta);
			setForm((previous) => ({
				...previous,
				reportType:
					fetchedMeta.types?.[0]?.value || previous.reportType || 'technical_issue',
			}));
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load report types.');
		}
	}, [openToast]);

	const loadTargets = useCallback(async () => {
		const defaultRoleFilter = user?.role === 'student' ? 'teacher' : 'all';
		try {
			const response = await getReportTargets({ role: defaultRoleFilter });
			setTargets(response.data || []);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load complaint targets.');
		}
	}, [openToast, user?.role]);

	const loadReports = useCallback(async ({ silent = false } = {}) => {
		if (!silent) {
			setLoading(true);
		}
		try {
			const response = await getMyReports();
			const nextReports = response.data || [];
			setReports(nextReports);
			syncSnapshotAndNotify(nextReports);
		} catch (error) {
			if (!silent) {
				openToast('error', error?.response?.data?.message || 'Failed to load your reports.');
			}
		} finally {
			if (!silent) {
				setLoading(false);
			}
		}
	}, [openToast, syncSnapshotAndNotify]);

	useEffect(() => {
		loadMeta();
		loadTargets();
		loadReports();
	}, [loadMeta, loadReports, loadTargets]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (document.visibilityState === 'hidden') {
				return;
			}
			loadReports({ silent: true });
		}, 10000);

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				loadReports({ silent: true });
			}
		};

		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.clearInterval(intervalId);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [loadReports]);

	const typeMap = useMemo(() => {
		const map = new Map();
		meta.types.forEach((item) => map.set(item.value, item.label));
		return map;
	}, [meta.types]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!form.title.trim() || !form.description.trim()) {
			openToast('warning', 'Title and description are required.');
			return;
		}
		if (form.kind === 'complaint' && !form.targetUserId) {
			openToast('warning', 'Select a complaint target or switch to report.');
			return;
		}

		setSubmitting(true);
		try {
			const payload = new FormData();
			payload.append('kind', form.kind);
			payload.append('reportType', form.reportType);
			payload.append('title', form.title.trim());
			payload.append('description', form.description.trim());
			if (form.targetUserId) {
				payload.append('targetUserId', form.targetUserId);
			}
			if (form.attachment) {
				payload.append('attachment', form.attachment);
			}

			await createReport(payload);
			setForm((previous) => ({
				...previous,
				title: '',
				description: '',
				targetUserId: '',
				attachment: null,
			}));
			openToast('success', 'Submitted successfully.');
			await loadReports();
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to submit report.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleManualRefresh = useCallback(async () => {
		if (refreshing) return;
		setRefreshing(true);
		await loadReports({ silent: true });
		setRefreshing(false);
	}, [loadReports, refreshing]);

	return (
		<div className='p-4 sm:p-6 lg:p-8 space-y-6'>
			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Reports and Complaints</h1>
				<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
					Submit technical or academic issues, and complaints. Admins can review and update status with feedback.
				</p>
				<p className='mt-1 text-xs text-[var(--color-text-muted)]'>
					Auto-refresh is active and status updates appear automatically.
				</p>
			</div>

			<form onSubmit={handleSubmit} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
				<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>New submission</h2>
				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Kind</label>
						<select
							value={form.kind}
							onChange={(event) => setForm((previous) => ({ ...previous, kind: event.target.value, targetUserId: '' }))}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
						>
							{meta.kinds.map((item) => (
								<option key={item.value} value={item.value}>{item.label}</option>
							))}
						</select>
					</div>
					<div>
						<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Type</label>
						<select
							value={form.reportType}
							onChange={(event) => setForm((previous) => ({ ...previous, reportType: event.target.value }))}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
						>
							{meta.types.map((item) => (
								<option key={item.value} value={item.value}>{item.label}</option>
							))}
						</select>
					</div>
				</div>

				{form.kind === 'complaint' && (
					<div>
						<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Complaint target</label>
						<select
							value={form.targetUserId}
							onChange={(event) => setForm((previous) => ({ ...previous, targetUserId: event.target.value }))}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
						>
							<option value=''>Select target</option>
							{targets.map((target) => (
								<option key={target.id} value={target.id}>
									{target.username} ({toLabel(target.role)})
								</option>
							))}
						</select>
					</div>
				)}

				<div>
					<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Title</label>
					<input
						value={form.title}
						onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
						placeholder='Brief title'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Description</label>
					<textarea
						rows={4}
						value={form.description}
						onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
						placeholder='Share full details'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>Attachment</label>
					<input
						type='file'
						accept='image/*,.pdf'
						onChange={(event) => setForm((previous) => ({ ...previous, attachment: event.target.files?.[0] || null }))}
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
					/>
					<p className='mt-1 text-xs text-[var(--color-text-muted)]'>Attach screenshot or PDF evidence if needed.</p>
				</div>

				<button
					type='submit'
					disabled={submitting}
					className='w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
				>
					{submitting ? 'Submitting...' : 'Submit'}
				</button>
			</form>

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
				<div className='flex items-center justify-between gap-3'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>My submissions</h2>
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
				{loading ? (
					<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>Loading...</div>
				) : reports.length ? (
					<div className='space-y-3'>
						{reports.map((report) => (
							<div key={report.id} className='rounded-xl border border-[var(--color-border)] p-4'>
								<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
									<div>
										<p className='text-sm font-semibold text-[var(--color-text-primary)]'>{report.title}</p>
										<p className='text-xs text-[var(--color-text-muted)]'>
											{toLabel(report.kind)} • {typeMap.get(report.report_type) || toLabel(report.report_type)}
										</p>
									</div>
									<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(report.status)}`}>
										{toLabel(report.status)}
									</span>
								</div>
								<p className='mt-2 text-sm text-[var(--color-text-secondary)]'>{report.description}</p>
								<div className='mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]'>
									<span>Created: {new Date(report.created_at).toLocaleString()}</span>
									{report.target_username && (
										<span>Target: {report.target_username} ({toLabel(report.target_role)})</span>
									)}
									{report.attachment_url && (
										<a href={report.attachment_url} target='_blank' rel='noreferrer' className='text-[var(--color-primary)] hover:underline'>
											View attachment
										</a>
									)}
								</div>
								{report.admin_feedback && (
									<div className='mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-secondary)]'>
										<span className='font-medium text-[var(--color-text-primary)]'>Admin feedback:</span> {report.admin_feedback}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>No reports yet.</div>
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
