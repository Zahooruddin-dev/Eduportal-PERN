// CourseMaterial.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { getMyClasses } from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import ResourceManager from './ResourceManager';

export default function CourseMaterial() {
	const { user } = useAuth();
	const [classes, setClasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedClass, setSelectedClass] = useState(null);

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

	// When classes are loaded and we have no selected class, selects the first one
	useEffect(() => {
		if (classes.length > 0 && !selectedClass) {
			setSelectedClass(classes[0]);
		}
	}, [classes]);

	if (loading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<SpinnerIcon />
			</div>
		);
	}

	// If we have a selected class, shows the resource manager
	if (selectedClass) {
		return (
			<ResourceManager
				classId={selectedClass.id}
				className={selectedClass.class_name}
				classes={classes}
				onClassChange={(newId, newName) => {
					setSelectedClass({ id: newId, class_name: newName });
				}}
			/>
		);
	}

	return (
		<div className='p-6'>
			<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
				Course Repository
			</h1>
			{error && <AlertBox message={error} />}
			{classes.length === 0 && (
				<p className='text-[var(--color-text-muted)]'>
					You haven't created any classes yet.
				</p>
			)}
		</div>
	);
}
