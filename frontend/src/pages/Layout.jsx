import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import Classes from '../components/Sidebar/Classes/Classes';
import Announcements from '../components/Sidebar/Announcements/Announcements';
import Profile from '../components/Sidebar/Profile/Profile';
import TeacherClasses from '../components/Sidebar/TeacherClasses/TeacherClasses';
import LiveSessions from '../components/Sidebar/Students-Sidebar/LiveSessions';
import AcademicCalender from '../components/Sidebar/Students-Sidebar/AcademicCalender';
import CourseMaterial from '../components/Sidebar/Students-Sidebar/CourseMaterial';
import GradeBook from '../components/Sidebar/Students-Sidebar/GradeBook';
import Report from '../components/Sidebar/Students-Sidebar/Report';
import { useAuth } from '../utils/AuthContext';
import Enrolled from '../components/Sidebar/Enrolled/Enrolled';

const Layout = () => {
	const [activePage, setActivePage] = useState(null);
	const { user, refreshUser } = useAuth();
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [imageTimestamp, setImageTimestamp] = useState(Date.now());
	const [visitedPages, setVisitedPages] = useState(new Set());

	const handlePageChange = (pageId) => {
		if (activePage !== pageId) {
			setActivePage(pageId);
			setVisitedPages((prev) => new Set(prev).add(pageId));
			if (pageId === 'profile') refreshUser();
		}
	};

	const getProfileImageUrl = () => {
		if (user?.profile) {
			const isFullUrl = user.profile.startsWith('http');
			return isFullUrl
				? `${user.profile}?t=${imageTimestamp}`
				: `http://localhost:3000${user.profile}?t=${imageTimestamp}`;
		}
		return null;
	};

	const handleProfileUpdate = () => {
		setImageTimestamp(Date.now());
		refreshUser();
	};

	useEffect(() => {
		if (user && isInitialLoad) {
			const startPage =
				user.role === 'teacher'
					? 'teacher-classes'
					: user.role === 'student'
						? 'live-sessions'
						: 'profile';
			setActivePage(startPage);
			setVisitedPages(new Set([startPage]));
			setIsInitialLoad(false);
		}
	}, [user, isInitialLoad]);

	const pages = [
		{ id: 'live-sessions', component: <LiveSessions /> },
		{ id: 'academic-calender', component: <AcademicCalender /> },
		{ id: 'course-material', component: <CourseMaterial /> },
		{ id: 'gradebook', component: <GradeBook /> },
		{ id: 'report', component: <Report /> },
		{ id: 'enrolled-classes', component: <Enrolled userId={user?.id} /> },
		{
			id: 'classes',
			component: <Classes currentUser={user?.role} currentUserId={user?.id} />,
		},
		{
			id: 'teacher-classes',
			component: <TeacherClasses currentUserId={user?.id} />,
		},
		{ id: 'announcements', component: <Announcements userRole={user?.role} /> },
		{
			id: 'profile',
			component: (
				<Profile
					user={user}
					profileImageUrl={getProfileImageUrl()}
					onProfileUpdate={handleProfileUpdate}
				/>
			),
		},
	];

	return (
		<div className='flex min-h-screen w-full bg-[var(--app-bg)] text-[var(--app-text)]'>
			<Sidebar
				activePage={activePage}
				userName={user?.username}
				userRole={user?.role}
				userProfile={getProfileImageUrl()}
				onPageChange={handlePageChange}
			/>
			<main className='app-content min-h-screen'>
				<div className='w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 2xl:mx-auto 2xl:max-w-[1600px]'>
					{pages.map(({ id, component }) => {
						if (!visitedPages.has(id)) return null;
						return (
							<div
								key={id}
								style={{ display: activePage === id ? 'block' : 'none' }}
							>
								{component}
							</div>
						);
					})}
				</div>
			</main>
		</div>
	);
};

export default Layout;
