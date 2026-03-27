// src/Dashboard/Sidebar/Tabs/ClassDetails.jsx
import { useState, useEffect } from 'react';
import { getClassById, getClassAnnouncements, postAnnouncement, deleteAnnouncement } from '../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../Icons/Icon';
import { useTheme } from '../../../../hooks/useTheme';

export default function ClassDetails({ classId, onBack }) {
  const [classInfo, setClassInfo] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', expires_at: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [classRes, announcementsRes] = await Promise.all([
        getClassById(classId),
        getClassAnnouncements(classId)
      ]);
      setClassInfo(classRes.data);
      setAnnouncements(announcementsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId]);

  const handleAnnouncementChange = (e) => {
    const { name, value } = e.target;
    setNewAnnouncement(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      setError('Title and content are required');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await postAnnouncement(classId, newAnnouncement);
      setAnnouncements(prev => [res.data, ...prev]);
      setNewAnnouncement({ title: '', content: '', expires_at: '' });
      setSuccess('Announcement posted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(classId, announcementId);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      setSuccess('Announcement deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon />
      </div>
    );
  }

  if (error && !classInfo) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 text-[var(--color-primary)] hover:underline">← Back</button>
        <AlertBox message={error} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-6 text-[var(--color-primary)] hover:underline flex items-center gap-1">
        ← Back to Classes
      </button>

      {/* Class Details */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{classInfo.class_name}</h1>
        {classInfo.subject && (
          <p className="text-sm text-[var(--color-primary)] mt-1">{classInfo.subject}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-[var(--color-text-secondary)]">Schedule</p>
            <p className="font-medium text-[var(--color-text-primary)]">{classInfo.schedule_days}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-secondary)]">Time</p>
            <p className="font-medium text-[var(--color-text-primary)]">{classInfo.start_time} – {classInfo.end_time}</p>
          </div>
          {classInfo.room_number && (
            <div>
              <p className="text-[var(--color-text-secondary)]">Room</p>
              <p className="font-medium text-[var(--color-text-primary)]">{classInfo.room_number}</p>
            </div>
          )}
          {classInfo.grade_level && (
            <div>
              <p className="text-[var(--color-text-secondary)]">Grade</p>
              <p className="font-medium text-[var(--color-text-primary)]">{classInfo.grade_level}</p>
            </div>
          )}
          {classInfo.max_students && (
            <div>
              <p className="text-[var(--color-text-secondary)]">Max Students</p>
              <p className="font-medium text-[var(--color-text-primary)]">{classInfo.max_students}</p>
            </div>
          )}
        </div>
        {classInfo.description && (
          <div className="mt-4">
            <p className="text-[var(--color-text-secondary)]">Description</p>
            <p className="text-[var(--color-text-primary)] mt-1 whitespace-pre-wrap">{classInfo.description}</p>
          </div>
        )}
      </div>

      {/* Announcements Section */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Announcements</h2>

        {/* Create Announcement Form */}
        <form onSubmit={handleSubmitAnnouncement} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
          <div className="mb-3">
            <input
              type="text"
              name="title"
              value={newAnnouncement.title}
              onChange={handleAnnouncementChange}
              placeholder="Title"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              required
            />
          </div>
          <div className="mb-3">
            <textarea
              name="content"
              rows="3"
              value={newAnnouncement.content}
              onChange={handleAnnouncementChange}
              placeholder="Announcement content"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              required
            />
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Expires (optional)</label>
              <input
                type="datetime-local"
                name="expires_at"
                value={newAnnouncement.expires_at}
                onChange={handleAnnouncementChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? <SpinnerIcon /> : 'Post'}
            </button>
          </div>
          {error && <AlertBox message={error} />}
          {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        </form>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No announcements yet.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{ann.title}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Posted on {new Date(ann.created_at).toLocaleString()}
                      {ann.expires_at && ` • Expires ${new Date(ann.expires_at).toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    aria-label="Delete"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-2 text-[var(--color-text-secondary)] whitespace-pre-wrap">{ann.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}