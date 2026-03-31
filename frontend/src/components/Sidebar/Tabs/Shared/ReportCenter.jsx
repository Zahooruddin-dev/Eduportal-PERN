import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, FileText, AlertCircle } from 'lucide-react';
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
		return 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/20';
	}
	if (status === 'rejected') {
		return 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20';
	}
	if (status === 'under_process') {
		return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20';
	}
	return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20';
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
	const [formErrors, setFormErrors] = useState({});
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

	const validateForm = () => {
		const errors = {};
		if (!form.title.trim()) errors.title = 'Title is required';
		if (!form.description.trim()) errors.description = 'Description is required';
		if (form.kind === 'complaint' && !form.targetUserId) {
			errors.targetUserId = 'Please select a complaint target';
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!validateForm()) {
			openToast('warning', 'Please fill in all required fields.');
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
			setFormErrors({});
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
		<div className="p-4 sm:p-6 lg:p-8 space-y-6">
			{/* Header */}
			<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 transition-colors">
				<h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
					Reports & Complaints
				</h1>
				<p className="mt-1 text-sm text-[var(--color-text-muted)]">
					Submit technical or academic issues, and complaints. Admins can review and update
					status with feedback.
				</p>
				<p className="mt-1 text-xs text-[var(--color-text-muted)]">
					Auto-refresh is active — status updates appear automatically.
				</p>
			</div>

			{/* Submission Form */}
			<form
				onSubmit={handleSubmit}
				className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4 transition-colors"
			>
				<h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
					New submission
				</h2>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
							Kind
						</label>
						<select
							value={form.kind}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, kind: event.target.value, targetUserId: '' }))
							}
							className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
						>
							{meta.kinds.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
							Type
						</label>
						<select
							value={form.reportType}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, reportType: event.target.value }))
							}
							className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
						>
							{meta.types.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{form.kind === 'complaint' && (
					<div>
						<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
							Complaint target <span className="text-red-500">*</span>
						</label>
						<select
							value={form.targetUserId}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, targetUserId: event.target.value }))
							}
							aria-required="true"
							className={`w-full rounded-xl border ${
								formErrors.targetUserId
									? 'border-red-500 focus:ring-red-500/30'
									: 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30'
							} bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 focus:border-transparent`}
						>
							<option value="">Select target</option>
							{targets.map((target) => (
								<option key={target.id} value={target.id}>
									{target.username} ({toLabel(target.role)})
								</option>
							))}
						</select>
						{formErrors.targetUserId && (
							<p className="mt-1 text-xs text-red-500 flex items-center gap-1">
								<AlertCircle size={12} /> {formErrors.targetUserId}
							</p>
						)}
					</div>
				)}

				<div>
					<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
						Title <span className="text-red-500">*</span>
					</label>
					<input
						value={form.title}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, title: event.target.value }))
						}
						aria-required="true"
						placeholder="Brief title"
						className={`w-full rounded-xl border ${
							formErrors.title
								? 'border-red-500 focus:ring-red-500/30'
								: 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30'
						} bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 focus:border-transparent`}
					/>
					{formErrors.title && (
						<p className="mt-1 text-xs text-red-500 flex items-center gap-1">
							<AlertCircle size={12} /> {formErrors.title}
						</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
						Description <span className="text-red-500">*</span>
					</label>
					<textarea
						rows={4}
						value={form.description}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, description: event.target.value }))
						}
						aria-required="true"
						placeholder="Share full details"
						className={`w-full rounded-xl border ${
							formErrors.description
								? 'border-red-500 focus:ring-red-500/30'
								: 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30'
						} bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 focus:border-transparent`}
					/>
					{formErrors.description && (
						<p className="mt-1 text-xs text-red-500 flex items-center gap-1">
							<AlertCircle size={12} /> {formErrors.description}
						</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
						Attachment (optional)
					</label>
					<input
						type="file"
						accept="image/*,.pdf"
						onChange={(event) =>
							setForm((prev) => ({ ...prev, attachment: event.target.files?.[0] || null }))
						}
						className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:outline-none"
					/>
					<p className="mt-1 text-xs text-[var(--color-text-muted)]">
						Screenshot or PDF (max 10MB)
					</p>
				</div>

				<button
					type="submit"
					disabled={submitting}
					className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)]"
				>
					{submitting ? 'Submitting...' : 'Submit'}
				</button>
			</form>

			{/* Reports List */}
			<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4 transition-colors">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
						My submissions
					</h2>
					<button
						type="button"
						onClick={handleManualRefresh}
						disabled={refreshing || loading}
						aria-label="Refresh reports"
						className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-border)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100"
					>
						<RefreshCw
							size={14}
							className={`${refreshing || loading ? 'animate-spin' : ''} transition-transform`}
						/>
						<span className="hidden sm:inline">{refreshing || loading ? 'Refreshing' : 'Refresh'}</span>
						<span className="sm:hidden">{refreshing || loading ? '↻' : '↻'}</span>
					</button>
				</div>

				{loading ? (
					<div className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
						<RefreshCw size={24} className="mx-auto mb-2 animate-spin text-[var(--color-primary)]" />
						Loading reports...
					</div>
				) : reports.length ? (
					<div className="space-y-3" aria-live="polite">
						{reports.map((report) => (
							<div
								key={report.id}
								className="group rounded-xl border border-[var(--color-border)] p-4 transition-all hover:shadow-md hover:border-[var(--color-primary)]/30"
							>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--color-text-primary)]">
											{report.title}
										</p>
										<p className="text-xs text-[var(--color-text-muted)]">
											{toLabel(report.kind)} •{' '}
											{typeMap.get(report.report_type) || toLabel(report.report_type)}
										</p>
									</div>
									<span
										className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
											report.status
										)}`}
									>
										{toLabel(report.status)}
									</span>
								</div>
								<p className="mt-2 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
									{report.description}
								</p>
								<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
									<span>Created: {new Date(report.created_at).toLocaleString()}</span>
									{report.target_username && (
										<span>
											Target: {report.target_username} ({toLabel(report.target_role)})
										</span>
									)}
									{report.attachment_url && (
										<a
											href={report.attachment_url}
											target="_blank"
											rel="noreferrer"
											className="text-[var(--color-primary)] hover:underline"
										>
											<FileText size={12} className="inline mr-1" />
											View attachment
										</a>
									)}
								</div>
								{report.admin_feedback && (
									<div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
										<span className="font-medium text-[var(--color-text-primary)]">
											Admin feedback:
										</span>{' '}
										{report.admin_feedback}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="rounded-xl border border-[var(--color-border)] p-8 text-center">
						<FileText size={32} className="mx-auto text-[var(--color-text-muted)] mb-2" />
						<p className="text-sm text-[var(--color-text-secondary)]">No reports yet</p>
						<p className="text-xs text-[var(--color-text-muted)] mt-1">
							Use the form above to submit your first report or complaint.
						</p>
					</div>
				)}
			</div>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
			/>
		</div>
	);
}