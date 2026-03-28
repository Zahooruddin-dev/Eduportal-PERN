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

export default function Dashboard() {
	const { user } = useAuth();
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState('dashboard');

	const renderContent = () => {
		// Admin and Parent roles – not fully supported
		if (user?.role === 'admin' || user?.role === 'parent') {
			return (
				<div className='flex items-center justify-center h-full'>
					<div className='text-center'>
						<h2 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
							{user?.role === 'admin' ? 'Admin Panel' : 'Parent Portal'}
						</h2>
						<p className='mt-2 text-[var(--color-text-muted)]'>
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
				default:
					return <EnrolledClasses />;
			}
		}

		// Teacher role
		if (user?.role === 'teacher') {
			switch (activeTab) {
				case 'schedule-management':
					return <ScheduleManagement />;
				case 'course-material':
					return <CourseMaterial />;
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
