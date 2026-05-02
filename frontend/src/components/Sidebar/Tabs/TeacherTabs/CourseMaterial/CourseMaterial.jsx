import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/useAuth';
import { getMyClasses } from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import ResourceManager from './ResourceManager';
import QuizManager from './QuizManager';

export default function CourseMaterial() {
	const { user } = useAuth();
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [activeTab, setActiveTab] = useState('materials');

	const fetchClasses = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getMyClasses();
			const nextClasses = res.data || [];
			setClasses(nextClasses);

			if (nextClasses.length > 0) {
				setSelectedClassId((current) => {
					if (
						current &&
						nextClasses.some((classItem) => classItem.id === current)
					) {
						return current;
					}
					return nextClasses[0].id;
				});
			}
		} catch {
			setError('Failed to load classes');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (user?.id) fetchClasses();
	}, [user?.id]);

	const selectedClass = useMemo(
		() => classes.find((classItem) => classItem.id === selectedClassId) || null,
		[classes, selectedClassId],
	);

	if (loading) {
		return (
			<div className='flex h-64 items-center justify-center'>
				<SpinnerIcon />
			</div>
		);
	}

	if (selectedClass) {
		return (
			<div>
				<div className='flex gap-2 border-b mb-4'>
					<button
						onClick={() => setActiveTab('materials')}
						className={`px-4 py-2 font-medium ${
							activeTab === 'materials'
								? 'border-b-2 border-blue-600 text-blue-600'
								: 'text-gray-600 hover:text-gray-900'
						}`}
					>
						Materials
					</button>
					<button
						onClick={() => setActiveTab('quizzes')}
						className={`px-4 py-2 font-medium ${
							activeTab === 'quizzes'
								? 'border-b-2 border-blue-600 text-blue-600'
								: 'text-gray-600 hover:text-gray-900'
						}`}
					>
						Quizzes
					</button>
				</div>

				{activeTab === 'materials' && (
					<ResourceManager
						classId={selectedClass.id}
						className={selectedClass.class_name}
						classes={classes}
						onClassChange={(newId) => {
							setSelectedClassId(newId);
						}}
					/>
				)}

				{activeTab === 'quizzes' && (
					<QuizManager
						classId={selectedClass.id}
						user={user}
					/>
				)}
			</div>
		);
	}

	return (
		<div className='p-4 sm:p-6'>
			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-2'>
				Course Material
			</h1>
			<p className='text-sm text-[var(--color-text-muted)] mb-6'>
				Share files and links for your students by class.
			</p>

			{error && (
				<div
					role='alert'
					className='mb-4 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]'
				>
					{error}
				</div>
			)}

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center'>
				<p className='text-[var(--color-text-muted)]'>
					You have not created any classes yet.
				</p>
			</div>
		</div>
	);
}
