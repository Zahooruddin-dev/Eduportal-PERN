// Dashboard.jsx
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../Sidebar/Sidebar';
import {
	getAdminNotificationUnreadSummary,
	markAllAdminNotificationsRead,
} from '../../api/api';

const Profile = lazy(() => import('../Sidebar/Profile/Profile'));
const EnrolledClasses = lazy(
	() => import('../Sidebar/Tabs/StudentTabs/EnrolledClasses/EnrolledClasses'),
);
const ScheduleManagement = lazy(
	() =>
		import('../Sidebar/Tabs/TeacherTabs/ScheduleManagement/ScheduleManagement'),
);
const StudentAnnouncements = lazy(
	() =>
		import('../Sidebar/Tabs/StudentTabs/StudentAnnouncements/StudentAnnouncements'),
);
const CourseMaterial = lazy(
	() => import('../Sidebar/Tabs/TeacherTabs/CourseMaterial/CourseMaterial'),
);
const StudentCourseMaterial = lazy(
	() =>
		import('../Sidebar/Tabs/StudentTabs/CourseMaterial/StudentCourseMaterial'),
);
const TeacherAttendance = lazy(
	() =>
		import('../Sidebar/Tabs/TeacherTabs/TeacherAttendance/TeacherAttendance'),
);
const TeacherAssignments = lazy(
	() => import('../Sidebar/Tabs/TeacherTabs/Assignments/Assignments'),
);
const StudentAssignments = lazy(
	() =>
		import('../Sidebar/Tabs/StudentTabs/StudentAssignments/StudentAssignments'),
);
const Gradebook = lazy(
	() => import('../Sidebar/Tabs/TeacherTabs/Gradebook/Gradebook'),
);
const StudentGradebook = lazy(
	() => import('../Sidebar/Tabs/StudentTabs/Gradebook/StudentGradebook'),
);
const AcademicCalender = lazy(
	() => import('../Sidebar/Tabs/StudentTabs/AcademicCalender/AcademicCalender'),
);
const TeacherCalender = lazy(
	() => import('../Sidebar/Tabs/TeacherTabs/TeacherCalender/TeacherCalender'),
);
const UserManagement = lazy(
	() => import('../Sidebar/Tabs/AdminTabs/UserManagement/UserManagement'),
);
const AdminReports = lazy(
	() => import('../Sidebar/Tabs/AdminTabs/Reports/AdminReports'),
);
const AdminRiskOverview = lazy(
	() => import('../Sidebar/Tabs/AdminTabs/RiskOverview/AdminRiskOverview'),
);
const AdminAcademicCalendar = lazy(
	() => import('../Sidebar/Tabs/AdminTabs/AcademicCalendar/AdminAcademicCalendar'),
);
const ReportCenter = lazy(() => import('../Sidebar/Tabs/Shared/ReportCenter'));
/* const CommunicationCenter = lazy(() => import('../Sidebar/Tabs/Shared/CommunicationCenter'));
 */ const CommunicationCenter = lazy(
	() => import('../Sidebar/Tabs/Shared/CommunicationCenter/Index'),
);
const AdminAnnouncements = lazy(
	() => import('../Sidebar/Tabs/AdminTabs/Announcements/AdminAnnouncements'),
);
const AdminNotificationsCenter = lazy(
	() => import('../Sidebar/Tabs/Shared/AdminNotificationsCenter'),
);
const ParentProfileCenter = lazy(
	() => import('../Sidebar/Tabs/ParentTabs/ParentProfileCenter'),
);

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'mizuka:sidebar-collapsed';

function getInitialSidebarCollapsed() {
	if (typeof window === 'undefined') return false;

	try {
		return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function TabLoadingFallback() {
	return (
		<div className='p-6'>
			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]'>
				Loading section...
			</div>
		</div>
	);
}

const ROLE_TAB_CONFIG = {
	admin: {
		defaultTab: 'admin-user-management',
		allowed: new Set([
			'admin-user-management',
			'admin-risk-overview',
			'admin-academic-calendar',
			'admin-announcements',
			'admin-reports',
			'profile',
		]),
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
			'parent-profile-center',
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
	const [collapsed, setCollapsed] = useState(getInitialSidebarCollapsed);
	const [popupState, setPopupState] = useState({
		isOpen: false,
		items: [],
		unreadCount: 0,
		markingAll: false,
	});

	const roleConfig = useMemo(() => getRoleTabConfig(user?.role), [user?.role]);

	const activeTab = useMemo(() => {
		if (!roleConfig) return null;
		const requested = String(tab || '')
			.trim()
			.toLowerCase();
		if (roleConfig.allowed.has(requested)) {
			return requested;
		}
		return roleConfig.defaultTab;
	}, [roleConfig, tab]);

	useEffect(() => {
		if (!roleConfig) return;
		const requested = String(tab || '')
			.trim()
			.toLowerCase();
		if (!requested || !roleConfig.allowed.has(requested)) {
			navigate(`/dashboard/${roleConfig.defaultTab}`, { replace: true });
		}
	}, [navigate, roleConfig, tab]);

	useEffect(() => {
		try {
			window.localStorage.setItem(
				SIDEBAR_COLLAPSE_STORAGE_KEY,
				collapsed ? '1' : '0',
			);
		} catch {
			return;
		}
	}, [collapsed]);

	useEffect(() => {
		const supportsPopupRole =
			user?.role === 'student' ||
			user?.role === 'teacher' ||
			user?.role === 'parent';
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
		const normalized = String(nextTab || '')
			.trim()
			.toLowerCase();
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
				case 'admin-risk-overview':
					return <AdminRiskOverview />;
				case 'admin-academic-calendar':
					return <AdminAcademicCalendar />;
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
				case 'parent-profile-center':
					return <ParentProfileCenter />;
				case 'parent-teacher-complaint':
					return (
						<ReportCenter
							presetKind='complaint'
							lockKind
							defaultTargetRole='teacher'
							allowedTypes={[
								'teacher_conduct',
								'academic_issue',
								'attendance_issue',
								'bullying_harassment',
								'other',
							]}
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
							allowedTypes={[
								'academic_issue',
								'schedule_issue',
								'infrastructure_issue',
								'other',
							]}
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
							allowedTypes={[
								'technical_issue',
								'fees_issue',
								'infrastructure_issue',
								'other',
							]}
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
			setPopupState({
				isOpen: false,
				items: [],
				unreadCount: 0,
				markingAll: false,
			});
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
					<Suspense fallback={<TabLoadingFallback />}>
						{renderContent()}
					</Suspense>
				</main>
			</div>

			{popupState.isOpen && (
				<div className='overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
					<div className='fade-scale-in w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl'>
						<h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>
							Unread announcements
						</h2>
						<p className='mt-1 text-sm text-[var(--color-text-muted)]'>
							You have {popupState.unreadCount} unread admin announcement
							{popupState.unreadCount > 1 ? 's' : ''}.
						</p>

						<div className='mt-4 max-h-72 space-y-3 overflow-auto pr-1'>
							{popupState.items.map((item) => (
								<article
									key={item.id}
									className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'
								>
									<h3 className='text-sm font-semibold text-[var(--color-text-primary)]'>
										{item.title}
									</h3>
									<p className='mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>
										{item.content}
									</p>
								</article>
							))}
						</div>

						<div className='mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
							<button
								type='button'
								onClick={() =>
									setPopupState((previous) => ({ ...previous, isOpen: false }))
								}
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
