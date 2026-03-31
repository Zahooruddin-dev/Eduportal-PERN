import { useState, useEffect, useCallback } from 'react';
import {
	getAssignmentAttachments,
	addAssignmentAttachment,
	deleteAssignmentAttachment,
} from '../../../../../api/api';
import { FileText, Link as LinkIcon, Trash2, Plus } from 'lucide-react';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';

export default function AttachmentManager({ classId, assignmentId }) {
	const [attachments, setAttachments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showAdd, setShowAdd] = useState(false);
	const [addType, setAddType] = useState('file');
	const [title, setTitle] = useState('');
	const [url, setUrl] = useState('');
	const [file, setFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [viewingFile, setViewingFile] = useState(null);

	const fetchAttachments = useCallback(async () => {
		setLoading(true);
		try {
			const res = await getAssignmentAttachments(classId, assignmentId);
			setAttachments(res.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [assignmentId, classId]);

	useEffect(() => {
		fetchAttachments();
	}, [fetchAttachments]);

	const handleAdd = async () => {
		if (!title) return;
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('type', addType);
			if (addType === 'file' && file) {
				formData.append('file', file);
			} else if (addType === 'link' && url) {
				formData.append('content', url);
			} else {
				return;
			}
			await addAssignmentAttachment(classId, assignmentId, formData);
			setShowAdd(false);
			setTitle('');
			setUrl('');
			setFile(null);
			fetchAttachments();
		} catch (err) {
			console.error(err);
		} finally {
			setUploading(false);
		}
	};

	const handleDelete = async (attachmentId) => {
		if (!window.confirm('Delete this attachment?')) return;
		try {
			await deleteAssignmentAttachment(classId, assignmentId, attachmentId);
			fetchAttachments();
		} catch (err) {
			console.error(err);
		}
	};

	if (loading)
		return (
			<div className='text-sm text-[var(--color-text-muted)]'>
				Loading attachments...
			</div>
		);

	return (
		<div className='mt-3 border-t border-[var(--color-border)] pt-3'>
			<div className='flex justify-between items-center'>
				<h4 className='text-sm font-medium text-[var(--color-text-secondary)]'>
					Attachments
				</h4>
				<button
					onClick={() => setShowAdd(!showAdd)}
					className='text-xs text-[var(--color-primary)] flex items-center gap-1'
				>
					<Plus size={12} /> Add
				</button>
			</div>
			{attachments.length === 0 ? (
				<p className='text-xs text-[var(--color-text-muted)] mt-1'>
					No attachments yet.
				</p>
			) : (
				<ul className='mt-2 space-y-1'>
					{attachments.map((att) => (
						<li
							key={att.id}
							className='flex items-center justify-between text-sm'
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
								<button
									onClick={() =>
										setViewingFile({
											url: getFileViewUrl(att.content),
											title: att.title,
										})
									}
									className='text-xs text-[var(--color-primary)] hover:underline'
								>
									View
								</button>
							</div>
							<button
								onClick={() => handleDelete(att.id)}
								className='text-red-500 hover:text-red-700'
							>
								<Trash2 size={14} />
							</button>
						</li>
					))}
				</ul>
			)}
			{showAdd && (
				<div className='mt-2 p-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-input-bg)]'>
					<input
						type='text'
						placeholder='Title'
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className='w-full mb-2 p-1 text-sm border border-[var(--color-border)] rounded'
					/>
					<div className='flex gap-2 mb-2'>
						<label className='flex items-center gap-1 text-sm'>
							<input
								type='radio'
								value='file'
								checked={addType === 'file'}
								onChange={() => setAddType('file')}
							/>{' '}
							File
						</label>
						<label className='flex items-center gap-1 text-sm'>
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
							onChange={(e) => setFile(e.target.files[0])}
							className='w-full text-sm'
						/>
					) : (
						<input
							type='url'
							placeholder='URL'
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							className='w-full p-1 text-sm border border-[var(--color-border)] rounded'
						/>
					)}
					<div className='flex justify-end gap-2 mt-2'>
						<button
							onClick={() => setShowAdd(false)}
							className='text-xs text-[var(--color-text-muted)]'
						>
							Cancel
						</button>
						<button
							onClick={handleAdd}
							disabled={uploading}
							className='text-xs text-[var(--color-primary)]'
						>
							Add
						</button>
					</div>
				</div>
			)}
			{viewingFile && (
				<FileViewerModal
					fileUrl={viewingFile.url}
					title={viewingFile.title}
					isOpen={!!viewingFile}
					onClose={() => setViewingFile(null)}
				/>
			)}
		</div>
	);
}
