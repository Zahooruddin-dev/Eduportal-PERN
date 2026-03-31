import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
	getMyClasses,
	getClassAssignments,
	createAssignment,
	updateAssignment,
	deleteAssignment,
	addAssignmentAttachment,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';
import AssignmentFormModal from './AssignmentFormModal';
import AttachmentManager from './AttachmentManager';
import SubmissionsTable from './SubmissionsTable';

export default function TeacherAssignments() {
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [assignments, setAssignments] = useState([]);
	const [loadingAssignments, setLoadingAssignments] = useState(false);
	const [expandedAssignment, setExpandedAssignment] = useState(null);
	const [showAssignmentForm, setShowAssignmentForm] = useState(false);
	const [editingAssignment, setEditingAssignment] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState('all');
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'success',
		message: '',
	});
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);

	const selectedClass = useMemo(
		() => classes.find((item) => item.id === selectedClassId) || null,
		[classes, selectedClassId],
	);

	const filteredAssignments = useMemo(() => {
		const query = String(searchQuery || '').trim().toLowerCase();
		return assignments.filter((assignment) => {
			const matchesType = typeFilter === 'all' || assignment.type === typeFilter;
			if (!matchesType) return false;

			if (!query) return true;
			const title = String(assignment.title || '').toLowerCase();
			const description = String(assignment.description || '').toLowerCase();
			const type = String(assignment.type || '').toLowerCase();
			return title.includes(query) || description.includes(query) || type.includes(query);
		});
	}, [assignments, searchQuery, typeFilter]);

	const assignmentStats = useMemo(() => {
		const total = assignments.length;
		const now = new Date();
		const endOfWeek = new Date(now);
		endOfWeek.setDate(now.getDate() + 7);
		const dueSoon = assignments.filter((assignment) => {
			if (!assignment.due_date) return false;
			const due = new Date(assignment.due_date);
			return due >= now && due <= endOfWeek;
		}).length;
		const overdue = assignments.filter((assignment) => {
			if (!assignment.due_date) return false;
			return new Date(assignment.due_date) < now;
		}).length;

		return { total, dueSoon, overdue };
	}, [assignments]);

	const fetchClasses = useCallback(async () => {
		setLoading(true);
		try {
			const res = await getMyClasses();
			const classList = Array.isArray(res.data) ? res.data : [];
			setClasses(classList);
			setError('');
			if (!classList.length) {
				setSelectedClassId('');
				setAssignments([]);
				return;
			}

			setSelectedClassId((current) => {
				if (classList.some((classItem) => classItem.id === current)) {
					return current;
				}
				return classList[0].id;
			});
		} catch (error) {
			console.error('Failed to load classes:', error);
			setError('Failed to load classes');
			setClasses([]);
			setSelectedClassId('');
			setAssignments([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchClasses();
	}, [fetchClasses]);

	const fetchAssignments = useCallback(async (classId) => {
		if (!classId) {
			setAssignments([]);
			return;
		}
		setLoadingAssignments(true);
		try {
			const res = await getClassAssignments(classId);
			setAssignments(Array.isArray(res.data) ? res.data : []);
			setError('');
		} catch (error) {
			console.error('Failed to load assignments:', error);
			setError('Failed to load assignments');
			setAssignments([]);
		} finally {
			setLoadingAssignments(false);
		}
	}, []);

	useEffect(() => {
		setExpandedAssignment(null);
		fetchAssignments(selectedClassId);
	}, [fetchAssignments, selectedClassId]);

	const handleCreateUpdate = async ({ assignmentData, attachments }) => {
		if (!selectedClassId) return;
		try {
			let assignmentId;
			if (editingAssignment) {
				await updateAssignment(
					selectedClassId,
					editingAssignment.id,
					assignmentData,
				);
				assignmentId = editingAssignment.id;
				setToast({
					isOpen: true,
					type: 'success',
					message: 'Assignment updated',
				});
			} else {
				const res = await createAssignment(selectedClassId, assignmentData);
				assignmentId = res.data.id;
				setToast({
					isOpen: true,
					type: 'success',
					message: 'Assignment created',
				});
			}

			// Upload attachments for new assignment
			if (!editingAssignment && attachments.length > 0) {
				const uploadResults = await Promise.allSettled(
					attachments.map((att) => {
						const formData = new FormData();
						formData.append('title', att.title);
						formData.append('type', att.type);
						if (att.type === 'file') {
							formData.append('file', att.content);
						} else {
							formData.append('content', att.content);
						}
						return addAssignmentAttachment(selectedClassId, assignmentId, formData);
					}),
				);

				const failedUploads = uploadResults.filter((result) => result.status === 'rejected').length;
				if (failedUploads > 0) {
					setToast({
						isOpen: true,
						type: 'error',
						message: 'Assignment created but some attachments failed',
					});
				} else if (attachments.length > 0) {
					setToast({
						isOpen: true,
						type: 'success',
						message: 'Assignment created with attachments',
					});
				}
			}

			setShowAssignmentForm(false);
			setEditingAssignment(null);
			await fetchAssignments(selectedClassId);
		} catch (err) {
			setToast({
				isOpen: true,
				type: 'error',
				message: err.response?.data?.error || 'Operation failed',
			});
		}
	};
	const handleDelete = async () => {
		if (!selectedClassId) return;
		try {
			await deleteAssignment(selectedClassId, confirmAction);
			setToast({
				isOpen: true,
				type: 'success',
				message: 'Assignment deleted',
			});
			await fetchAssignments(selectedClassId);
			if (expandedAssignment === confirmAction) setExpandedAssignment(null);
		} catch (err) {
			setToast({
				isOpen: true,
				type: 'error',
				message: err.response?.data?.error || 'Delete failed',
			});
		} finally {
			setConfirmOpen(false);
			setConfirmAction(null);
		}
	};

	const openDeleteConfirm = (assignmentId) => {
		setConfirmAction(assignmentId);
		setConfirmOpen(true);
	};

	if (loading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	if (!classes.length) {
		return (
			<div className='p-6'>
				<h1 className='mb-6 text-2xl font-semibold text-[var(--color-text-primary)]'>Assignments</h1>
				{error && <AlertBox message={error} />}
				<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]'>
					You have no classes yet. Create a class first to manage assignments.
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[var(--color-bg)]'>
			<div className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
				<div className='flex flex-wrap items-center justify-between gap-4'>
					<div>
						<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl'>Assignments</h1>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
							Create work, manage attachments, and grade submissions in one place.
						</p>
					</div>

				<button
					onClick={() => {
						setEditingAssignment(null);
						setShowAssignmentForm(true);
					}}
					disabled={!selectedClassId}
					className='inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
				>
					<Plus size={16} /> New Assignment
				</button>
			</div>

				<div className='grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_220px]'>
					<select
						value={selectedClassId}
						onChange={(event) => setSelectedClassId(event.target.value)}
						className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
					>
						{classes.map((classItem) => (
							<option key={classItem.id} value={classItem.id}>
								{classItem.class_name}
								{classItem.subject ? ` • ${classItem.subject}` : ''}
							</option>
						))}
					</select>

					<input
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder='Search assignment title, type, or description'
						className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
					/>

					<select
						value={typeFilter}
						onChange={(event) => setTypeFilter(event.target.value)}
						className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
					>
						<option value='all'>All Types</option>
						<option value='assignment'>Assignments</option>
						<option value='quiz'>Quizzes</option>
						<option value='exam'>Exams</option>
					</select>
				</div>

				{selectedClass && (
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5'>
						<h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>
							{selectedClass.class_name}
						</h2>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
							Showing {filteredAssignments.length} of {assignments.length} assignments
						</p>

						<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
							<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
								<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Total</p>
								<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{assignmentStats.total}</p>
							</div>
							<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
								<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Due In 7 Days</p>
								<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{assignmentStats.dueSoon}</p>
							</div>
							<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'>
								<p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Overdue</p>
								<p className='text-lg font-semibold text-[var(--color-danger)]'>{assignmentStats.overdue}</p>
							</div>
						</div>
					</div>
				)}

				{error && <AlertBox message={error} />}

				{loadingAssignments ? (
					<div className='flex justify-center py-6'>
						<SpinnerIcon />
					</div>
				) : assignments.length === 0 ? (
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]'>
						No assignments yet. Click New Assignment to create one.
					</div>
				) : filteredAssignments.length === 0 ? (
					<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]'>
						No assignments match your filters.
					</div>
				) : (
					<div className='space-y-4'>
						{filteredAssignments.map((assignment) => (
							<div
								key={assignment.id}
								className='overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'
							>
								<div className='flex items-start justify-between gap-4 p-4'>
									<div className='min-w-0 flex-1'>
										<h3 className='truncate text-base font-semibold text-[var(--color-text-primary)]'>
											{assignment.title}
										</h3>
										<div className='mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]'>
											<span className='rounded-full border border-[var(--color-border)] px-2 py-0.5'>
												{assignment.type}
											</span>
											<span className='rounded-full border border-[var(--color-border)] px-2 py-0.5'>
												Max Score: {assignment.max_score}
											</span>
											{assignment.due_date && (
												<span className='rounded-full border border-[var(--color-border)] px-2 py-0.5'>
													Due: {new Date(assignment.due_date).toLocaleDateString()}
												</span>
											)}
										</div>
										{assignment.description && (
											<p className='mt-2 line-clamp-3 text-sm text-[var(--color-text-secondary)]'>
												{assignment.description}
											</p>
										)}
									</div>

									<div className='flex gap-1'>
										<button
											onClick={() => {
												setEditingAssignment(assignment);
												setShowAssignmentForm(true);
											}}
											className='rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text-primary)]'
											title='Edit assignment'
										>
											<Edit2 size={16} />
										</button>
										<button
											onClick={() => openDeleteConfirm(assignment.id)}
											className='rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]'
											title='Delete assignment'
										>
											<Trash2 size={16} />
										</button>
										<button
											onClick={() =>
												setExpandedAssignment(
													expandedAssignment === assignment.id ? null : assignment.id,
												)
											}
											className='rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text-primary)]'
											title='Expand assignment details'
										>
											{expandedAssignment === assignment.id ? (
												<ChevronUp size={16} />
											) : (
												<ChevronDown size={16} />
											)}
										</button>
									</div>
								</div>

								{expandedAssignment === assignment.id && (
									<div className='border-t border-[var(--color-border)] bg-[var(--color-input-bg)]/30 p-4'>
										<AttachmentManager
											classId={selectedClassId}
											assignmentId={assignment.id}
										/>
										<SubmissionsTable
											classId={selectedClassId}
											assignmentId={assignment.id}
											maxScore={assignment.max_score}
										/>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			<AssignmentFormModal
				key={`${editingAssignment?.id || 'new'}-${showAssignmentForm ? 'open' : 'closed'}`}
				isOpen={showAssignmentForm}
				onClose={() => {
					setShowAssignmentForm(false);
					setEditingAssignment(null);
				}}
				onSubmit={handleCreateUpdate}
				initialData={editingAssignment}
			/>
			<ConfirmModal
				isOpen={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				onConfirm={handleDelete}
				title='Delete Assignment'
				message='Are you sure? This will also delete all grades for this assignment.'
				confirmText='Delete'
				type='danger'
			/>
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
