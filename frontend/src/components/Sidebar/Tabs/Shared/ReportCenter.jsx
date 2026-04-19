import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw,
  FileText,
  AlertCircle,
  Upload,
  X,
  Calendar,
  BookOpen,
  User,
  UserCheck,
  Building2,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  Activity,
  Paperclip,
} from 'lucide-react';
import {
  createReport,
  getMyReports,
  getReportMeta,
  getReportTargets,
} from '../../../../api/api';
import { useAuth } from '../../../../context/useAuth';
import Toast from '../../../Toast';

const TYPE_META = {
  technical_issue: { label: 'Technical (Site)', icon: Activity },
  teacher_conduct: { label: 'Staff Concern', icon: User },
  schedule_issue: { label: 'Schedule', icon: Calendar },
  fees_issue: { label: 'Fees', icon: FileText },
  academic_issue: { label: 'Curriculum', icon: BookOpen },
  attendance_issue: { label: 'Attendance', icon: UserCheck },
  bullying_harassment: { label: 'Safety', icon: AlertTriangle },
  infrastructure_issue: { label: 'Facility', icon: Building2 },
  other: { label: 'General Institute', icon: FileText },
};

const KIND_META = {
  report: {
    label: 'Report',
    icon: FileText,
    className: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/25',
  },
  complaint: {
    label: 'Complaint',
    icon: AlertTriangle,
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/25',
  },
  suggestion: {
    label: 'Suggestion',
    icon: MessageSquare,
    className:
      'bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/25',
  },
};

const STATUS_META = {
  submitted: {
    label: 'Submitted',
    icon: Clock3,
    className:
      'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/25',
  },
  under_process: {
    label: 'Under Investigation',
    icon: Clock3,
    className:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    className:
      'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/25',
  },
  closed: {
    label: 'Closed',
    icon: CheckCircle2,
    className:
      'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/25',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25',
  },
};

const audienceMeta = [
  { label: 'Students', icon: GraduationCap },
  { label: 'Teachers', icon: UserCheck },
  { label: 'Parents', icon: Users },
];

function toLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTypeMeta(value) {
  const key = String(value || 'other').trim().toLowerCase();
  return TYPE_META[key] || { label: toLabel(key), icon: FileText };
}

function getKindMeta(value) {
  const key = String(value || 'report').trim().toLowerCase();
  return KIND_META[key] || KIND_META.report;
}

function getStatusMeta(value) {
  const key = String(value || 'submitted').trim().toLowerCase();
  return STATUS_META[key] || STATUS_META.submitted;
}

function formatShortDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

function controlClass(hasError) {
  return [
    'mt-2 block w-full rounded-xl border bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm',
    'text-[var(--color-text-primary)] shadow-sm outline-none transition-all duration-150',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
  ].join(' ');
}

export default function ReportCenter({
  presetKind = null,
  lockKind = false,
  defaultTargetRole = null,
  allowedTypes = null,
  heading = 'Central Reporting & Complaints',
  subheading = 'Submit site issues, staff concerns, and institute feedback in one place.',
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

  const syncSnapshotAndNotify = useCallback(
    (nextReports) => {
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
    },
    [openToast],
  );

  const loadMeta = useCallback(async () => {
    try {
      const response = await getReportMeta();
      const fetchedMeta = response.data || { kinds: [], types: [], statuses: [] };
      setMeta(fetchedMeta);
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

  const loadReports = useCallback(
    async ({ silent = false } = {}) => {
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
    },
    [openToast, syncSnapshotAndNotify],
  );

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

  const availableTypeOptions = useMemo(() => {
    const allTypes = Array.isArray(meta.types) ? meta.types : [];
    if (!Array.isArray(allowedTypes) || !allowedTypes.length) {
      return allTypes;
    }

    const allowedValues = new Set(
      allowedTypes.map((item) => String(item || '').trim().toLowerCase()),
    );
    const filtered = allTypes.filter((item) =>
      allowedValues.has(String(item.value || '').toLowerCase()),
    );
    return filtered.length ? filtered : allTypes;
  }, [allowedTypes, meta.types]);

  useEffect(() => {
    if (!availableTypeOptions.length) return;

    setForm((previous) => {
      const selectedType = String(previous.reportType || '').toLowerCase();
      const isSelectedTypeAvailable = availableTypeOptions.some(
        (item) => String(item.value || '').toLowerCase() === selectedType,
      );

      if (isSelectedTypeAvailable) {
        return previous;
      }

      return {
        ...previous,
        reportType: availableTypeOptions[0].value,
      };
    });
  }, [availableTypeOptions]);

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

  const panelHeading = useMemo(() => {
    if (String(heading || '').toLowerCase().includes('mizuka portal')) {
      return heading;
    }
    return `Mizuka Portal: ${heading}`;
  }, [heading]);

  const spotlightLine = useMemo(() => {
    const labels = availableTypeOptions
      .slice(0, 3)
      .map((item) => item.label?.trim())
      .filter(Boolean);
    if (!labels.length) {
      return `${toLabel(form.kind)} Hub`;
    }
    return `${toLabel(form.kind)}: ${labels.join(' • ')}`;
  }, [availableTypeOptions, form.kind]);

  const selectedTypeMeta = useMemo(() => getTypeMeta(form.reportType), [form.reportType]);
  const selectedKindMeta = useMemo(() => getKindMeta(form.kind), [form.kind]);

  const submissionLabel =
    submitLabel
    || (form.kind === 'complaint'
      ? 'Submit Complaint'
      : form.kind === 'suggestion'
        ? 'Submit Suggestion'
        : 'Submit Report');

  const reportSummary = useMemo(() => {
    return reports.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'resolved' || item.status === 'closed') {
          acc.resolved += 1;
        } else if (item.status === 'under_process') {
          acc.investigation += 1;
        } else if (item.status === 'rejected') {
          acc.rejected += 1;
        }
        return acc;
      },
      { total: 0, resolved: 0, investigation: 0, rejected: 0 },
    );
  }, [reports]);

  const SelectedTypeIcon = selectedTypeMeta.icon;
  const SelectedKindIcon = selectedKindMeta.icon;

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-14 h-72 w-72 rounded-full bg-[var(--color-primary)]/18 blur-3xl" />
        <div className="absolute right-[-90px] top-[24%] h-80 w-80 rounded-full bg-[var(--color-info)]/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <header className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-6 shadow-[var(--shadow-lg)] backdrop-blur-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-primary)]">
              {spotlightLine}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
              {panelHeading}
            </h1>
            <p className="mt-3 max-w-4xl text-sm text-[var(--color-text-muted)] sm:text-base">
              {subheading}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="order-2 xl:order-1 xl:col-span-7">
              <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 shadow-[var(--shadow-xl)] backdrop-blur-sm">
                <div className="border-b border-[var(--color-border)] px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                        My Submissions
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2.5 py-1 text-[var(--color-text-secondary)]">
                          Total: {reportSummary.total}
                        </span>
                        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-green-700 dark:text-green-300">
                          Resolved: {reportSummary.resolved}
                        </span>
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                          Under Review: {reportSummary.investigation}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      disabled={refreshing || loading}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={refreshing || loading ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  {loading ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-input-bg)]/60 p-8 text-center">
                      <div className="mx-auto inline-block h-9 w-9 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]">Loading submissions...</p>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-input-bg)]/50 p-8 text-center">
                      <FileText size={44} className="mx-auto text-[var(--color-text-muted)]" />
                      <p className="mt-3 text-base font-medium text-[var(--color-text-secondary)]">No submissions yet</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Create your first entry using the submission form.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => {
                        const reportTypeMeta = getTypeMeta(report.report_type);
                        const reportKindMeta = getKindMeta(report.kind);
                        const reportStatusMeta = getStatusMeta(report.status);
                        const ReportTypeIcon = reportTypeMeta.icon;
                        const ReportKindIcon = reportKindMeta.icon;
                        const ReportStatusIcon = reportStatusMeta.icon;

                        return (
                          <article
                            key={report.id}
                            className="group rounded-2xl border border-[var(--color-border)]/75 bg-[var(--color-input-bg)]/60 p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-md)] sm:p-5"
                          >
                            <div className="flex items-start gap-4">
                              <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-xs)]">
                                <ReportTypeIcon size={24} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="max-w-[520px] text-lg font-semibold leading-tight text-[var(--color-text-primary)]">
                                        {report.title}
                                      </h3>
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${reportStatusMeta.className}`}
                                      >
                                        <ReportStatusIcon size={12} />
                                        {reportStatusMeta.label}
                                      </span>
                                    </div>

                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${reportKindMeta.className}`}
                                      >
                                        <ReportKindIcon size={11} />
                                        {reportKindMeta.label}
                                      </span>
                                      <span className="text-[var(--color-text-muted)]">
                                        {typeMap.get(report.report_type) || reportTypeMeta.label}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                                    {formatShortDate(report.created_at)}
                                  </span>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {report.description}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
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
                                      className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                                    >
                                      <Paperclip size={12} />
                                      Attachment
                                    </a>
                                  )}
                                </div>

                                {report.admin_feedback && (
                                  <div className="mt-3 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                                      Feedback
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                      {report.admin_feedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="order-1 xl:order-2 xl:col-span-5">
              <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[var(--shadow-xl)] backdrop-blur-sm">
                <div className="border-b border-[var(--color-border)] px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                      New Submission
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      Students | Teachers | Parents
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {audienceMeta.map((audience) => {
                      const AudienceIcon = audience.icon;
                      return (
                        <div
                          key={audience.label}
                          className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-input-bg)]/75 px-2 py-2 text-center"
                        >
                          <AudienceIcon
                            size={18}
                            className="mx-auto text-[var(--color-primary)]"
                            aria-hidden="true"
                          />
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                            {audience.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Kind
                      </label>
                      {lockKind ? (
                        <div className="mt-2 flex h-[44px] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 text-sm font-medium text-[var(--color-text-primary)]">
                          <SelectedKindIcon size={16} className="text-[var(--color-primary)]" />
                          {toLabel(form.kind)}
                        </div>
                      ) : (
                        <select
                          value={form.kind}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              kind: event.target.value,
                              targetUserId: '',
                            }))
                          }
                          className={controlClass(false)}
                        >
                          {meta.kinds.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Type
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 mt-2 flex items-center text-[var(--color-text-muted)]">
                          <SelectedTypeIcon size={16} />
                        </span>
                        <select
                          value={form.reportType}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              reportType: event.target.value,
                            }))
                          }
                          className={`${controlClass(false)} pl-9`}
                        >
                          {availableTypeOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {form.kind === 'complaint' && (
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Complaint Target <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.targetUserId}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            targetUserId: event.target.value,
                          }))
                        }
                        className={controlClass(Boolean(formErrors.targetUserId))}
                      >
                        <option value="">Select target</option>
                        {targets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.username} ({toLabel(target.role)})
                          </option>
                        ))}
                      </select>
                      {formErrors.targetUserId && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle size={14} />
                          {formErrors.targetUserId}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Subject/Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                      className={controlClass(Boolean(formErrors.title))}
                      placeholder="Brief subject"
                    />
                    {formErrors.title && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={14} />
                        {formErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Detailed Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      className={`${controlClass(Boolean(formErrors.description))} resize-y`}
                      placeholder="Describe the issue in detail..."
                    />
                    {formErrors.description && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={14} />
                        {formErrors.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Attachments (optional)
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] shadow-sm transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/25">
                        <Upload size={17} aria-hidden="true" />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              attachment: event.target.files?.[0] || null,
                            }))
                          }
                        />
                      </label>

                      <div className="flex h-11 flex-1 items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-input-bg)]/55 px-3">
                        {form.attachment ? (
                          <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <Paperclip size={14} className="shrink-0" />
                            <span className="truncate">{form.attachment.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((previous) => ({
                                  ...previous,
                                  attachment: null,
                                }))
                              }
                              className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                              aria-label="Remove selected file"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">
                            Attach image or PDF (max 10MB)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background:
                        'linear-gradient(90deg, var(--color-primary) 0%, var(--color-info) 100%)',
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && <RefreshCw size={16} className="animate-spin" />}
                    {submitting ? 'Submitting...' : submissionLabel}
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
        onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
      />
    </section>
  );
}
