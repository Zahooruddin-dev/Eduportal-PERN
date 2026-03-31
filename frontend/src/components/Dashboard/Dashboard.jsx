// Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import CommunicationCenter from '../Sidebar/Tabs/Shared/CommunicationCenter';

const ROLE_TAB_CONFIG = {
	admin: {
		defaultTab: 'admin-user-management',
		allowed: new Set(['admin-user-management', 'admin-reports', 'profile']),
	},
	student: {
		defaultTab: 'enrolled-classes',
		allowed: new Set([
			'enrolled-classes',
			'academic-calendar',
			'announcements',
			'teacher-communication',
			'course-material',
			'gradebook',
			'profile',
			'assignments',
			'report',
		]),
	},
	teacher: {
		defaultTab: 'teacher-class',
		allowed: new Set([
			'teacher-class',
			'teacher-calendar',
			'student-communication',
			'gradebook-teacher',
			'course-material',
			'teacher-attendance',
			'assignments',
			'report',
			'profile',
		]),
	},
};

function getRoleTabConfig(role) {
	return ROLE_TAB_CONFIG[String(role || '').toLowerCase()] || null;
}

export default function Dashboard() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { tab } = useParams();
	const [collapsed, setCollapsed] = useState(false);

	const roleConfig = useMemo(() => getRoleTabConfig(user?.role), [user?.role]);

	const activeTab = useMemo(() => {
		if (!roleConfig) return null;
		const requested = String(tab || '').trim().toLowerCase();
		if (roleConfig.allowed.has(requested)) {
			return requested;
		}
		return roleConfig.defaultTab;
	}, [roleConfig, tab]);

	useEffect(() => {
		if (!roleConfig) return;
		const requested = String(tab || '').trim().toLowerCase();
		if (!requested || !roleConfig.allowed.has(requested)) {
			navigate(`/dashboard/${roleConfig.defaultTab}`, { replace: true });
		}
	}, [navigate, roleConfig, tab]);

	const setActiveTab = (nextTab) => {
		if (!roleConfig) return;
		const normalized = String(nextTab || '').trim().toLowerCase();
		if (!roleConfig.allowed.has(normalized)) {
			navigate(`/dashboard/${roleConfig.defaultTab}`);
			return;
		}
		navigate(`/dashboard/${normalized}`);
	};

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
				case 'teacher-communication':
					return <CommunicationCenter />;
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
				case 'student-communication':
					return <CommunicationCenter />;
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
		<div className='flex min-h-screen bg-[var(--color-bg)] lg:h-screen'>
			<Sidebar
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
			/>
			<main className='flex-1 overflow-auto pt-14 transition-all duration-300 lg:pt-0'>
				{renderContent()}
			</main>
		</div>
	);
}
