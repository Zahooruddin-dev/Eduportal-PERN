// src/Dashboard/Sidebar/Tabs/ScheduleManagement.jsx
import { useState, useEffect } from 'react';
import {
  getMyClasses,
  createClass,
  deleteMyClass,
  updateClass,
  getClassEnrolledRooster,
} from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import ClassDetails from './ClassDetails';

export default function ScheduleManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    schedule_days: '',
    start_time: '',
    end_time: '',
    room_number: '',
    grade_level: '',
    subject: '',
    description: '',
    max_students: 30,
  });

  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyClasses();
      const classesData = res.data;
      // Fetch enrolled count for each class in parallel
      const classesWithCount = await Promise.all(
        classesData.map(async (cls) => {
          try {
            const rosterRes = await getClassEnrolledRooster(cls.id);
            return { ...cls, enrolledCount: rosterRes.data.length };
          } catch {
            return { ...cls, enrolledCount: 0 };
          }
        })
      );
      setClasses(classesWithCount);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      class_name: '',
      schedule_days: '',
      start_time: '',
      end_time: '',
      room_number: '',
      grade_level: '',
      subject: '',
      description: '',
      max_students: 30,
    });
    setEditingClass(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingClass) {
        await updateClass(editingClass.id, formData);
        setSuccess('Class updated successfully');
      } else {
        await createClass(formData);
        setSuccess('Class created successfully');
      }
      resetForm();
      setShowModal(false);
      fetchClasses(); // refresh list
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      class_name: cls.class_name,
      schedule_days: cls.schedule_days,
      start_time: cls.start_time,
      end_time: cls.end_time,
      room_number: cls.room_number || '',
      grade_level: cls.grade_level || '',
      subject: cls.subject || '',
      description: cls.description || '',
      max_students: cls.max_students || 30,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteMyClass(id);
      setSuccess('Class deleted');
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Deletion failed');
    }
  };

  if (selectedClass) {
    return (
      <ClassDetails
        classId={selectedClass.id}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <SpinnerIcon />
      </div>
    );
  }

	return (
		  <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
          My Classes
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className='px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors'
        >
          + New Class
        </button>
      </div>

      {error && <AlertBox message={error} />}
      {success && (
        <div className='mb-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm'>
          {success}
        </div>
      )}

      {classes.length === 0 ? (
        <p className='text-[var(--color-text-muted)]'>
          No classes yet. Create your first class!
        </p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {classes.map((cls) => (
            <div
              key={cls.id}
              className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow'
            >
              <div className='flex justify-between items-start'>
                <h3 className='text-lg font-semibold text-[var(--color-text-primary)] mb-2'>
                  {cls.class_name}
                </h3>
                <span className='text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded-full'>
                  {cls.grade_level || 'N/A'}
                </span>
              </div>
              {cls.subject && (
                <p className='text-sm text-[var(--color-text-secondary)] mb-2'>
                  📚 {cls.subject}
                </p>
              )}
              <div className='space-y-1 text-sm text-[var(--color-text-secondary)]'>
                <p>📅 {cls.schedule_days}</p>
                <p>⏰ {cls.start_time} – {cls.end_time}</p>
                {cls.room_number && <p>🚪 Room {cls.room_number}</p>}
                {cls.max_students && <p>👥 Max {cls.max_students} students</p>}
                {cls.enrolledCount !== undefined && (
                  <p className='text-xs text-[var(--color-primary)] mt-1'>
                    👥 Enrolled: {cls.enrolledCount}
                  </p>
                )}
              </div>
              {cls.description && (
                <p className='mt-2 text-sm text-[var(--color-text-muted)] line-clamp-2'>
                  {cls.description}
                </p>
              )}
              <div className='flex gap-2 mt-4'>
                <button
                  onClick={() => setSelectedClass(cls)}
                  className='px-3 py-1 text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]/50 transition-colors'
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEdit(cls)}
                  className='px-3 py-1 text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]/50 transition-colors'
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className='px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

			{/* Modal for Create/Edit */}
			{showModal && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
					<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6'>
						<h2 className='text-xl font-semibold text-[var(--color-text-primary)] mb-4'>
							{editingClass ? 'Edit Class' : 'Create New Class'}
						</h2>
						{showModal && (
							<form onSubmit={handleSubmit} className='space-y-4'>
								{/* Basic Info */}
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Class Name *
										</label>
										<input
											type='text'
											name='class_name'
											value={formData.class_name}
											onChange={handleInputChange}
											required
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Schedule Days *
										</label>
										<input
											type='text'
											name='schedule_days'
											value={formData.schedule_days}
											onChange={handleInputChange}
											required
											placeholder='e.g., Mon,Wed,Fri'
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Start Time *
										</label>
										<input
											type='time'
											name='start_time'
											value={formData.start_time}
											onChange={handleInputChange}
											required
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											End Time *
										</label>
										<input
											type='time'
											name='end_time'
											value={formData.end_time}
											onChange={handleInputChange}
											required
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Room Number
										</label>
										<input
											type='text'
											name='room_number'
											value={formData.room_number}
											onChange={handleInputChange}
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Grade Level
										</label>
										<input
											type='text'
											name='grade_level'
											value={formData.grade_level}
											onChange={handleInputChange}
											placeholder='e.g., Grade 10'
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Subject
										</label>
										<input
											type='text'
											name='subject'
											value={formData.subject}
											onChange={handleInputChange}
											placeholder='e.g., Mathematics'
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
											Max Students
										</label>
										<input
											type='number'
											name='max_students'
											value={formData.max_students}
											onChange={handleInputChange}
											min='1'
											className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
										/>
									</div>
								</div>

								<div>
									<label className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1'>
										Description
									</label>
									<textarea
										name='description'
										rows='3'
										value={formData.description}
										onChange={handleInputChange}
										placeholder='Course description, objectives, etc.'
										className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
									/>
								</div>

								<div className='flex gap-3 justify-end mt-6'>
									<button
										type='button'
										onClick={() => {
											setShowModal(false);
											resetForm();
										}}
										className='px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-border)]/50 transition-colors'
									>
										Cancel
									</button>
									<button
										type='submit'
										className='px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors'
									>
										{editingClass ? 'Update' : 'Create'}
									</button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
