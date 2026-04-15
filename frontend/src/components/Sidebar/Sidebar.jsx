import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import {
	Menu,
	ChevronLeft,
	ChevronRight,
	Bell,
	Calendar,
	BookOpen,
	FileText,
	User,
	BarChart,
	MessageSquare,
	UserCheck,
	LogOut,
	GraduationCap,
	Sun,
	Megaphone,
	X,
	Users,
} from 'lucide-react';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import logo from '../../assets/logo.png';
import {
	getAdminNotificationUnreadSummary,
	getCommunicationUnreadCount,
} from '../../api/api';
import { io } from 'socket.io-client';

const studentNavItems = [
	{ id: 'enrolled-classes', label: 'Enrolled Classes', icon: GraduationCap },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
	{ id: 'announcements', label: 'Announcements', icon: Megaphone },
	{
		id: 'teacher-communication',
		label: 'Teacher Communication',
		icon: MessageSquare,
	},
	{ id: 'academic-calendar', label: 'Academic Calendar', icon: Calendar },
	{ id: 'course-material', label: 'Course Material', icon: BookOpen },
	{ id: 'gradebook', label: 'Gradebook', icon: BarChart },
	{ id: 'assignments', label: 'Assignments', icon: FileText },
	{ id: 'report', label: 'Report', icon: FileText },
];

const teacherNavItems = [
	{ id: 'teacher-class', label: 'Classes', icon: GraduationCap },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
	{ id: 'teacher-calendar', label: 'Calendar', icon: Calendar },
	{ id: 'gradebook-teacher', label: 'Gradebook', icon: BarChart },
	{ id: 'course-material', label: 'Course Material', icon: BookOpen },
	{ id: 'assignments', label: 'Assignments', icon: FileText },
	{
		id: 'student-communication',
		label: 'Student Communication',
		icon: MessageSquare,
	},
	{ id: 'teacher-attendance', label: 'Student Attendance', icon: UserCheck },
	{ id: 'report', label: 'Report', icon: FileText },
];

const parentNavItems = [
	{ id: 'parent-announcements', label: 'Announcements', icon: Megaphone },
	{ id: 'parent-profile-center', label: 'Parent Profile', icon: User },
	{
		id: 'parent-teacher-complaint',
		label: 'Teacher Complaint',
		icon: MessageSquare,
	},
	{ id: 'parent-suggestions', label: 'Suggestions', icon: FileText },
	{ id: 'parent-report', label: 'Report', icon: FileText },
];

const adminNavItems = [
	{ id: 'admin-user-management', label: 'User Management', icon: Users },
	{ id: 'admin-risk-overview', label: 'Risk Overview', icon: BarChart },
	{ id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
	{ id: 'admin-reports', label: 'Reports', icon: FileText },
];

function NavTooltip({ label, visible }) {
	return (
		<div
			role='tooltip'
			aria-hidden={!visible}
			className={`
        absolute left-full ml-3 px-2.5 py-1.5 rounded-lg
        bg-[var(--color-text-primary)] text-[var(--color-bg)]
        text-xs font-medium whitespace-nowrap pointer-events-none z-50 shadow-lg
        transition-all duration-150
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}
      `}
		>
			{label}
		</div>
	);
}

function NavItem({ item, active, collapsed, onClick, onMobileClose }) {
	const [hovered, setHovered] = useState(false);
	const Icon = item.icon;

	const handleClick = () => {
		onClick(item.id);
		onMobileClose?.();
	};

	return (
		<div
			className='relative px-2'
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<button
				type='button'
				onClick={handleClick}
				aria-current={active ? 'page' : undefined}
				className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left relative
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
          ${
						active
							? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
							: 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-text-primary)]'
					}
        `}
			>
				<span
					aria-hidden='true'
					className={`
            absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-[var(--color-primary)]
            transition-all duration-200 ease-out
            ${active ? 'h-5 opacity-100' : 'h-0 opacity-0'}
          `}
				/>
				<Icon
					size={18}
					aria-hidden='true'
					className={`shrink-0 transition-colors duration-200 ${active ? 'text-[var(--color-primary)]' : ''}`}
				/>
				{item.badgeCount > 0 && (
					<span
						className={`
            absolute top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white
            ${collapsed ? 'right-1.5' : 'right-2.5'}
          `}
					>
						{item.badgeCount > 99 ? '99+' : item.badgeCount}
					</span>
				)}
				<span
					className={`
            text-sm font-medium whitespace-nowrap overflow-hidden
            transition-all duration-300 ease-in-out
            ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}
          `}
				>
					{item.label}
				</span>
			</button>
			{collapsed && <NavTooltip label={item.label} visible={hovered} />}
		</div>
	);
}

function SidebarBody({
	collapsed,
	isMobile,
	activeTab,
	setActiveTab,
	navItems,
	user,
	theme,
	toggle,
	onClose,
	onLogout,
	showCloseX = false,
}) {
	const isCollapsed = collapsed && !isMobile;

	return (
		<aside
			aria-label='Main navigation'
			className='flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)]'
		>
			<div
				className={`
        flex items-center border-b border-[var(--color-border)] h-16 shrink-0 px-3 gap-2
        transition-all duration-300
      `}
			>
				<div className='flex items-center gap-2.5 flex-1 min-w-0'>
					<img
						src={logo}
						alt='Mizuka Portal logo'
						className={`
              shrink-0 object-contain transition-all duration-300
              ${isCollapsed ? 'h-9 w-9' : 'h-10 w-10'}
            `}
					/>
					<div
						className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}
          `}
					>
						<p className='text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap leading-tight'>
							Mizuka Portal
						</p>
						<p className='text-[10px] text-[var(--color-text-muted)] capitalize whitespace-nowrap leading-tight'>
							{user?.role} dashboard
						</p>
					</div>
				</div>

				{isMobile || showCloseX ? (
					<button
						type='button'
						onClick={onClose}
						aria-label='Close navigation'
						className='p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
					>
						<X size={18} aria-hidden='true' />
					</button>
				) : (
					!collapsed && (
						<button
							type='button'
							onClick={() => onClose()}
							aria-label='Collapse sidebar'
							className='p-1.5 rounded-lg relative z-10 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-all duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
						>
							<ChevronLeft size={18} aria-hidden='true' />
						</button>
					)
				)}
			</div>

			<div
				className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${
					isCollapsed
						? 'max-h-0 opacity-0 pt-0 px-0'
						: 'max-h-10 opacity-100 pt-4 px-4 pb-1'
				}
      `}
			>
				<p className='text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
					Menu
				</p>
			</div>

			<nav
				aria-label='Primary navigation'
				className='flex-1 py-2 overflow-y-auto overflow-x-hidden'
			>
				{navItems.map((item) => (
					<NavItem
						key={item.id}
						item={item}
						active={activeTab === item.id}
						collapsed={isCollapsed}
						onClick={setActiveTab}
						onMobileClose={isMobile ? onClose : undefined}
					/>
				))}
			</nav>

			<div className='border-t border-[var(--color-border)] p-3 shrink-0 space-y-1'>
				<button
					type='button'
					onClick={() => {
						setActiveTab('profile');
						isMobile && onClose();
					}}
					aria-label='Go to profile settings'
					className={`
            w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
            ${
							activeTab === 'profile'
								? 'bg-[var(--color-primary)]/10'
								: 'hover:bg-[var(--color-border)]/60'
						}
            ${isCollapsed ? 'justify-center' : ''}
          `}
				>
					{user?.profile ? (
						<img
							src={user.profile}
							alt=''
							aria-hidden='true'
							className='w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-border)] shrink-0'
						/>
					) : (
						<div
							aria-hidden='true'
							className='w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0'
						>
							{user?.username?.charAt(0).toUpperCase()}
						</div>
					)}
					<div
						className={`
            overflow-hidden transition-all duration-300 ease-in-out text-left
            ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}
          `}
					>
						<p className='text-sm font-medium text-[var(--color-text-primary)] truncate leading-tight whitespace-nowrap'>
							{user?.username}
						</p>
						<p className='text-xs text-[var(--color-text-muted)] capitalize truncate leading-tight whitespace-nowrap'>
							{user?.role}
						</p>
					</div>
				</button>

				<div
					className={`
          flex gap-1 transition-all duration-300
          ${isCollapsed ? 'flex-col items-center' : ''}
        `}
				>
					<button
						type='button'
						onClick={toggle}
						aria-label={
							theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
						}
						className={`
              flex-1 flex items-center justify-center gap-2 p-2 rounded-xl
              text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
              hover:bg-[var(--color-border)]/60 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
            `}
					>
						<span className='transition-transform duration-300 rotate-0'>
							{theme === 'dark' ? (
								<Sun size={16} aria-hidden='true' />
							) : (
								<Moon size={16} aria-hidden='true' />
							)}
						</span>
						<span
							className={`
              text-xs font-medium whitespace-nowrap overflow-hidden
              transition-all duration-300 ease-in-out
              ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[60px] opacity-100'}
            `}
						>
							{theme === 'dark' ? 'Light' : 'Dark'}
						</span>
					</button>

					<button
						type='button'
						onClick={onLogout}
						aria-label='Log out'
						className={`
              flex-1 flex items-center justify-center gap-2 p-2 rounded-xl
              text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/8
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500
            `}
					>
						<LogOut size={16} aria-hidden='true' />
						<span
							className={`
              text-xs font-medium whitespace-nowrap overflow-hidden
              transition-all duration-300 ease-in-out
              ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[60px] opacity-100'}
            `}
						>
							Log out
						</span>
					</button>
				</div>
			</div>
		</aside>
	);
}

export default function Sidebar({
	collapsed,
	setCollapsed,
	activeTab,
	setActiveTab,
}) {
	const { user, logout } = useAuth();
	const [communicationUnreadCount, setCommunicationUnreadCount] = useState(0);
	const [adminNotificationUnreadCount, setAdminNotificationUnreadCount] =
		useState(0);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [mobileClosing, setMobileClosing] = useState(false);
	const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'info',
		message: '',
	});
	const { theme, toggle } = useTheme();
	const socketRef = useRef(null);

	const loadCommunicationUnread = useCallback(async () => {
		try {
			const response = await getCommunicationUnreadCount();
			setCommunicationUnreadCount(Number(response.data?.unreadCount || 0));
		} catch (error) {}
	}, []);

	const loadAdminNotificationUnread = useCallback(async () => {
		try {
			const response = await getAdminNotificationUnreadSummary({ limit: 1 });
			setAdminNotificationUnreadCount(Number(response.data?.unreadCount || 0));
		} catch (error) {}
	}, []);

	useEffect(() => {
		if (!user?.role) return;

		const supportsCommunication =
			user.role === 'student' || user.role === 'teacher';
		if (supportsCommunication) {
			loadCommunicationUnread();
			const interval = setInterval(loadCommunicationUnread, 12000);
			const handleUnreadEvent = (event) => {
				setCommunicationUnreadCount(Number(event.detail?.count || 0));
			};
			window.addEventListener('communication-unread', handleUnreadEvent);

			const token = localStorage.getItem('token');
			if (token && !socketRef.current) {
				socketRef.current = io(
					import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
					{
						auth: { token },
						transports: ['websocket', 'polling'],
					},
				);
				socketRef.current.on('chat:unread-count-updated', (payload) => {
					setCommunicationUnreadCount(Number(payload?.unreadCount || 0));
				});
			}

			return () => {
				clearInterval(interval);
				window.removeEventListener('communication-unread', handleUnreadEvent);
				if (socketRef.current) {
					socketRef.current.disconnect();
					socketRef.current = null;
				}
			};
		}
	}, [user?.role, loadCommunicationUnread]);

	useEffect(() => {
		if (!user?.role) return;

		const supportsNotifications =
			user.role === 'student' ||
			user.role === 'teacher' ||
			user.role === 'parent';
		if (supportsNotifications) {
			loadAdminNotificationUnread();
			const interval = setInterval(loadAdminNotificationUnread, 15000);
			const onFocus = () => loadAdminNotificationUnread();
			window.addEventListener('focus', onFocus);

			return () => {
				clearInterval(interval);
				window.removeEventListener('focus', onFocus);
			};
		}
	}, [user?.role, loadAdminNotificationUnread]);

	const baseNavItems = useMemo(() => {
		if (user?.role === 'student') return studentNavItems;
		if (user?.role === 'admin') return adminNavItems;
		if (user?.role === 'parent') return parentNavItems;
		return teacherNavItems;
	}, [user?.role]);

	const navItems = useMemo(() => {
		return baseNavItems.map((item) => {
			const isCommunication =
				item.id === 'teacher-communication' ||
				item.id === 'student-communication';
			const isNotification =
				item.id === 'notifications' || item.id === 'parent-announcements';
			return {
				...item,
				badgeCount: isCommunication
					? communicationUnreadCount
					: isNotification
						? adminNotificationUnreadCount
						: 0,
			};
		});
	}, [baseNavItems, communicationUnreadCount, adminNotificationUnreadCount]);

	const openMobile = useCallback(() => {
		setMobileClosing(false);
		setMobileOpen(true);
	}, []);

	const closeMobile = useCallback(() => {
		setMobileClosing(true);
		setTimeout(() => {
			setMobileOpen(false);
			setMobileClosing(false);
		}, 260);
	}, []);

	useEffect(() => {
		const handleKey = (e) => {
			if (e.key === 'Escape' && mobileOpen) closeMobile();
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [mobileOpen, closeMobile]);

	useEffect(() => {
		if (mobileOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [mobileOpen]);

	const handleLogoutClick = useCallback(() => {
		setConfirmLogoutOpen(true);
	}, []);

	const handleConfirmLogout = useCallback(() => {
		setConfirmLogoutOpen(false);
		setToast({ isOpen: true, type: 'success', message: 'Logging out…' });
		setTimeout(logout, 700);
	}, [logout]);

	const sharedProps = {
		activeTab,
		setActiveTab,
		navItems,
		user,
		theme,
		toggle,
		onLogout: handleLogoutClick,
	};

	return (
		<>
			<button
				type='button'
				onClick={openMobile}
				aria-label='Open navigation menu'
				aria-expanded={mobileOpen}
				className='lg:hidden fixed top-4 left-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-sm transition-all duration-150 hover:text-[var(--color-text-primary)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
			>
				<Menu size={18} aria-hidden='true' />
			</button>

			{collapsed && (
				<button
					type='button'
					onClick={() => setCollapsed(false)}
					aria-label='Expand sidebar'
					className='hidden lg:flex fixed top-4 left-4 z-30 h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-sm transition-all duration-150 hover:text-[var(--color-text-primary)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
				>
					<Menu size={18} aria-hidden='true' />
				</button>
			)}

			<div
				className={`
        hidden lg:flex h-full overflow-hidden transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-60'}
      `}
			>
				<SidebarBody
					{...sharedProps}
					collapsed={collapsed}
					isMobile={false}
					onClose={() => setCollapsed((v) => !v)}
				/>
			</div>

			{mobileOpen && (
				<div className='lg:hidden fixed inset-0 z-40 flex'>
					<div
						aria-hidden='true'
						onClick={closeMobile}
						className={`
              absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-260
              ${mobileClosing ? 'opacity-0' : 'opacity-100'}
            `}
					/>
					<div
						className={`
              relative flex h-full w-72
              transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]
              ${mobileClosing ? '-translate-x-full' : 'translate-x-0'}
            `}
					>
						<SidebarBody
							{...sharedProps}
							collapsed={false}
							isMobile={true}
							onClose={closeMobile}
							showCloseX={true}
						/>
					</div>
				</div>
			)}

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
			/>

			<ConfirmModal
				isOpen={confirmLogoutOpen}
				onClose={() => setConfirmLogoutOpen(false)}
				onConfirm={handleConfirmLogout}
				title='Log out'
				message='Are you sure you want to log out?'
				confirmText='Log out'
				cancelText='Cancel'
				type='warning'
			/>
		</>
	);
}
