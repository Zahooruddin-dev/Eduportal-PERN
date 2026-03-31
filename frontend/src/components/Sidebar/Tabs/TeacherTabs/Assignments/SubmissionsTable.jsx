import { useState, useEffect, useCallback } from 'react';
import {
	getAssignmentSubmissions,
	submitAssignmentGrades,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import {
	Save,
	FileText,
	Link as LinkIcon,
	ExternalLink,
	BookOpen,
	X,
} from 'lucide-react';
import { getFileViewUrl } from '../../../../../utils/fileUtils';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';

// ── Inline reader modal for text submissions ──────────────────────────────────
function TextSubmissionModal({ isOpen, onClose, username, content }) {
	useEffect(() => {
		const handleKey = (e) => {
			if (e.key === 'Escape') onClose();
		};
		if (isOpen) {
			window.addEventListener('keydown', handleKey);
			document.body.style.overflow = 'hidden';
		}
		return () => {
			window.removeEventListener('keydown', handleKey);
			document.body.style.overflow = 'auto';
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]'>
				{/* Header */}
				<div className='flex items-center justify-between p-4 border-b border-[var(--color-border)] shrink-0'>
					<div>
						<h2 className='text-base font-semibold text-[var(--color-text-primary)]'>
							Written Submission
						</h2>
						<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>
							{username}
						</p>
					</div>
					<button
						onClick={onClose}
						className='text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-lg hover:bg-[var(--color-input-bg)]'
					>
						<X size={18} />
					</button>
				</div>

				{/* Content */}
				<div className='flex-1 overflow-y-auto p-5 min-h-0'>
					<div
						className='submission-reader text-sm text-[var(--color-text-primary)] leading-relaxed'
						dangerouslySetInnerHTML={{ __html: content }}
					/>
				</div>

				{/* Scoped styles matching the editor output */}
				<style>{`
          .submission-reader h1 {
            font-size: 1.5rem; font-weight: 700;
            margin: 0.75rem 0 0.4rem;
            color: var(--color-text-primary); line-height: 1.3;
          }
          .submission-reader h2 {
            font-size: 1.2rem; font-weight: 600;
            margin: 0.6rem 0 0.35rem;
            color: var(--color-text-primary); line-height: 1.35;
          }
          .submission-reader p { margin: 0.3rem 0; }
          .submission-reader ul { list-style: disc; margin: 0.4rem 0; padding-left: 1.5rem; }
          .submission-reader ol { list-style: decimal; margin: 0.4rem 0; padding-left: 1.5rem; }
          .submission-reader li { margin: 0.15rem 0; }
          .submission-reader blockquote {
            border-left: 3px solid var(--color-primary);
            margin: 0.6rem 0; padding: 0.4rem 0.75rem;
            color: var(--color-text-secondary);
            background: var(--color-input-bg);
            border-radius: 0 6px 6px 0; font-style: italic;
          }
          .submission-reader b, .submission-reader strong { font-weight: 700; }
          .submission-reader i, .submission-reader em { font-style: italic; }
          .submission-reader u { text-decoration: underline; }
          .submission-reader s, .submission-reader strike { text-decoration: line-through; }
          .submission-reader hr {
            border: none; border-top: 1px solid var(--color-border); margin: 12px 0;
          }
          .submission-reader a { color: var(--color-primary); text-decoration: underline; }
        `}</style>
			</div>
		</div>
	);
}

// ── Submission cell ───────────────────────────────────────────────────────────
function SubmissionCell({ sub, onViewFile, onViewText }) {
	if (!sub.submission_content) {
		return (
			<span className='text-xs text-[var(--color-text-muted)]'>
				Not submitted
			</span>
		);
	}

	if (sub.submission_type === 'file') {
		return (
			<button
				onClick={() =>
					onViewFile({
						url: getFileViewUrl(sub.submission_content),
						title: `${sub.username}'s submission`,
					})
				}
				className='text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1'
			>
				<FileText size={12} /> View File
			</button>
		);
	}

	if (sub.submission_type === 'text') {
		return (
			<button
				onClick={() => onViewText(sub)}
				className='text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1'
			>
				<BookOpen size={12} /> Read Submission
			</button>
		);
	}

	// link
	return (
		<a
			href={sub.submission_content}
			target='_blank'
			rel='noopener noreferrer'
			className='text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1'
		>
			<LinkIcon size={12} /> Link <ExternalLink size={10} />
		</a>
	);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubmissionsTable({ classId, assignmentId, maxScore }) {
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [grades, setGrades] = useState({});
	const [saving, setSaving] = useState(false);
	const [viewingFile, setViewingFile] = useState(null);
	const [viewingText, setViewingText] = useState(null); // { username, submission_content }

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await getAssignmentSubmissions(classId, assignmentId);
			const data = res.data;
			setSubmissions(data);
			const initialGrades = {};
			data.forEach((sub) => {
				initialGrades[sub.student_id] = {
					score: sub.score ?? '',
					feedback: sub.feedback ?? '',
				};
			});
			setGrades(initialGrades);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [assignmentId, classId]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleGradeChange = (studentId, field, value) => {
		setGrades((prev) => ({
			...prev,
			[studentId]: {
				...prev[studentId],
				[field]: field === 'score' ? parseFloat(value) : value,
			},
		}));
	};

	const saveGrades = async () => {
		setSaving(true);
		const gradesArray = submissions.map((sub) => ({
			studentId: sub.student_id,
			score: grades[sub.student_id]?.score ?? null,
			feedback: grades[sub.student_id]?.feedback ?? null,
		}));
		try {
			await submitAssignmentGrades(classId, assignmentId, {
				grades: gradesArray,
			});
			alert('Grades saved');
		} catch (err) {
			console.error(err);
			alert('Failed to save grades');
		} finally {
			setSaving(false);
		}
	};

	if (loading)
		return (
			<div className='flex justify-center py-4'>
				<SpinnerIcon />
			</div>
		);

	return (
		<>
			<div className='mt-4'>
				<div className='flex justify-between items-center mb-2'>
					<h3 className='text-md font-medium text-[var(--color-text-primary)]'>
						Submissions
					</h3>
					<button
						onClick={saveGrades}
						disabled={saving}
						className='inline-flex items-center gap-1 px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'
					>
						{saving ? <SpinnerIcon /> : <Save size={14} />} Save Grades
					</button>
				</div>

				<div className='overflow-x-auto'>
					<table className='min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg'>
						<thead className='bg-[var(--color-border)]/30'>
							<tr>
								<th className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>
									Student
								</th>
								<th className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>
									Submission
								</th>
								<th className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>
									Score
								</th>
								<th className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]'>
									Feedback
								</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-[var(--color-border)]'>
							{submissions.map((sub) => (
								<tr key={sub.student_id}>
									<td className='px-3 py-2 whitespace-nowrap'>
										<div className='flex items-center gap-2'>
											{sub.profile_pic ? (
												<img
													src={sub.profile_pic}
													alt={sub.username}
													className='h-6 w-6 rounded-full object-cover'
												/>
											) : (
												<div className='h-6 w-6 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-xs'>
													{sub.username.charAt(0).toUpperCase()}
												</div>
											)}
											<span className='text-sm text-[var(--color-text-primary)]'>{sub.username}</span>
										</div>
									</td>
									<td className='px-3 py-2'>
										<SubmissionCell
											sub={sub}
											onViewFile={setViewingFile}
											onViewText={setViewingText}
										/>
									</td>
									<td className='px-3 py-2'>
										<input
											type='number'
											step='any'
											value={grades[sub.student_id]?.score ?? ''}
											onChange={(e) =>
												handleGradeChange(
													sub.student_id,
													'score',
													e.target.value,
												)
											}
											className='w-20 rounded border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm text-[var(--color-text-primary)]'
											placeholder={maxScore}
										/>
									</td>
									<td className='px-3 py-2'>
										<textarea
											value={grades[sub.student_id]?.feedback ?? ''}
											onChange={(e) =>
												handleGradeChange(
													sub.student_id,
													'feedback',
													e.target.value,
												)
											}
											className='w-full rounded border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 py-1 text-sm text-[var(--color-text-primary)]'
											rows='1'
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* File viewer */}
			{viewingFile && (
				<FileViewerModal
					fileUrl={viewingFile.url}
					title={viewingFile.title}
					isOpen={!!viewingFile}
					onClose={() => setViewingFile(null)}
				/>
			)}

			{/* Text submission reader */}
			{viewingText && (
				<TextSubmissionModal
					isOpen={!!viewingText}
					onClose={() => setViewingText(null)}
					username={viewingText.username}
					content={viewingText.submission_content}
				/>
			)}
		</>
	);
}
