import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
	getMyClasses,
	getClassResources,
	createResource,
	updateResource,
	deleteResource,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import ResourceManager from './ResourceManager';
import CommentSection from '../../Shared/CommentSection';

export default function CourseMaterial() {
	const { user } = useAuth();
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClass, setSelectedClass] = useState(null);
	const [showCommentsFor, setShowCommentsFor] = useState(null);

	const fetchClasses = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getMyClasses();
			setClasses(res.data);
		} catch (err) {
			setError('Failed to load classes');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchClasses();
	}, []);

	if (loading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	if (selectedClass) {
		return (
			<ResourceManager
				classId={selectedClass.id}
				className={selectedClass.class_name}
				onBack={() => setSelectedClass(null)}
			/>
		);
	}

	return (
		<div className='p-6'>
			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
				Course Repository
			</h1>
			{error && <AlertBox message={error} />}
			{classes.length === 0 ? (
				<p className='text-[var(--color-text-muted)]'>
					You haven't created any classes yet.
				</p>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{classes.map((cls) => (
						<div
							key={cls.id}
							className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow'
						>
							<h3 className='text-lg font-semibold text-[var(--color-text-primary)]'>
								{cls.class_name}
							</h3>
							{cls.subject && (
								<p className='text-sm text-[var(--color-text-secondary)] mt-1'>
									{cls.subject}
								</p>
							)}
							<div className='mt-4'>
								<button
									onClick={() => setSelectedClass(cls)}
									className='px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors'
								>
									Manage Resources
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
