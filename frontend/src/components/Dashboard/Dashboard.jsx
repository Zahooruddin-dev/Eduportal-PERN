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
import AdminAnnouncements from '../Sidebar/Tabs/AdminTabs/Announcements/AdminAnnouncements';
import AdminNotificationsCenter from '../Sidebar/Tabs/Shared/AdminNotificationsCenter';
import { getAdminNotificationUnreadSummary, markAllAdminNotificationsRead } from '../../api/api';

const ROLE_TAB_CONFIG = {
	admin: {
		defaultTab: 'admin-user-management',
		allowed: new Set(['admin-user-management', 'admin-announcements', 'admin-reports', 'profile']),
	},
	student: {
		defaultTab: 'enrolled-classes',
		allowed: new Set([
			'enrolled-classes',
			'notifications',
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
			'notifications',
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
	parent: {
		defaultTab: 'parent-announcements',
		allowed: new Set([
			'parent-announcements',
			'parent-teacher-complaint',
			'parent-suggestions',
			'parent-report',
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
	const [popupState, setPopupState] = useState({
		isOpen: false,
		items: [],
		unreadCount: 0,
		markingAll: false,
	});

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

	useEffect(() => {
		const supportsPopupRole = user?.role === 'student' || user?.role === 'teacher' || user?.role === 'parent';
		if (!supportsPopupRole || !user?.id) return;

		const sessionKey = `admin-announcement-popup:${user.id}`;
		if (sessionStorage.getItem(sessionKey) === 'shown') {
			return;
		}

		let active = true;

		const checkUnread = async () => {
			try {
				const response = await getAdminNotificationUnreadSummary({ limit: 4 });
				const unreadCount = Number(response.data?.unreadCount || 0);
				const items = response.data?.items || [];
				if (!active || unreadCount <= 0) {
					return;
				}
				sessionStorage.setItem(sessionKey, 'shown');
				setPopupState({
					isOpen: true,
					items,
					unreadCount,
					markingAll: false,
				});
			} catch {
				return null;
			}
		};

		checkUnread();

		return () => {
			active = false;
		};
	}, [user?.id, user?.role]);

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
				case 'admin-announcements':
					return <AdminAnnouncements />;
				case 'admin-reports':
					return <AdminReports />;
				case 'profile':
					return <Profile />;
				default:
					return <UserManagement />;
			}
		}

		if (user?.role === 'parent') {
			switch (activeTab) {
				case 'parent-announcements':
					return (
						<AdminNotificationsCenter
							title='Announcements'
							subtitle='Read the latest announcements shared by your institute admin.'
						/>
					);
				case 'parent-teacher-complaint':
					return (
						<ReportCenter
							presetKind='complaint'
							lockKind
							defaultTargetRole='teacher'
							heading='Teacher Complaints'
							subheading='Submit complaints related to teacher conduct or classroom concerns.'
							submitLabel='Submit Complaint'
						/>
					);
				case 'parent-suggestions':
					return (
						<ReportCenter
							presetKind='suggestion'
							lockKind
							heading='Suggestions'
							subheading='Share improvement ideas with your institute administration.'
							submitLabel='Submit Suggestion'
						/>
					);
				case 'parent-report':
					return (
						<ReportCenter
							presetKind='report'
							lockKind
							heading='Report'
							subheading='Report incidents, issues, or urgent concerns for admin review.'
							submitLabel='Submit Report'
						/>
					);
				case 'profile':
					return <Profile />;
				default:
					return (
						<AdminNotificationsCenter
							title='Announcements'
							subtitle='Read the latest announcements shared by your institute admin.'
						/>
					);
			}
		}

		// Student role
		if (user?.role === 'student') {
			switch (activeTab) {
				case 'enrolled-classes':
					return <EnrolledClasses />;
				case 'notifications':
					return (
						<AdminNotificationsCenter
							title='Notifications'
							subtitle='Announcements from your institute admin are shown here.'
						/>
					);
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
				case 'notifications':
					return (
						<AdminNotificationsCenter
							title='Notifications'
							subtitle='Announcements from your institute admin are shown here.'
						/>
					);
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

	const handleMarkAllPopupRead = async () => {
		setPopupState((previous) => ({ ...previous, markingAll: true }));
		try {
			await markAllAdminNotificationsRead();
			setPopupState({ isOpen: false, items: [], unreadCount: 0, markingAll: false });
		} catch {
			setPopupState((previous) => ({ ...previous, markingAll: false }));
		}
	};

	return (
		<>
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

			{popupState.isOpen && (
				<div className='overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
					<div className='fade-scale-in w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl'>
						<h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>Unread announcements</h2>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
							You have {popupState.unreadCount} unread admin announcement{popupState.unreadCount > 1 ? 's' : ''}.
						</p>

						<div className='mt-4 max-h-72 space-y-3 overflow-auto pr-1'>
							{popupState.items.map((item) => (
								<article key={item.id} className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'>
									<h3 className='text-sm font-semibold text-[var(--color-text-primary)]'>{item.title}</h3>
									<p className='mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>{item.content}</p>
								</article>
							))}
						</div>

						<div className='mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
							<button
								type='button'
								onClick={() => setPopupState((previous) => ({ ...previous, isOpen: false }))}
								className='rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
							>
								View later
							</button>
							<button
								type='button'
								onClick={handleMarkAllPopupRead}
								disabled={popupState.markingAll}
								className='rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
							>
								{popupState.markingAll ? 'Saving...' : 'Mark all as read'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
