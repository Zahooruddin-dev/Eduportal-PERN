// Dashboard.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../Sidebar/Sidebar';
import Profile from '../Sidebar/Profile/Profile';
import EnrolledClasses from '../Sidebar/Tabs/StudentTabs/EnrolledClasses/EnrolledClasses';
import ScheduleManagement from '../Sidebar/Tabs/TeacherTabs/ScheduleManagement/ScheduleManagement';
import StudentAnnouncements from '../Sidebar/Tabs/StudentTabs/StudentAnnouncements/StudentAnnouncements';
import CourseMaterial from '../Sidebar/Tabs/TeacherTabs/CourseMaterial/CourseMaterial';
import StudentCourseMaterial from '../Sidebar/Tabs/StudentTabs/CourseMaterial/StudentCourseMaterial';
import TeacherAttendance from '../Sidebar/Tabs/TeacherTabs/TeacherAttendance/TeacherAttendance';
import TeacherAssignments from '../Sidebar/Tabs/TeacherTabs/Assignments/Assignments';
import StudentAssignments from '../Sidebar/Tabs/StudentTabs/StudentAssignments/StudentAssignments';
import Gradebook from '../Sidebar/Tabs/TeacherTabs/Gradebook/Gradebook';
import StudentGradebook from '../Sidebar/Tabs/StudentTabs/Gradebook/StudentGradebook';
import AcademicCalender from '../Sidebar/Tabs/StudentTabs/AcademicCalender/AcademicCalender';
import TeacherCalender from '../Sidebar/Tabs/TeacherTabs/TeacherCalender/TeacherCalender';
import UserManagement from '../Sidebar/Tabs/AdminTabs/UserManagement/UserManagement';
import AdminReports from '../Sidebar/Tabs/AdminTabs/Reports/AdminReports';
import ReportCenter from '../Sidebar/Tabs/Shared/ReportCenter';

export default function Dashboard() {
	const { user } = useAuth();
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState('dashboard');

	const renderContent = () => {
		if (user?.role === 'admin') {
			switch (activeTab) {
				case 'admin-user-management':
					return <UserManagement />;
				case 'admin-reports':
					return <AdminReports />;
				case 'profile':
					return <Profile />;
				default:
					return <UserManagement />;
			}
		}

		if (user?.role === 'parent') {
			return null;
		}

		// Student role
		if (user?.role === 'student') {
			switch (activeTab) {
				case 'enrolled-classes':
					return <EnrolledClasses />;
				case 'academic-calendar':
					return <AcademicCalender />;
				case 'announcements':
					return <StudentAnnouncements />;
				case 'course-material':
					return <StudentCourseMaterial />;
				case 'gradebook':
					return <StudentGradebook />;
				case 'profile':
					return <Profile />;
				case 'assignments':
					return <StudentAssignments />;
				case 'report':
					return <ReportCenter />;
				default:
					return <EnrolledClasses />;
			}
		}

		// Teacher role
		if (user?.role === 'teacher') {
			switch (activeTab) {
				case 'teacher-class':
					return <ScheduleManagement />;
				case 'teacher-calendar':
					return <TeacherCalender />;
				case 'gradebook-teacher':
					return <Gradebook />;
				case 'course-material':
					return <CourseMaterial />;
				case 'teacher-attendance':
					return <TeacherAttendance />;
				case 'assignments':
					return <TeacherAssignments />;
				case 'report':
					return <ReportCenter />;
				case 'profile':
					return <Profile />;
				default:
					return <ScheduleManagement />;
			}
		}

		return null;
	};

	return (
		<div className='flex h-screen bg-[var(--color-bg)]'>
			<Sidebar
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
			/>
			<main className='flex-1 overflow-auto transition-all duration-300'>
				{renderContent()}
			</main>
		</div>
	);
}
