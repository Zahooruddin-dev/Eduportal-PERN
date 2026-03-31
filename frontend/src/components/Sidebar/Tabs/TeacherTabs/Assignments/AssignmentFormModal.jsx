import { useState } from 'react';
import { FileText, Link as LinkIcon, Trash2, Plus, X } from 'lucide-react';

export default function AssignmentFormModal({
	isOpen,
	onClose,
	onSubmit,
	initialData = null,
}) {
	const [form, setForm] = useState(() => ({
		title: initialData?.title || '',
		description: initialData?.description || '',
		type: initialData?.type || 'assignment',
		maxScore: initialData?.max_score || 100,
		dueDate: initialData?.due_date ? initialData.due_date.split('T')[0] : '',
	}));
	const [formError, setFormError] = useState('');

	// Attachment state
	const [attachments, setAttachments] = useState([]);
	const [showAddAttachment, setShowAddAttachment] = useState(false);
	const [addType, setAddType] = useState('file');
	const [addTitle, setAddTitle] = useState('');
	const [addUrl, setAddUrl] = useState('');
	const [addFile, setAddFile] = useState(null);
	const [addError, setAddError] = useState('');

	const addAttachment = () => {
		setAddError('');
		if (!addTitle.trim()) {
			setAddError('Attachment title is required.');
			return;
		}

		if (addType === 'file' && !addFile) {
			setAddError('Choose a file to attach.');
			return;
		}

		if (addType === 'link' && !addUrl.trim()) {
			setAddError('Provide a valid link URL.');
			return;
		}

		const newAttachment = {
			id: Date.now(), // temporary id
			title: addTitle.trim(),
			type: addType,
			content: addType === 'file' ? addFile : addUrl.trim(),
			isFile: addType === 'file',
		};
		setAttachments([...attachments, newAttachment]);
		// reset form
		setAddTitle('');
		setAddUrl('');
		setAddFile(null);
		setAddError('');
		setShowAddAttachment(false);
	};

	const removeAttachment = (id) => {
		setAttachments(attachments.filter((a) => a.id !== id));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		setFormError('');
		if (!form.title.trim()) {
			setFormError('Assignment title is required.');
			return;
		}

		if (!Number.isFinite(Number(form.maxScore)) || Number(form.maxScore) <= 0) {
			setFormError('Max score must be greater than 0.');
			return;
		}

		const assignmentData = {
			title: form.title.trim(),
			description: form.description.trim(),
			type: form.type,
			maxScore: parseFloat(form.maxScore),
			dueDate: form.dueDate || null,
		};
		onSubmit({ assignmentData, attachments });
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'>
			<div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl'>
				<div className='mb-4 flex items-center justify-between gap-3'>
					<h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>
					{initialData ? 'Edit Assignment' : 'New Assignment'}
					</h2>
					<button
						type='button'
						onClick={onClose}
						className='rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40'
					>
						<X size={16} />
					</button>
				</div>

				<p className='mb-4 rounded-lg border border-[var(--color-info)]/25 bg-[var(--color-info-soft)] px-3 py-2 text-xs text-[var(--color-text-secondary)]'>
					Use the basic fields first, then add optional resources.
				</p>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<section className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
						<h3 className='mb-3 text-sm font-semibold text-[var(--color-text-primary)]'>Assignment Details</h3>
						<div className='space-y-3'>
							<div>
								<label className='mb-1 block text-sm font-medium text-[var(--color-text-primary)]'>
									Title *
								</label>
								<input
									type='text'
									value={form.title}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
									placeholder='e.g. Unit 4 Algebra Quiz'
									className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
									required
								/>
							</div>

							<div>
								<label className='mb-1 block text-sm font-medium text-[var(--color-text-primary)]'>
									Description (optional)
								</label>
								<textarea
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows='3'
									className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
								/>
							</div>

							<div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
								<div>
									<label className='mb-1 block text-sm font-medium text-[var(--color-text-primary)]'>Type</label>
									<select
										value={form.type}
										onChange={(e) => setForm({ ...form, type: e.target.value })}
										className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
									>
										<option value='assignment'>Assignment</option>
										<option value='quiz'>Quiz</option>
										<option value='exam'>Exam</option>
									</select>
								</div>

								<div>
									<label className='mb-1 block text-sm font-medium text-[var(--color-text-primary)]'>Max Score *</label>
									<input
										type='number'
										step='any'
										min='0.01'
										value={form.maxScore}
										onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
										className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
										required
									/>
								</div>

								<div>
									<label className='mb-1 block text-sm font-medium text-[var(--color-text-primary)]'>Due Date</label>
									<input
										type='date'
										value={form.dueDate}
										onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
										className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
									/>
								</div>
							</div>
						</div>
					</section>

					<section className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4'>
						<div className='flex items-center justify-between mb-2'>
							<label className='text-sm font-semibold text-[var(--color-text-primary)]'>
								Attachments (optional)
							</label>
							<button
								type='button'
								onClick={() => setShowAddAttachment(!showAddAttachment)}
								className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] transition hover:bg-[var(--color-border)]/40'
							>
								<Plus size={12} /> Add
							</button>
						</div>

						{attachments.length > 0 && (
							<ul className='mb-2 space-y-1'>
								{attachments.map((att) => (
									<li
										key={att.id}
										className='flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm'
									>
										<div className='flex items-center gap-2'>
											{att.type === 'file' ? (
												<FileText size={14} />
											) : (
												<LinkIcon size={14} />
											)}
											<span className='text-[var(--color-text-primary)]'>
												{att.title}
											</span>
											{att.type === 'link' && (
												<span className='text-xs text-[var(--color-text-muted)] truncate max-w-[200px]'>
													{att.content}
												</span>
											)}
										</div>
										<button
											type='button'
											onClick={() => removeAttachment(att.id)}
											className='text-[var(--color-danger)] transition hover:opacity-80'
										>
											<Trash2 size={14} />
										</button>
									</li>
								))}
							</ul>
						)}

						{showAddAttachment && (
							<div className='mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3'>
								<input
									type='text'
									placeholder='Title'
									value={addTitle}
									onChange={(e) => setAddTitle(e.target.value)}
									className='mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
								/>
								<div className='mb-2 flex gap-2'>
									<label className='flex items-center gap-1 text-sm text-[var(--color-text-secondary)]'>
										<input
											type='radio'
											value='file'
											checked={addType === 'file'}
											onChange={() => setAddType('file')}
										/>{' '}
										File
									</label>
									<label className='flex items-center gap-1 text-sm text-[var(--color-text-secondary)]'>
										<input
											type='radio'
											value='link'
											checked={addType === 'link'}
											onChange={() => setAddType('link')}
										/>{' '}
										Link
									</label>
								</div>
								{addType === 'file' ? (
									<input
										type='file'
										onChange={(e) => setAddFile(e.target.files[0])}
										className='w-full text-sm text-[var(--color-text-primary)]'
									/>
								) : (
									<input
										type='url'
										placeholder='URL'
										value={addUrl}
										onChange={(e) => setAddUrl(e.target.value)}
										className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25'
									/>
								)}

								{addError && (
									<p className='mt-2 text-xs text-[var(--color-danger)]'>{addError}</p>
								)}

								<div className='mt-2 flex justify-end gap-2'>
									<button
										type='button'
										onClick={() => {
											setShowAddAttachment(false);
											setAddError('');
										}}
										className='rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40'
									>
										Cancel
									</button>
									<button
										type='button'
										onClick={addAttachment}
										className='rounded-lg bg-[var(--color-primary)] px-2 py-1 text-xs text-white transition hover:bg-[var(--color-primary-hover)]'
									>
										Add
									</button>
								</div>
							</div>
						)}
					</section>

					{formError && (
						<p className='rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]'>
							{formError}
						</p>
					)}

					<div className='mt-6 flex justify-end gap-3'>
						<button
							type='button'
							onClick={onClose}
							className='rounded-xl border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40'
						>
							Cancel
						</button>
						<button
							type='submit'
							className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]'
						>
							{initialData ? 'Update' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
