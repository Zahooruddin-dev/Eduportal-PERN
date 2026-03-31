import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, FileText, AlertCircle, Upload, X } from 'lucide-react';
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
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
  }
  if (status === 'rejected') {
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
  }
  if (status === 'under_process') {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  }
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
}

function toLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReportCenter({
  presetKind = null,
  lockKind = false,
  defaultTargetRole = null,
  heading = 'Reports & Complaints',
  subheading = 'Submit issues or complaints and track their status in real time.',
  submitLabel = '',
}) {
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
    kind: presetKind || 'report',
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
    const defaultRoleFilter =
      defaultTargetRole
      || ((user?.role === 'student' || user?.role === 'parent') ? 'teacher' : 'all');
    try {
      const response = await getReportTargets({ role: defaultRoleFilter });
      setTargets(response.data || []);
    } catch (error) {
      openToast('error', error?.response?.data?.message || 'Failed to load complaint targets.');
    }
  }, [defaultTargetRole, openToast, user?.role]);

  useEffect(() => {
    if (!presetKind) return;
    setForm((previous) => ({
      ...previous,
      kind: presetKind,
      targetUserId: presetKind === 'complaint' ? previous.targetUserId : '',
    }));
  }, [presetKind]);

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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
              {heading}
            </h1>
            <p className="mt-2 text-lg text-[var(--color-text-muted)]">
              {subheading}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                      My Submissions
                    </h2>
                    <button
                      onClick={handleManualRefresh}
                      disabled={refreshing || loading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-input-bg)] rounded-lg hover:bg-[var(--color-border)]/40 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={refreshing || loading ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"></div>
                      <p className="mt-2 text-[var(--color-text-muted)]">Loading reports...</p>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText size={48} className="mx-auto text-[var(--color-text-muted)]" />
                      <p className="mt-2 text-[var(--color-text-secondary)]">No reports yet</p>
                      <p className="text-sm text-[var(--color-text-muted)]">Submit your first report using the form.</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="p-6 hover:bg-[var(--color-border)]/20 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                                {report.title}
                              </h3>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(report.status)}`}>
                                {toLabel(report.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                              {toLabel(report.kind)} • {typeMap.get(report.report_type) || toLabel(report.report_type)}
                            </p>
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="mt-3 text-[var(--color-text-secondary)] whitespace-pre-wrap">
                          {report.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          {report.target_username && (
                            <span className="text-[var(--color-text-muted)]">
                              Target: {report.target_username} ({toLabel(report.target_role)})
                            </span>
                          )}
                          {report.attachment_url && (
                            <a
                              href={report.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                            >
                              <FileText size={14} />
                              Attachment
                            </a>
                          )}
                        </div>
                        {report.admin_feedback && (
                          <div className="mt-4 p-3 bg-[var(--color-input-bg)] rounded-lg">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">Admin feedback:</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{report.admin_feedback}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)]">
                <div className="px-6 py-5 border-b border-[var(--color-border)]">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    New Submission
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                        Kind
                      </label>
                      {lockKind ? (
                        <div className='mt-1 flex h-[42px] items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm font-medium text-[var(--color-text-primary)]'>
                          {toLabel(form.kind)}
                        </div>
                      ) : (
                        <select
                          value={form.kind}
                          onChange={(e) => setForm(prev => ({ ...prev, kind: e.target.value, targetUserId: '' }))}
                          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        >
                          {meta.kinds.map(item => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                        Type
                      </label>
                      <select
                        value={form.reportType}
                        onChange={(e) => setForm(prev => ({ ...prev, reportType: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      >
                        {meta.types.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {form.kind === 'complaint' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                        Complaint Target <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.targetUserId}
                        onChange={(e) => setForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        className={`mt-1 block w-full rounded-lg border ${formErrors.targetUserId ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-input-bg)] px-3 py-2 text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]`}
                      >
                        <option value="">Select target</option>
                        {targets.map(target => (
                          <option key={target.id} value={target.id}>
                            {target.username} ({toLabel(target.role)})
                          </option>
                        ))}
                      </select>
                      {formErrors.targetUserId && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle size={14} /> {formErrors.targetUserId}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      className={`mt-1 block w-full rounded-lg border ${formErrors.title ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-input-bg)] px-3 py-2 text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]`}
                      placeholder="Brief title"
                    />
                    {formErrors.title && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle size={14} /> {formErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className={`mt-1 block w-full rounded-lg border ${formErrors.description ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-input-bg)] px-3 py-2 text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]`}
                      placeholder="Provide details..."
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle size={14} /> {formErrors.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Attachment (optional)
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg shadow-sm text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-input-bg)] hover:bg-[var(--color-border)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">
                        <Upload size={16} />
                        Choose file
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setForm(prev => ({ ...prev, attachment: e.target.files?.[0] || null }))}
                        />
                      </label>
                      {form.attachment && (
                        <span className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                          {form.attachment.name}
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, attachment: null }))}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Images or PDF, max 10MB
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting
                      ? 'Submitting...'
                      : (submitLabel || (form.kind === 'complaint'
                        ? 'Submit Complaint'
                        : form.kind === 'suggestion'
                          ? 'Submit Suggestion'
                          : 'Submit Report'))}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}