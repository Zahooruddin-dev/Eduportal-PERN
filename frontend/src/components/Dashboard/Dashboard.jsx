import { useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../Sidebar/Sidebar';
import { SpinnerIcon } from '../Icons/Icon';

// Lazy load all tab components for better initial load performance // beta-testing
const Profile = lazy(() => import('../Sidebar/Profile/Profile'));
const EnrolledClasses = lazy(() => import('../Sidebar/Tabs/StudentTabs/EnrolledClasses/EnrolledClasses'));
const ScheduleManagement = lazy(() => import('../Sidebar/Tabs/TeacherTabs/ScheduleManagement/ScheduleManagement'));
const StudentAnnouncements = lazy(() => import('../Sidebar/Tabs/StudentTabs/StudentAnnouncements/StudentAnnouncements'));
const CourseMaterial = lazy(() => import('../Sidebar/Tabs/TeacherTabs/CourseMaterial/CourseMaterial'));
const StudentCourseMaterial = lazy(() => import('../Sidebar/Tabs/StudentTabs/CourseMaterial/StudentCourseMaterial'));
const TeacherAttendance = lazy(() => import('../Sidebar/Tabs/TeacherTabs/TeacherAttendance/TeacherAttendance'));
const TeacherAssignments = lazy(() => import('../Sidebar/Tabs/TeacherTabs/Assignments/Assignments'));
const StudentAssignments = lazy(() => import('../Sidebar/Tabs/StudentTabs/StudentAssignments/StudentAssignments'));
const Gradebook = lazy(() => import('../Sidebar/Tabs/TeacherTabs/Gradebook/Gradebook'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <SpinnerIcon />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Memoize the content to avoid re‑rendering on every parent state change
  const content = useMemo(() => {
    // Admin and Parent roles – not fully supported
    if (user?.role === 'admin' || user?.role === 'parent') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {user?.role === 'admin' ? 'Admin Panel' : 'Parent Portal'}
            </h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              This role is not fully supported yet. Coming soon!
            </p>
          </div>
        </div>
      );
    }

    // Student role
    if (user?.role === 'student') {
      switch (activeTab) {
        case 'enrolled-classes':
          return <EnrolledClasses />;
        case 'announcements':
          return <StudentAnnouncements />;
        case 'course-material':
          return <StudentCourseMaterial />;
        case 'profile':
          return <Profile />;
        case 'assignments':
          return <StudentAssignments />;
        default:
          return <EnrolledClasses />;
      }
    }

    // Teacher role
    if (user?.role === 'teacher') {
      switch (activeTab) {
        case 'schedule-management':
          return <ScheduleManagement />;
        case 'gradebook-teacher':
          return <Gradebook />;
        case 'course-material':
          return <CourseMaterial />;
        case 'teacher-attendance':
          return <TeacherAttendance />;
        case 'assignments':
          return <TeacherAssignments />;
        case 'profile':
          return <Profile />;
        default:
          return <ScheduleManagement />;
      }
    }

    return null;
  }, [activeTab, user?.role]);

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <main className="flex-1 overflow-auto transition-all duration-300">
        <Suspense fallback={<LoadingFallback />}>
          {content}
        </Suspense>
      </main>
    </div>
  );
}