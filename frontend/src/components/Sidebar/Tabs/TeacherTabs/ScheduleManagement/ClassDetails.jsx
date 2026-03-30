import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAnnouncement,
  getClassAnnouncements,
  getClassById,
  getClassEnrolledRooster,
  getRemovedClassMembers,
  getStudentClassProfile,
  postAnnouncement,
  removeStudentFromClass,
  unbanStudentFromClass,
} from '../../../../../api/api';
import ConfirmModal from '../../../../ConfirmModal';
import Toast from '../../../../Toast';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { formatTimeRange, getScheduleBlocksFromClass } from '../../../../../utils/scheduleUtils';

export default function ClassDetails({ classId, onBack }) {
  const [classInfo, setClassInfo] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [roster, setRoster] = useState([]);
  const [removedStudents, setRemovedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingRemoved, setLoadingRemoved] = useState(true);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', expires_at: '' });
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const [pendingAnnouncementDelete, setPendingAnnouncementDelete] = useState(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [removalDraft, setRemovalDraft] = useState({
    action: 'kick',
    data_policy: 'keep',
    note: '',
  });
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const [pendingUnbanStudent, setPendingUnbanStudent] = useState(null);
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);

  const scheduleBlocks = useMemo(() => getScheduleBlocksFromClass(classInfo), [classInfo]);

  const loadClass = useCallback(async () => {
    setLoading(true);
    try {
      const [classResponse, announcementsResponse] = await Promise.all([
        getClassById(classId),
        getClassAnnouncements(classId),
      ]);
      setClassInfo(classResponse.data);
      setAnnouncements(announcementsResponse.data || []);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load class details.',
      });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const response = await getClassEnrolledRooster(classId);
      setRoster(response.data || []);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load class roster.',
      });
    } finally {
      setLoadingRoster(false);
    }
  }, [classId]);

  const loadRemovedStudents = useCallback(async () => {
    setLoadingRemoved(true);
    try {
      const response = await getRemovedClassMembers(classId);
      setRemovedStudents(response.data || []);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load removed students.',
      });
    } finally {
      setLoadingRemoved(false);
    }
  }, [classId]);

  useEffect(() => {
    loadClass();
    loadRoster();
    loadRemovedStudents();
  }, [loadClass, loadRoster, loadRemovedStudents]);

  const handleAnnouncementChange = (event) => {
    const { name, value } = event.target;
    setNewAnnouncement((current) => ({ ...current, [name]: value }));
  };

  const submitAnnouncement = async (event) => {
    event.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      setToast({ isOpen: true, type: 'warning', message: 'Title and content are required.' });
      return;
    }

    setSubmittingAnnouncement(true);
    try {
      const response = await postAnnouncement(classId, newAnnouncement);
      setAnnouncements((current) => [response.data, ...current]);
      setNewAnnouncement({ title: '', content: '', expires_at: '' });
      setToast({ isOpen: true, type: 'success', message: 'Announcement posted successfully.' });
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to post announcement.',
      });
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const performAnnouncementDelete = async () => {
    if (!pendingAnnouncementDelete) return;
    try {
      await deleteAnnouncement(classId, pendingAnnouncementDelete);
      setAnnouncements((current) => current.filter((item) => item.id !== pendingAnnouncementDelete));
      setPendingAnnouncementDelete(null);
      setToast({ isOpen: true, type: 'success', message: 'Announcement deleted.' });
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to delete announcement.',
      });
    }
  };

  const openStudentModal = async (studentId) => {
    setStudentModalOpen(true);
    setStudentProfileLoading(true);
    setStudentProfile(null);
    setRemovalDraft({ action: 'kick', data_policy: 'keep', note: '' });

    try {
      const response = await getStudentClassProfile(classId, studentId);
      setStudentProfile(response.data);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to load student details.',
      });
      setStudentModalOpen(false);
    } finally {
      setStudentProfileLoading(false);
    }
  };

  const applyStudentAction = async () => {
    if (!studentProfile?.student?.id) return;

    setRemoveSubmitting(true);
    try {
      await removeStudentFromClass(classId, studentProfile.student.id, removalDraft);
      setToast({
        isOpen: true,
        type: 'success',
        message: removalDraft.action === 'ban' ? 'Student has been banned.' : 'Student has been removed.',
      });
      setRemoveConfirmOpen(false);
      setStudentModalOpen(false);
      await Promise.all([loadRoster(), loadRemovedStudents()]);
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to apply student action.',
      });
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const performUnban = async () => {
    if (!pendingUnbanStudent?.student_id) return;

    setUnbanSubmitting(true);
    try {
      await unbanStudentFromClass(classId, pendingUnbanStudent.student_id, {});
      setPendingUnbanStudent(null);
      setToast({ isOpen: true, type: 'success', message: 'Student unbanned successfully.' });
      await loadRemovedStudents();
    } catch (error) {
      setToast({
        isOpen: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to unban student.',
      });
    } finally {
      setUnbanSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6'>
      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((current) => ({ ...current, isOpen: false }))}
      />

      <button
        onClick={onBack}
        className='mb-5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/60'
      >
        Back to Classes
      </button>

      <section className='mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5'>
        <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>{classInfo?.class_name}</h1>
        {classInfo?.subject && <p className='mt-1 text-sm text-[var(--color-primary)]'>{classInfo.subject}</p>}

        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Room</p>
            <p className='text-sm text-[var(--color-text-primary)]'>{classInfo?.room_number || '-'}</p>
          </div>
          <div>
            <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Grade</p>
            <p className='text-sm text-[var(--color-text-primary)]'>{classInfo?.grade_level || '-'}</p>
          </div>
          <div>
            <p className='text-xs uppercase tracking-wide text-[var(--color-text-muted)]'>Capacity</p>
            <p className='text-sm text-[var(--color-text-primary)]'>{classInfo?.max_students || '-'}</p>
          </div>
        </div>

        {classInfo?.meeting_link && (
          <a
            href={classInfo.meeting_link}
            target='_blank'
            rel='noreferrer'
            className='mt-3 inline-block text-sm text-[var(--color-primary)] hover:underline'
          >
            Open class meeting link
          </a>
        )}

        <div className='mt-4'>
          <p className='text-sm font-medium text-[var(--color-text-secondary)] mb-2'>Detailed Schedule</p>
          {scheduleBlocks.length === 0 ? (
            <p className='text-sm text-[var(--color-text-muted)]'>No schedule blocks configured.</p>
          ) : (
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {scheduleBlocks.map((block, index) => (
                <div
                  key={`${block.day}-${block.start_time}-${index}`}
                  className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2'
                >
                  <p className='text-sm font-medium text-[var(--color-text-primary)]'>{block.day}</p>
                  <p className='text-xs text-[var(--color-text-muted)]'>
                    {formatTimeRange(block.start_time, block.end_time)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {classInfo?.description && (
          <div className='mt-4'>
            <p className='text-sm font-medium text-[var(--color-text-secondary)]'>Description</p>
            <p className='mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]'>{classInfo.description}</p>
          </div>
        )}
      </section>

      <section className='mb-6'>
        <h2 className='mb-3 text-xl font-semibold text-[var(--color-text-primary)]'>
          Enrolled Students ({roster.length})
        </h2>
        {loadingRoster ? (
          <div className='flex items-center gap-2 text-sm text-[var(--color-text-muted)]'>
            <SpinnerIcon />
            Loading roster...
          </div>
        ) : roster.length === 0 ? (
          <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]'>
            No students enrolled in this class.
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {roster.map((student) => (
              <button
                key={student.student_id}
                type='button'
                onClick={() => openStudentModal(student.student_id)}
                className='flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left hover:bg-[var(--color-border)]/40'
              >
                {student.profile_pic ? (
                  <img src={student.profile_pic} alt={student.username} className='h-10 w-10 rounded-full object-cover' />
                ) : (
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-semibold text-[var(--color-primary)]'>
                    {student.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium text-[var(--color-text-primary)]'>{student.username}</p>
                  <p className='truncate text-xs text-[var(--color-text-muted)]'>{student.email || 'No email'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className='mb-6'>
        <h2 className='mb-3 text-xl font-semibold text-[var(--color-text-primary)]'>Removed and Banned Students</h2>
        {loadingRemoved ? (
          <div className='flex items-center gap-2 text-sm text-[var(--color-text-muted)]'>
            <SpinnerIcon />
            Loading list...
          </div>
        ) : removedStudents.length === 0 ? (
          <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]'>
            No removed students yet.
          </div>
        ) : (
          <div className='space-y-2'>
            {removedStudents.map((student) => (
              <div
                key={`${student.student_id}-${student.updated_at}`}
                className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3'
              >
                <div>
                  <p className='text-sm font-medium text-[var(--color-text-primary)]'>
                    {student.username} ({student.status})
                  </p>
                  <p className='text-xs text-[var(--color-text-muted)]'>
                    Policy: {student.data_policy} {student.note ? `- ${student.note}` : ''}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    onClick={() => openStudentModal(student.student_id)}
                    className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/60'
                  >
                    View Profile
                  </button>
                  <button
                    type='button'
                    onClick={() => setPendingUnbanStudent(student)}
                    className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-success)] hover:bg-[var(--color-success)]/10'
                  >
                    Allow Re-enroll
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className='mb-3 text-xl font-semibold text-[var(--color-text-primary)]'>Announcements</h2>
        <form
          onSubmit={submitAnnouncement}
          className='mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
        >
          <div className='mb-2'>
            <input
              type='text'
              name='title'
              value={newAnnouncement.title}
              onChange={handleAnnouncementChange}
              placeholder='Title'
              className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
            />
          </div>
          <div className='mb-2'>
            <textarea
              name='content'
              rows='3'
              value={newAnnouncement.content}
              onChange={handleAnnouncementChange}
              placeholder='Announcement content'
              className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
            />
          </div>
          <div className='flex flex-wrap items-end gap-3'>
            <div>
              <label className='mb-1 block text-xs text-[var(--color-text-muted)]'>Expires</label>
              <input
                type='datetime-local'
                name='expires_at'
                value={newAnnouncement.expires_at}
                onChange={handleAnnouncementChange}
                className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
              />
            </div>
            <button
              type='submit'
              disabled={submittingAnnouncement}
              className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--color-primary-hover)]'
            >
              {submittingAnnouncement ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>

        {announcements.length === 0 ? (
          <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]'>
            No announcements posted yet.
          </div>
        ) : (
          <div className='space-y-3'>
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
              >
                <div className='mb-2 flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <h3 className='text-sm font-semibold text-[var(--color-text-primary)]'>{announcement.title}</h3>
                    <p className='text-xs text-[var(--color-text-muted)]'>
                      Posted {new Date(announcement.created_at).toLocaleString()}
                      {announcement.expires_at && ` • Expires ${new Date(announcement.expires_at).toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setPendingAnnouncementDelete(announcement.id)}
                    className='rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                  >
                    Delete
                  </button>
                </div>
                <p className='whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>{announcement.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {studentModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5'>
            <div className='mb-4 flex items-start justify-between gap-4'>
              <h3 className='text-xl font-semibold text-[var(--color-text-primary)]'>Student Details</h3>
              <button
                type='button'
                onClick={() => setStudentModalOpen(false)}
                className='rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/60'
              >
                Close
              </button>
            </div>

            {studentProfileLoading ? (
              <div className='flex items-center gap-2 text-sm text-[var(--color-text-muted)]'>
                <SpinnerIcon />
                Loading student profile...
              </div>
            ) : studentProfile?.student ? (
              <div className='space-y-4'>
                <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
                  <p className='text-sm font-medium text-[var(--color-text-primary)]'>
                    {studentProfile.student.username}
                  </p>
                  <p className='text-xs text-[var(--color-text-muted)]'>{studentProfile.student.email}</p>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)]'>
                    Status in this class: {studentProfile.classStatus?.status || 'active'}
                  </p>
                </div>

                <div>
                  <p className='mb-2 text-sm font-medium text-[var(--color-text-secondary)]'>
                    Current Enrolled Classes
                  </p>
                  {studentProfile.enrolledClasses?.length ? (
                    <div className='space-y-2'>
                      {studentProfile.enrolledClasses.map((classItem) => (
                        <div
                          key={classItem.id}
                          className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-2'
                        >
                          <p className='text-sm font-medium text-[var(--color-text-primary)]'>
                            {classItem.class_name}
                          </p>
                          <p className='text-xs text-[var(--color-text-muted)]'>
                            {classItem.subject || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-[var(--color-text-muted)]'>No active enrollments.</p>
                  )}
                </div>

                <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
                  <p className='mb-2 text-sm font-medium text-[var(--color-text-secondary)]'>Class Membership Action</p>
                  <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                    <div>
                      <label className='mb-1 block text-xs text-[var(--color-text-muted)]'>Action</label>
                      <select
                        value={removalDraft.action}
                        onChange={(event) =>
                          setRemovalDraft((current) => ({ ...current, action: event.target.value }))
                        }
                        className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                      >
                        <option value='kick'>Kick</option>
                        <option value='ban'>Ban</option>
                      </select>
                    </div>

                    <div>
                      <label className='mb-1 block text-xs text-[var(--color-text-muted)]'>Data Handling</label>
                      <select
                        value={removalDraft.data_policy}
                        onChange={(event) =>
                          setRemovalDraft((current) => ({ ...current, data_policy: event.target.value }))
                        }
                        className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                      >
                        <option value='keep'>Keep all data</option>
                        <option value='delete_grades'>Delete grades only</option>
                        <option value='delete_all'>Delete all class data</option>
                      </select>
                    </div>
                  </div>

                  <div className='mt-2'>
                    <label className='mb-1 block text-xs text-[var(--color-text-muted)]'>Note</label>
                    <textarea
                      rows='2'
                      value={removalDraft.note}
                      onChange={(event) =>
                        setRemovalDraft((current) => ({ ...current, note: event.target.value }))
                      }
                      className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                    />
                  </div>

                  <button
                    type='button'
                    disabled={removeSubmitting}
                    onClick={() => setRemoveConfirmOpen(true)}
                    className='mt-3 rounded-lg bg-[var(--color-danger)] px-4 py-2 text-sm text-white hover:bg-[var(--color-danger-hover)] disabled:opacity-60'
                  >
                    {removeSubmitting ? 'Applying...' : 'Apply Action'}
                  </button>
                </div>
              </div>
            ) : (
              <p className='text-sm text-[var(--color-text-muted)]'>Unable to load student profile.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingAnnouncementDelete)}
        onClose={() => setPendingAnnouncementDelete(null)}
        onConfirm={performAnnouncementDelete}
        title='Delete Announcement'
        message='Are you sure you want to delete this announcement?'
        confirmText='Delete'
        cancelText='Cancel'
        type='danger'
      />

      <ConfirmModal
        isOpen={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={applyStudentAction}
        title={removalDraft.action === 'ban' ? 'Ban Student' : 'Kick Student'}
        message={`This will ${removalDraft.action} the student from the class.`}
        confirmText='Confirm'
        cancelText='Cancel'
        type='warning'
      />

      <ConfirmModal
        isOpen={Boolean(pendingUnbanStudent)}
        onClose={() => setPendingUnbanStudent(null)}
        onConfirm={performUnban}
        title='Allow Re-enrollment'
        message='Allow this student to enroll in this class again?'
        confirmText={unbanSubmitting ? 'Please wait...' : 'Allow'}
        cancelText='Cancel'
        type='success'
      />
    </div>
  );
}