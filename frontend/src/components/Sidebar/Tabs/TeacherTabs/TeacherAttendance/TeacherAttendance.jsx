import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { getMyClasses, getClassEnrolledRooster, getClassAttendance, postAttendance } from '../../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../../Icons/Icon';
import { Calendar, Save } from 'lucide-react';
import Toast from '../../../../../components/Toast';
import ConfirmModal from '../../../../../components/ConfirmModal';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch teacher's classes
  const fetchClasses = async () => {
    setLoading(true);
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

  // When a class is selected, fetch its roster and current attendance for the selected date
  const fetchAttendanceForClass = async (classId, date) => {
    setLoadingRoster(true);
    try {
      // Get roster
      const rosterRes = await getClassEnrolledRooster(classId);
      const studentsList = rosterRes.data;
      setStudents(studentsList);

      // Get existing attendance for the date
      const attendanceRes = await getClassAttendance(classId, date);
      const attendanceData = attendanceRes.data.attendance; // assumes { date, attendance: [...] }

      // Build map of studentId -> status
      const map = {};
      attendanceData.forEach(record => {
        map[record.studentId] = record.status;
      });
      // For students without recorded status, default to 'present'
      studentsList.forEach(student => {
        if (!map[student.student_id]) map[student.student_id] = 'present';
      });
      setAttendanceMap(map);
    } catch (err) {
      setError('Failed to load attendance data');
    } finally {
      setLoadingRoster(false);
    }
  };

  // When selectedClass or selectedDate changes, fetch attendance
  useEffect(() => {
    if (selectedClass) {
      fetchAttendanceForClass(selectedClass.id, selectedDate);
    }
  }, [selectedClass, selectedDate]);

  // Handle status change for a student
  const handleStatusChange = (studentId, newStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: newStatus }));
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    const attendanceData = students.map(student => ({
      studentId: student.student_id,
      status: attendanceMap[student.student_id] || 'present'
    }));
    try {
      await postAttendance(selectedClass.id, {
        date: selectedDate,
        attendance: attendanceData
      });
      setToast({ isOpen: true, type: 'success', message: 'Attendance saved successfully!' });
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon />
      </div>
    );
  }

  if (error && !selectedClass) {
    return (
      <div className="p-6">
        <AlertBox message={error} />
      </div>
    );
  }

  if (!selectedClass) {
    // Show class selection grid
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
          Student Attendance
        </h1>
        {error && <AlertBox message={error} />}
        {classes.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">
            You haven't created any classes yet. Please create a class first.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {cls.class_name}
                </h3>
                {cls.subject && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {cls.subject}
                  </p>
                )}
                <div className="mt-4">
                  <span className="text-sm text-[var(--color-primary)]">
                    Mark Attendance →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Attendance view for selected class
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedClass(null)}
          className="text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          ← Back to Classes
        </button>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loadingRoster}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? <SpinnerIcon /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
        {selectedClass.class_name} – Attendance
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Mark attendance for {selectedDate}
      </p>

      {loadingRoster ? (
        <div className="flex justify-center py-8"><SpinnerIcon /></div>
      ) : students.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-center py-8">
          No students enrolled in this class yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <thead className="bg-[var(--color-border)]/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {student.profile_pic ? (
                        <img
                          src={student.profile_pic}
                          alt={student.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm font-medium">
                          {student.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {student.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={attendanceMap[student.student_id] || 'present'}
                      onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast and confirm modal*/}
      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast({ isOpen: false, type: 'success', message: '' })}
      />
    </div>
  );
}