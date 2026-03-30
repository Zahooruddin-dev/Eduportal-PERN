import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  getStudentEnrolledShedule,
  getClasses,
  postEnrollement,
  unenrollStudent,
  getClassAnnouncements,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import Toast from '../../../../Toast';
import ConfirmModal from '../../../../ConfirmModal';

export default function EnrolledClasses() {
  const { user } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState(null);
  const [enrollConfirmOpen, setEnrollConfirmOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchEnrolled = async () => {
    setLoadingEnrolled(true);
    setError('');
    try {
      const res = await getStudentEnrolledShedule(user.id);
      setEnrolledClasses(res.data);
    } catch (err) {
      setError('Failed to load enrolled classes');
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const fetchAvailable = async () => {
    setLoadingAvailable(true);
    try {
      const res = await getClasses();
      const enrolledIds = enrolledClasses.map((c) => c.class_id ?? c.id);
      const filtered = res.data.filter((cls) => !enrolledIds.includes(cls.id));
      setAvailableClasses(filtered);
    } catch (err) {
      setError('Failed to load available classes');
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (user) fetchEnrolled();
  }, [user]);

  useEffect(() => {
    if (!loadingEnrolled) fetchAvailable();
  }, [enrolledClasses, loadingEnrolled]);

  const requestEnroll = (classId) => {
    setEnrollTarget(classId);
    setEnrollConfirmOpen(true);
  };

  const performEnroll = async () => {
    if (!enrollTarget) return;
    setError('');
    setSuccess('');
    try {
      await postEnrollement({ student_id: user.id, class_id: enrollTarget });
      setSuccess('Successfully enrolled!');
      setToast({ isOpen: true, type: 'success', message: 'Successfully enrolled!' });
      setEnrollTarget(null);
      setEnrollConfirmOpen(false);
      fetchEnrolled();
    } catch (err) {
      const msg = err.response?.data?.message || 'Enrollment failed';
      setError(msg);
      setToast({ isOpen: true, type: 'error', message: msg });
      setEnrollConfirmOpen(false);
      setEnrollTarget(null);
    }
  };

  const requestUnenroll = (classId) => {
    setUnenrollTarget(classId);
    setConfirmOpen(true);
  };

  const performUnenroll = async () => {
    if (!unenrollTarget) return;
    setError('');
    setSuccess('');
    try {
      await unenrollStudent(user.id, unenrollTarget);
      setSuccess('Successfully unenrolled');
      setToast({ isOpen: true, type: 'success', message: 'Successfully unenrolled' });
      setUnenrollTarget(null);
      fetchEnrolled();
    } catch (err) {
      const msg = err.response?.data?.error || 'Unenrollment failed';
      setError(msg);
      setToast({ isOpen: true, type: 'error', message: msg });
    }
  };

  const handleShowAnnouncements = async (cls) => {
    const id = cls.class_id ?? cls.id;
    setSelectedClass(cls);
    setShowAnnouncementsModal(true);
    setLoadingAnnouncements(true);
    try {
      const res = await getClassAnnouncements(id);
      setAnnouncements(res.data);
    } catch (err) {
      setError('Failed to load announcements');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const closeAnnouncementsModal = () => {
    setShowAnnouncementsModal(false);
    setSelectedClass(null);
    setAnnouncements([]);
    setLoadingAnnouncements(false);
  };

  if (loadingEnrolled) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className='animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'
          >
            <div className='h-5 bg-[var(--color-border)] rounded w-1/2 mb-3' />
            <div className='h-3 bg-[var(--color-border)] rounded w-2/3 mb-2' />
            <div className='h-24 bg-[var(--color-border)] rounded mt-2' />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-semibold text-[var(--color-text-primary)] mb-6'>
        My Enrolled Classes
      </h1>

      <Toast type={toast.type} message={toast.message} isOpen={toast.isOpen} onClose={() => setToast((t) => ({ ...t, isOpen: false }))} />

      {/* Enrolled Classes */}
      <div className='mb-8'>
        <h2 className='text-lg font-medium text-[var(--color-text-primary)] mb-3'>
          Enrolled Classes ({enrolledClasses.length})
        </h2>

        {enrolledClasses.length === 0 ? (
          <p className='text-[var(--color-text-muted)]'>You are not enrolled in any classes yet.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {enrolledClasses.map((cls) => (
              <div key={cls.class_id ?? cls.id} className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-[var(--color-text-primary)] mb-1'>{cls.class_name}</h3>
                <div className='space-y-1 text-sm text-[var(--color-text-secondary)]'>
                  <p>📅 {cls.schedule_days}</p>
                  <p>⏰ {cls.start_time} – {cls.end_time}</p>
                </div>
                <p className='text-xs text-[var(--color-text-muted)] mb-3'>
                  Enrolled on {new Date(cls.enrollment_date).toLocaleDateString()}
                </p>
                <div className='flex gap-2'>
                  <button onClick={() => handleShowAnnouncements(cls)} className='px-3 py-1 text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]/50 transition-colors'>
                    Announcements
                  </button>
                  <button onClick={() => requestUnenroll(cls.class_id ?? cls.id)} className='px-3 py-1 text-sm text-[var(--color-danger)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-danger-hover)]/10 transition-colors'>
                    Unenroll
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Classes */}
      <div>
        <h2 className='text-lg font-medium text-[var(--color-text-primary)] mb-3'>Available Classes</h2>

        {loadingAvailable ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'>
                <div className='h-5 bg-[var(--color-border)] rounded w-1/2 mb-3' />
                <div className='h-3 bg-[var(--color-border)] rounded w-2/3 mb-2' />
                <div className='h-20 bg-[var(--color-border)] rounded mt-2' />
              </div>
            ))}
          </div>
        ) : availableClasses.length === 0 ? (
          <p className='text-[var(--color-text-muted)]'>No classes available to enroll.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {availableClasses.map((cls) => (
              <div key={cls.id} className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-[var(--color-text-primary)] mb-1'>{cls.class_name}</h3>
                <div className='space-y-1 text-sm text-[var(--color-text-secondary)]'>
                  <p>📅 {cls.schedule_days}</p>
                  <p>⏰ {cls.start_time} – {cls.end_time}</p>
                  {cls.room_number && <p>🚪 Room {cls.room_number}</p>}
                </div>
                {cls.description && <p className='mt-2 text-sm text-[var(--color-text-muted)] line-clamp-2'>{cls.description}</p>}
                <div className='mt-4'>
                  <button onClick={() => requestEnroll(cls.id)} className='px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors'>Enroll</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcements Modal */}
      {showAnnouncementsModal && selectedClass && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 overlay-fade'>
          <div className='absolute inset-0 bg-black/50' aria-hidden='true' />
          <section role='dialog' aria-modal='true' aria-labelledby='announcements-title' className='relative z-10 w-full max-w-3xl sm:max-w-2xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden fade-scale-in'>
            <div className='px-4 py-4 sm:px-6 sm:py-6 border-b border-[var(--color-border)]'>
              <div className='flex items-start sm:items-center justify-between gap-4'>
                <div className='flex-1 min-w-0'>
                  <h2 id='announcements-title' className='text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] truncate'>Announcements for {selectedClass.class_name}</h2>
                  <p className='mt-1 text-sm text-[var(--color-text-muted)] truncate'>Latest updates and notices for this class</p>
                </div>
                <button onClick={closeAnnouncementsModal} aria-label='Close announcements' className='ml-3 inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors'>✕</button>
              </div>
            </div>
            <div className='max-h-[70vh] overflow-y-auto p-4 sm:p-6'>
              {loadingAnnouncements ? (
                <div className='space-y-3'>
                  {[1,2,3].map(i => (
                    <div key={i} className='animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4' />
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className='py-8 text-center'>
                  <p className='text-sm text-[var(--color-text-muted)]'>No announcements yet.</p>
                </div>
              ) : (
                <ul className='space-y-4'>
                  {announcements.map((ann) => (
                    <li key={ann.id} className='bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 sm:p-5'>
                      <header className='flex items-start justify-between gap-4'>
                        <h3 className='text-sm sm:text-base font-semibold text-[var(--color-text-primary)]'>{ann.title}</h3>
                        <p className='text-xs text-[var(--color-text-muted)]'>Posted on {new Date(ann.created_at).toLocaleString()}{ann.expires_at && ` • Expires ${new Date(ann.expires_at).toLocaleString()}`}</p>
                      </header>
                      <div className='mt-2 text-[var(--color-text-secondary)] whitespace-pre-wrap text-sm'>{ann.content}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmModal isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setUnenrollTarget(null); }} onConfirm={performUnenroll} title='Unenroll from class' message='Are you sure you want to unenroll from this class?' confirmText='Unenroll' cancelText='Cancel' type='warning' />

      <ConfirmModal isOpen={enrollConfirmOpen} onClose={() => { setEnrollConfirmOpen(false); setEnrollTarget(null); }} onConfirm={performEnroll} title='Enroll in class' message='Are you sure you want to enroll in this class?' confirmText='Enroll' cancelText='Cancel' type='success' />
    </div>
  );
}
