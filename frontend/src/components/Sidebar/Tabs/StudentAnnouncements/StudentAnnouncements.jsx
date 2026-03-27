// src/Dashboard/Sidebar/Tabs/StudentAnnouncements.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getMyAnnouncements } from '../../../../api/api';
import { SpinnerIcon } from '../../../Icons/Icon';

export default function StudentAnnouncements() {
	const { user } = useAuth();
	const [announcements, setAnnouncements] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchAnnouncements = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getMyAnnouncements();
			setAnnouncements(res.data);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to load announcements');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAnnouncements();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<SpinnerIcon />
			</div>
		);
	}

	return (
		<div className="p-6">
			<h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
				Announcements
			</h1>

			{error && (
				<div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
					{error}
				</div>
			)}

			{announcements.length === 0 ? (
				<p className="text-[var(--color-text-muted)]">
					No announcements from your enrolled classes.
				</p>
			) : (
				<div className="space-y-4">
					{announcements.map((ann) => (
						<div
							key={ann.id}
							className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm"
						>
							<div className="flex justify-between items-start">
								<div>
									<h3 className="font-semibold text-[var(--color-text-primary)]">
										{ann.title}
									</h3>
									<p className="text-sm text-[var(--color-text-muted)] mt-1">
										{ann.class_name} • Posted by {ann.teacher_name}
									</p>
									<p className="text-xs text-[var(--color-text-muted)]">
										{new Date(ann.created_at).toLocaleString()}
										{ann.expires_at && (
											<> • Expires {new Date(ann.expires_at).toLocaleString()}</>
										)}
									</p>
								</div>
							</div>
							<p className="mt-3 text-[var(--color-text-secondary)] whitespace-pre-wrap">
								{ann.content}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}