import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import {
	createAcademicException,
	createAcademicTerm,
	deleteAcademicException,
	deleteAcademicTerm,
	listAcademicExceptions,
	listAcademicTerms,
	listInstituteClasses,
	updateAcademicException,
	updateAcademicTerm,
} from '../../../../../api/adminApi';
import Toast from '../../../../Toast';

const EXCEPTION_CATEGORIES = [
	{ value: 'holiday', label: 'Holiday' },
	{ value: 'closure', label: 'Closure' },
	{ value: 'event', label: 'Event' },
	{ value: 'exam', label: 'Exam' },
	{ value: 'other', label: 'Other' },
];

function formatDate(value) {
	if (!value) return '-';
	const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return '-';
	return parsed.toLocaleDateString();
}

export default function AdminAcademicCalendar() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [terms, setTerms] = useState([]);
	const [exceptions, setExceptions] = useState([]);
	const [classes, setClasses] = useState([]);
	const [termSubmitting, setTermSubmitting] = useState(false);
	const [exceptionSubmitting, setExceptionSubmitting] = useState(false);
	const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
	const [termForm, setTermForm] = useState({
		label: '',
		startsOn: '',
		endsOn: '',
		isActive: true,
	});
	const [exceptionForm, setExceptionForm] = useState({
		title: '',
		description: '',
		category: 'holiday',
		startsOn: '',
		endsOn: '',
		blocksInstruction: true,
		classId: '',
		termId: '',
	});

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const loadData = useCallback(async ({ refresh = false } = {}) => {
		if (refresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}

		try {
			const [termsResponse, exceptionsResponse, classesResponse] = await Promise.all([
				listAcademicTerms(),
				listAcademicExceptions(),
				listInstituteClasses(),
			]);
			setTerms(Array.isArray(termsResponse.data) ? termsResponse.data : []);
			setExceptions(Array.isArray(exceptionsResponse.data) ? exceptionsResponse.data : []);
			setClasses(Array.isArray(classesResponse.data) ? classesResponse.data : []);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load academic calendar settings.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [openToast]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const activeTerm = useMemo(
		() => terms.find((term) => Boolean(term.is_active)) || null,
		[terms],
	);

	const onCreateTerm = async (event) => {
		event.preventDefault();
		if (!termForm.label.trim() || !termForm.startsOn || !termForm.endsOn) {
			openToast('error', 'Term label, start date, and end date are required.');
			return;
		}
		if (termForm.startsOn > termForm.endsOn) {
			openToast('error', 'Term start date must be before or equal to end date.');
			return;
		}

		setTermSubmitting(true);
		try {
			await createAcademicTerm({
				label: termForm.label.trim(),
				startsOn: termForm.startsOn,
				endsOn: termForm.endsOn,
				isActive: Boolean(termForm.isActive),
			});
			setTermForm({ label: '', startsOn: '', endsOn: '', isActive: true });
			openToast('success', 'Academic term created.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to create academic term.');
		} finally {
			setTermSubmitting(false);
		}
	};

	const onSetActiveTerm = async (termId) => {
		try {
			await updateAcademicTerm(termId, { isActive: true });
			openToast('success', 'Active term updated.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to activate term.');
		}
	};

	const onDeleteTerm = async (termId) => {
		try {
			await deleteAcademicTerm(termId);
			openToast('success', 'Academic term deleted.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to delete term.');
		}
	};

	const onCreateException = async (event) => {
		event.preventDefault();
		if (!exceptionForm.title.trim() || !exceptionForm.startsOn || !exceptionForm.endsOn) {
			openToast('error', 'Exception title, start date, and end date are required.');
			return;
		}
		if (exceptionForm.startsOn > exceptionForm.endsOn) {
			openToast('error', 'Exception start date must be before or equal to end date.');
			return;
		}

		setExceptionSubmitting(true);
		try {
			await createAcademicException({
				title: exceptionForm.title.trim(),
				description: exceptionForm.description.trim(),
				category: exceptionForm.category,
				startsOn: exceptionForm.startsOn,
				endsOn: exceptionForm.endsOn,
				blocksInstruction: Boolean(exceptionForm.blocksInstruction),
				classId: exceptionForm.classId || null,
				termId: exceptionForm.termId || null,
			});
			setExceptionForm({
				title: '',
				description: '',
				category: 'holiday',
				startsOn: '',
				endsOn: '',
				blocksInstruction: true,
				classId: '',
				termId: '',
			});
			openToast('success', 'Calendar exception created.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to create calendar exception.');
		} finally {
			setExceptionSubmitting(false);
		}
	};

	const onToggleBlocksInstruction = async (exceptionItem) => {
		try {
			await updateAcademicException(exceptionItem.id, {
				blocksInstruction: !exceptionItem.blocks_instruction,
			});
			openToast('success', 'Exception rule updated.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to update exception rule.');
		}
	};

	const onDeleteException = async (exceptionId) => {
		try {
			await deleteAcademicException(exceptionId);
			openToast('success', 'Calendar exception deleted.');
			await loadData({ refresh: true });
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to delete exception.');
		}
	};

	if (loading) {
		return (
			<div className='p-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]'>
					Loading academic calendar...
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[var(--color-bg)] p-4 sm:p-6 lg:p-8'>
			<div className='mx-auto max-w-7xl space-y-6'>
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<div>
							<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>Academic Calendar Controls</h1>
							<p className='mt-1 text-sm text-[var(--color-text-muted)]'>Manage institute terms and schedule exceptions used by calendar subscriptions.</p>
						</div>
						<button
							type='button'
							onClick={() => loadData({ refresh: true })}
							disabled={refreshing}
							className='inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 disabled:opacity-60'
						>
							<RefreshCcw size={15} />
							{refreshing ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>

					<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Active Term</p>
							<p className='mt-1 text-sm font-semibold text-[var(--color-text-primary)]'>
								{activeTerm?.label || 'Not set'}
							</p>
						</div>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Terms</p>
							<p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{terms.length}</p>
						</div>
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
							<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Exceptions</p>
							<p className='mt-1 text-2xl font-semibold text-[var(--color-text-primary)]'>{exceptions.length}</p>
						</div>
					</div>
				</div>

				<div className='grid gap-6 xl:grid-cols-2'>
					<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Add Academic Term</h2>
						<form onSubmit={onCreateTerm} className='mt-4 space-y-3'>
							<input
								type='text'
								value={termForm.label}
								onChange={(event) => setTermForm((current) => ({ ...current, label: event.target.value }))}
								placeholder='Term label'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							/>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<input
									type='date'
									value={termForm.startsOn}
									onChange={(event) => setTermForm((current) => ({ ...current, startsOn: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								/>
								<input
									type='date'
									value={termForm.endsOn}
									onChange={(event) => setTermForm((current) => ({ ...current, endsOn: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								/>
							</div>
							<label className='inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]'>
								<input
									type='checkbox'
									checked={termForm.isActive}
									onChange={(event) => setTermForm((current) => ({ ...current, isActive: event.target.checked }))}
								/>
								Set as active term
							</label>
							<button
								type='submit'
								disabled={termSubmitting}
								className='inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
							>
								<Plus size={15} />
								{termSubmitting ? 'Saving...' : 'Create Term'}
							</button>
						</form>
					</section>

					<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Add Calendar Exception</h2>
						<form onSubmit={onCreateException} className='mt-4 space-y-3'>
							<input
								type='text'
								value={exceptionForm.title}
								onChange={(event) => setExceptionForm((current) => ({ ...current, title: event.target.value }))}
								placeholder='Exception title'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							/>
							<textarea
								value={exceptionForm.description}
								onChange={(event) => setExceptionForm((current) => ({ ...current, description: event.target.value }))}
								rows={3}
								placeholder='Description'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							/>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<select
									value={exceptionForm.category}
									onChange={(event) => setExceptionForm((current) => ({ ...current, category: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								>
									{EXCEPTION_CATEGORIES.map((item) => (
										<option key={item.value} value={item.value}>{item.label}</option>
									))}
								</select>
								<select
									value={exceptionForm.classId}
									onChange={(event) => setExceptionForm((current) => ({ ...current, classId: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								>
									<option value=''>Institute-wide</option>
									{classes.map((classItem) => (
										<option key={classItem.id} value={classItem.id}>{classItem.class_name}</option>
									))}
								</select>
							</div>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<input
									type='date'
									value={exceptionForm.startsOn}
									onChange={(event) => setExceptionForm((current) => ({ ...current, startsOn: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								/>
								<input
									type='date'
									value={exceptionForm.endsOn}
									onChange={(event) => setExceptionForm((current) => ({ ...current, endsOn: event.target.value }))}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
								/>
							</div>
							<select
								value={exceptionForm.termId}
								onChange={(event) => setExceptionForm((current) => ({ ...current, termId: event.target.value }))}
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
							>
								<option value=''>No linked term</option>
								{terms.map((term) => (
									<option key={term.id} value={term.id}>{term.label}</option>
								))}
							</select>
							<label className='inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]'>
								<input
									type='checkbox'
									checked={exceptionForm.blocksInstruction}
									onChange={(event) => setExceptionForm((current) => ({ ...current, blocksInstruction: event.target.checked }))}
								/>
								Blocks instructional sessions
							</label>
							<button
								type='submit'
								disabled={exceptionSubmitting}
								className='inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
							>
								<Plus size={15} />
								{exceptionSubmitting ? 'Saving...' : 'Create Exception'}
							</button>
						</form>
					</section>
				</div>

				<div className='grid gap-6 xl:grid-cols-2'>
					<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<div className='flex items-center gap-2'>
							<CalendarDays size={18} className='text-[var(--color-primary)]' />
							<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Configured Terms</h2>
						</div>
						<div className='mt-4 space-y-3'>
							{terms.length === 0 ? (
								<p className='text-sm text-[var(--color-text-muted)]'>No terms created yet.</p>
							) : (
								terms.map((term) => (
									<article
										key={term.id}
										className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'
									>
										<div className='flex items-start justify-between gap-3'>
											<div>
												<p className='text-sm font-semibold text-[var(--color-text-primary)]'>{term.label}</p>
												<p className='text-xs text-[var(--color-text-muted)]'>
													{formatDate(term.starts_on)} - {formatDate(term.ends_on)}
												</p>
											</div>
											<div className='flex items-center gap-2'>
												{term.is_active && (
													<span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700'>
														<CheckCircle2 size={12} /> Active
													</span>
												)}
												<button
													type='button'
													onClick={() => onSetActiveTerm(term.id)}
													className='rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60'
												>
													Activate
												</button>
												<button
													type='button'
													onClick={() => onDeleteTerm(term.id)}
													className='inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
												>
													<Trash2 size={12} /> Delete
												</button>
											</div>
										</div>
									</article>
								))
							)}
						</div>
					</section>

					<section className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
						<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Configured Exceptions</h2>
						<div className='mt-4 space-y-3'>
							{exceptions.length === 0 ? (
								<p className='text-sm text-[var(--color-text-muted)]'>No exceptions created yet.</p>
							) : (
								exceptions.map((exceptionItem) => (
									<article
										key={exceptionItem.id}
										className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'
									>
										<div className='flex items-start justify-between gap-3'>
											<div>
												<p className='text-sm font-semibold text-[var(--color-text-primary)]'>{exceptionItem.title}</p>
												<p className='text-xs text-[var(--color-text-muted)]'>
													{formatDate(exceptionItem.starts_on)} - {formatDate(exceptionItem.ends_on)}
													{' • '}
													{exceptionItem.class_name || 'Institute-wide'}
													{' • '}
													{exceptionItem.category}
												</p>
											</div>
											<div className='flex items-center gap-2'>
												<button
													type='button'
													onClick={() => onToggleBlocksInstruction(exceptionItem)}
													className='rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60'
												>
													{exceptionItem.blocks_instruction ? 'Blocking' : 'Non-blocking'}
												</button>
												<button
													type='button'
													onClick={() => onDeleteException(exceptionItem.id)}
													className='inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
												>
													<Trash2 size={12} /> Delete
												</button>
											</div>
										</div>
									</article>
								))
							)}
						</div>
					</section>
				</div>
			</div>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
			/>
		</div>
	);
}
