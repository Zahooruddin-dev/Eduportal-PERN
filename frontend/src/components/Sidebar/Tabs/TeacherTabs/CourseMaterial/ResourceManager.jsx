import { useState, useEffect } from 'react';
import {
	CloudUpload,
	Link as LinkIcon,
	Edit,
	Trash2,
	Eye,
	EyeOff,
	FileText,
	ExternalLink,
} from 'lucide-react';

import {
	getClassResources,
	createResource,
	updateResource,
	deleteResource,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';

export default function ResourceManager({ classId, className, onBack }) {
	const [resources, setResources] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [showAddForm, setShowAddForm] = useState(false);
	const [formData, setFormData] = useState({
		title: '',
		type: 'file', // 'file' or 'link'
		content: '',
		description: '',
		tags: '',
		isPublished: false,
		expires_at: '',
	});
	const [selectedFile, setSelectedFile] = useState(null);
	const [uploading, setUploading] = useState(false);

	const fetchResources = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getClassResources(classId);
			setResources(res.data);
		} catch (err) {
			setError('Failed to load resources');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchResources();
	}, [classId]);

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	const handleFileChange = (e) => {
		setSelectedFile(e.target.files[0]);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		setUploading(true);
		try {
			const formDataToSend = new FormData();
			formDataToSend.append('title', formData.title);
			formDataToSend.append('type', formData.type);
			formDataToSend.append('description', formData.description);
			formDataToSend.append('tags', formData.tags);
			formDataToSend.append('isPublished', formData.isPublished);
			if (formData.expires_at)
				formDataToSend.append('expires_at', formData.expires_at);
			if (formData.type === 'file' && selectedFile) {
				formDataToSend.append('file', selectedFile);
			} else if (formData.type === 'link') {
				formDataToSend.append('content', formData.content);
			} else {
				throw new Error('Invalid type or missing file/link');
			}
			await createResource(classId, formDataToSend);
			setSuccess('Resource added successfully!');
			setShowAddForm(false);
			setFormData({
				title: '',
				type: 'file',
				content: '',
				description: '',
				tags: '',
				isPublished: false,
				expires_at: '',
			});
			setSelectedFile(null);
			fetchResources();
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to create resource');
		} finally {
			setUploading(false);
		}
	};

	const handleTogglePublish = async (resource) => {
		try {
			await updateResource(classId, resource.id, {
				is_published: !resource.is_published,
			});
			setSuccess(
				`Resource ${!resource.is_published ? 'published' : 'unpublished'}`,
			);
			fetchResources();
		} catch (err) {
			setError('Failed to update resource');
		}
	};

	const handleDelete = async (resourceId) => {
		if (!window.confirm('Delete this resource?')) return;
		try {
			await deleteResource(classId, resourceId);
			setSuccess('Resource deleted');
			fetchResources();
		} catch (err) {
			setError('Failed to delete resource');
		}
	};

	if (loading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	return (
		<div className='p-6'>
			<button
				onClick={onBack}
				className='mb-6 text-[var(--color-primary)] hover:underline flex items-center gap-1'
			>
				← Back to Classes
			</button>

			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
					Resources for {className}
				</h1>
				<button
					onClick={() => setShowAddForm(!showAddForm)}
					className='px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors'
				>
					+ Add Resource
				</button>
			</div>

			{error && <AlertBox message={error} />}
			{success && (
				<div className='mb-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm'>
					{success}
				</div>
			)}

			{/* Add Resource Form */}
			{showAddForm && (
				<div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-6'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)] mb-4'>
						Add New Resource
					</h2>
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
								Title *
							</label>
							<input
								type='text'
								name='title'
								value={formData.title}
								onChange={handleInputChange}
								required
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
								Type *
							</label>
							<div className='flex gap-4'>
								<label className='flex items-center gap-2'>
									<input
										type='radio'
										name='type'
										value='file'
										checked={formData.type === 'file'}
										onChange={handleInputChange}
										className='text-[var(--color-primary)]'
									/>
									<span className='text-sm text-[var(--color-text-primary)]'>
										Upload File
									</span>
								</label>
								<label className='flex items-center gap-2'>
									<input
										type='radio'
										name='type'
										value='link'
										checked={formData.type === 'link'}
										onChange={handleInputChange}
										className='text-[var(--color-primary)]'
									/>
									<span className='text-sm text-[var(--color-text-primary)]'>
										External Link
									</span>
								</label>
							</div>
						</div>

						{formData.type === 'file' && (
							<div>
								<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
									File *
								</label>
								<input
									type='file'
									onChange={handleFileChange}
									required={formData.type === 'file'}
									className='w-full text-sm text-[var(--color-text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-hover)]'
								/>
							</div>
						)}

						{formData.type === 'link' && (
							<div>
								<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
									URL *
								</label>
								<input
									type='url'
									name='content'
									value={formData.content}
									onChange={handleInputChange}
									required={formData.type === 'link'}
									placeholder='https://...'
									className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
								/>
							</div>
						)}

						<div>
							<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
								Description
							</label>
							<textarea
								name='description'
								rows='2'
								value={formData.description}
								onChange={handleInputChange}
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
								Tags (comma separated)
							</label>
							<input
								type='text'
								name='tags'
								value={formData.tags}
								onChange={handleInputChange}
								placeholder='e.g., lecture_notes, reading, assignment'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
						</div>

						<div className='flex items-center gap-2'>
							<input
								type='checkbox'
								name='isPublished'
								id='isPublished'
								checked={formData.isPublished}
								onChange={handleInputChange}
								className='text-[var(--color-primary)]'
							/>
							<label
								htmlFor='isPublished'
								className='text-sm text-[var(--color-text-primary)]'
							>
								Publish immediately (students will see it)
							</label>
						</div>

						<div>
							<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
								Expires at (optional)
							</label>
							<input
								type='datetime-local'
								name='expires_at'
								value={formData.expires_at}
								onChange={handleInputChange}
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
						</div>

						<div className='flex justify-end gap-3'>
							<button
								type='button'
								onClick={() => setShowAddForm(false)}
								className='px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-border)]/50 transition-colors'
							>
								Cancel
							</button>
							<button
								type='submit'
								disabled={uploading}
								className='px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50'
							>
								{uploading ? <SpinnerIcon /> : 'Add Resource'}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Resources List */}
			{resources.length === 0 ? (
				<p className='text-[var(--color-text-muted)] text-center py-8'>
					No resources yet. Click "Add Resource" to get started.
				</p>
			) : (
				<div className='space-y-4'>
					{resources.map((res) => (
						<div
							key={res.id}
							className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm'
						>
							<div className='flex justify-between items-start'>
								<div className='flex-1'>
									<h3 className='font-semibold text-[var(--color-text-primary)]'>
										{res.title}
									</h3>
									<div className='flex flex-wrap gap-2 mt-1'>
										<span
											className={`text-xs px-2 py-1 rounded-full ${
												res.type === 'file'
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
													: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
											}`}
										>
											{res.type === 'file' ? 'File' : 'Link'}
										</span>
										<span
											className={`text-xs px-2 py-1 rounded-full ${
												res.is_published
													? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
													: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
											}`}
										>
											{res.is_published ? 'Published' : 'Draft'}
										</span>
										{res.expires_at &&
											new Date(res.expires_at) < new Date() && (
												<span className='text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'>
													Expired
												</span>
											)}
									</div>
									{res.description && (
										<p className='text-sm text-[var(--color-text-secondary)] mt-2'>
											{res.description}
										</p>
									)}
									{res.tags && res.tags.length > 0 && (
										<div className='flex flex-wrap gap-1 mt-2'>
											{res.tags.map((tag, idx) => (
												<span
													key={idx}
													className='text-xs bg-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded'
												>
													{tag}
												</span>
											))}
										</div>
									)}
									<div className='mt-2'>
										{res.type === 'file' ? (
											<a
												href={res.content}
												target='_blank'
												rel='noopener noreferrer'
												className='inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline'
											>
												<FileText size={14} />
												View File
												<ExternalLink size={12} />
											</a>
										) : (
											<a
												href={res.content}
												target='_blank'
												rel='noopener noreferrer'
												className='inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline'
											>
												<LinkIcon size={14} />
												Visit Link
												<ExternalLink size={12} />
											</a>
										)}
									</div>
								</div>
								<div className='flex gap-2'>
									<button
										onClick={() => handleTogglePublish(res)}
										className='p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
										title={res.is_published ? 'Unpublish' : 'Publish'}
									>
										{res.is_published ? (
											<EyeOff size={18} />
										) : (
											<Eye size={18} />
										)}
									</button>
									<button
										onClick={() => handleDelete(res.id)}
										className='p-1 text-red-500 hover:text-red-700'
										title='Delete'
									>
										<Trash2 size={18} />
									</button>
								</div>
							</div>
							<div className='text-xs text-[var(--color-text-muted)] mt-2'>
								Added: {new Date(res.created_at).toLocaleString()}
								{res.expires_at &&
									` • Expires: ${new Date(res.expires_at).toLocaleString()}`}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
