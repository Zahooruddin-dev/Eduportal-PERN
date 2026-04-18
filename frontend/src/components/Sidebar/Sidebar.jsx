import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import {
	Menu,
	ChevronLeft,
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
	Moon,
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
	{ id: 'admin-academic-calendar', label: 'Academic Calendar', icon: Calendar },
	{ id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
	{ id: 'admin-reports', label: 'Reports', icon: FileText },
];

const MOBILE_DRAWER_ID = 'mobile-navigation-drawer';
const MOBILE_DRAWER_TITLE_ID = 'mobile-navigation-drawer-title';
const MOBILE_DRAWER_TRANSITION_MS = 300;
const EDGE_SWIPE_START_MAX_X = 24;
const SWIPE_THRESHOLD_PX = 72;
const SWIPE_VERTICAL_TOLERANCE_PX = 48;

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
	mobileCloseButtonRef,
	mobileTitleId,
	showCloseX = false,
}) {
	const isCollapsed = collapsed && !isMobile;

	return (
		<aside className='flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]'>
			<div
				className={`flex items-center border-b border-[var(--color-border)] h-16 shrink-0 px-3 gap-2 transition-all duration-300`}
			>
				<div className='flex items-center gap-2.5 flex-1 min-w-0'>
					<img
						src={logo}
						alt='Mizuka Portal logo'
						className={`shrink-0 object-contain transition-all duration-300 ${isCollapsed ? 'h-9 w-9' : 'h-10 w-10'}`}
					/>
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}
					>
						<p
							id={isMobile ? mobileTitleId : undefined}
							className='text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap leading-tight'
						>
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
						ref={isMobile ? mobileCloseButtonRef : undefined}
						onClick={onClose}
						aria-label='Close navigation'
						className='p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
					>
						<X size={18} />
					</button>
				) : (
					!collapsed && (
						<button
							type='button'
							onClick={() => onClose()}
							aria-label='Collapse sidebar'
							className='p-1.5 rounded-lg relative z-10 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-all duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
						>
							<ChevronLeft size={18} />
						</button>
					)
				)}
			</div>

			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 pt-0 px-0' : 'max-h-10 opacity-100 pt-4 px-4 pb-1'}`}
			>
				<p className='text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
					Menu
				</p>
			</div>

			<nav className='flex-1 py-2 overflow-y-auto overflow-x-hidden'>
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

			<div className='border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-sm p-4 shrink-0 space-y-3 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.03)]'>
				<button
					type='button'
					onClick={() => {
						setActiveTab('profile');
						isMobile && onClose();
					}}
					className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
            ${
							activeTab === 'profile'
								? 'bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30 shadow-sm'
								: 'hover:bg-[var(--color-border)]/50 hover:shadow-sm'
						}
            ${isCollapsed ? 'justify-center' : ''}
          `}
				>
					{user?.profile ? (
						<img
							src={user.profile}
							alt=''
							className='w-9 h-9 rounded-full object-cover ring-2 ring-[var(--color-primary)]/40 shrink-0 transition-all duration-200 group-hover:ring-[var(--color-primary)]'
						/>
					) : (
						<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-base font-bold text-white shadow-sm'>
							{user?.username?.charAt(0).toUpperCase()}
						</div>
					)}
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out text-left ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}
					>
						<p className='text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight whitespace-nowrap'>
							{user?.username}
						</p>
						<p className='text-[11px] font-medium text-[var(--color-primary)] capitalize truncate leading-tight whitespace-nowrap -mt-0.5'>
							{user?.role}
						</p>
						<p className='text-[10px] text-[var(--color-text-muted)] truncate leading-tight whitespace-nowrap -mt-0.5'>
							{user?.email}
						</p>
					</div>
				</button>

				<div
					className={`flex gap-2 transition-all duration-300 ${isCollapsed ? 'flex-col items-center' : ''}`}
				>
					<button
						type='button'
						onClick={toggle}
						aria-label={
							theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
						}
						className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-full
              bg-[var(--color-border)]/30 hover:bg-[var(--color-border)]/80
              text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
              transition-all duration-200 hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
              ${isCollapsed ? 'w-full' : 'flex-1'}
            `}
					>
						<span className='transition-transform duration-300'>
							{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
						</span>
						<span
							className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[60px] opacity-100'}`}
						>
							{theme === 'dark' ? 'Light' : 'Dark'}
						</span>
					</button>

					<button
						type='button'
						onClick={onLogout}
						aria-label='Log out'
						className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-full
              bg-red-500/5 hover:bg-red-500/15
              text-red-500 hover:text-red-600
              transition-all duration-200 hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-red-500
              ${isCollapsed ? 'w-full' : 'flex-1'}
            `}
					>
						<LogOut size={16} />
						<span
							className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[60px] opacity-100'}`}
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
	const [mobileDrawerMounted, setMobileDrawerMounted] = useState(false);
	const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
	const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'info',
		message: '',
	});
	const { theme, toggle } = useTheme();
	const socketRef = useRef(null);
	const mobileTriggerRef = useRef(null);
	const mobileSurfaceRef = useRef(null);
	const mobileCloseButtonRef = useRef(null);
	const lastFocusedElementRef = useRef(null);
	const edgeSwipeRef = useRef({
		tracking: false,
		startX: 0,
		startY: 0,
	});
	const drawerSwipeRef = useRef({
		tracking: false,
		startX: 0,
		startY: 0,
	});

	const loadCommunicationUnread = useCallback(async () => {
		try {
			const response = await getCommunicationUnreadCount();
			setCommunicationUnreadCount(Number(response.data?.unreadCount || 0));
		} catch {
			return;
		}
	}, []);

	const loadAdminNotificationUnread = useCallback(async () => {
		try {
			const response = await getAdminNotificationUnreadSummary({ limit: 1 });
			setAdminNotificationUnreadCount(Number(response.data?.unreadCount || 0));
		} catch {
			return;
		}
	}, []);

	useEffect(() => {
		if (!user?.role) return;

		const supportsCommunication =
			user.role === 'student' || user.role === 'teacher';
		if (supportsCommunication) {
			const initialLoadTimeout = window.setTimeout(() => {
				loadCommunicationUnread();
			}, 0);
			const interval = setInterval(loadCommunicationUnread, 12000);
			const handleUnreadEvent = (event) => {
				setCommunicationUnreadCount(Number(event.detail?.count || 0));
			};
			window.addEventListener('communication-unread', handleUnreadEvent);

			const token = localStorage.getItem('token');
			if (token && !socketRef.current) {
				socketRef.current = io(
					import.meta.env.VITE_BACKEND_URL || undefined,
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
				clearTimeout(initialLoadTimeout);
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
			const initialLoadTimeout = window.setTimeout(() => {
				loadAdminNotificationUnread();
			}, 0);
			const interval = setInterval(loadAdminNotificationUnread, 15000);
			const onFocus = () => loadAdminNotificationUnread();
			window.addEventListener('focus', onFocus);

			return () => {
				clearTimeout(initialLoadTimeout);
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

	const activeTabLabel = useMemo(() => {
		const activeItem = navItems.find((item) => item.id === activeTab);
		return activeItem?.label || 'Dashboard';
	}, [activeTab, navItems]);

	const closeMobile = useCallback(() => {
		setMobileDrawerVisible(false);
	}, []);

	const openMobile = useCallback(
		(event) => {
			if (event?.currentTarget) {
				mobileTriggerRef.current = event.currentTarget;
			}

			if (mobileDrawerMounted) {
				setMobileDrawerVisible(true);
				return;
			}

			setMobileDrawerMounted(true);
		},
		[mobileDrawerMounted],
	);

	const handleDrawerTouchStart = useCallback((event) => {
		const touch = event.touches?.[0];
		if (!touch) return;

		drawerSwipeRef.current = {
			tracking: true,
			startX: touch.clientX,
			startY: touch.clientY,
		};
	}, []);

	const handleDrawerTouchMove = useCallback(
		(event) => {
			const swipe = drawerSwipeRef.current;
			if (!swipe.tracking) return;

			const touch = event.touches?.[0];
			if (!touch) return;

			const deltaX = touch.clientX - swipe.startX;
			const deltaY = Math.abs(touch.clientY - swipe.startY);

			if (
				deltaY > SWIPE_VERTICAL_TOLERANCE_PX &&
				deltaY > Math.abs(deltaX)
			) {
				drawerSwipeRef.current.tracking = false;
				return;
			}

			if (deltaX <= -SWIPE_THRESHOLD_PX) {
				drawerSwipeRef.current.tracking = false;
				closeMobile();
			}
		},
		[closeMobile],
	);

	const handleDrawerTouchEnd = useCallback(() => {
		drawerSwipeRef.current.tracking = false;
	}, []);

	useEffect(() => {
		if (!mobileDrawerMounted) return;

		const raf = window.requestAnimationFrame(() => {
			setMobileDrawerVisible(true);
		});

		return () => window.cancelAnimationFrame(raf);
	}, [mobileDrawerMounted]);

	useEffect(() => {
		const handleResize = () => {
			if (window.matchMedia('(min-width: 1024px)').matches) {
				setMobileDrawerVisible(false);
				setMobileDrawerMounted(false);
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (!mobileDrawerMounted) return;

		const handleKey = (event) => {
			if (event.key === 'Escape') {
				closeMobile();
			}
		};

		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [mobileDrawerMounted, closeMobile]);

	useEffect(() => {
		document.body.style.overflow = mobileDrawerMounted ? 'hidden' : '';

		return () => {
			document.body.style.overflow = '';
		};
	}, [mobileDrawerMounted]);

	useEffect(() => {
		if (!mobileDrawerMounted) return;

		const drawerSurface = mobileSurfaceRef.current;
		if (!drawerSurface) return;

		const handleTransitionEnd = (event) => {
			if (event.target !== drawerSurface || event.propertyName !== 'transform') {
				return;
			}

			if (!mobileDrawerVisible) {
				setMobileDrawerMounted(false);
			}
		};

		drawerSurface.addEventListener('transitionend', handleTransitionEnd);

		return () => {
			drawerSurface.removeEventListener('transitionend', handleTransitionEnd);
		};
	}, [mobileDrawerMounted, mobileDrawerVisible]);

	useEffect(() => {
		if (!mobileDrawerMounted || mobileDrawerVisible) return;

		const closeTimer = window.setTimeout(() => {
			setMobileDrawerMounted(false);
		}, MOBILE_DRAWER_TRANSITION_MS + 80);

		return () => window.clearTimeout(closeTimer);
	}, [mobileDrawerMounted, mobileDrawerVisible]);

	useEffect(() => {
		if (!mobileDrawerMounted || !mobileDrawerVisible) return;

		lastFocusedElementRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: mobileTriggerRef.current;

		const focusTimer = window.setTimeout(() => {
			const fallbackFocusable = mobileSurfaceRef.current?.querySelector(
				'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			const focusTarget = mobileCloseButtonRef.current || fallbackFocusable;

			if (focusTarget instanceof HTMLElement) {
				focusTarget.focus();
			}
		}, 30);

		return () => window.clearTimeout(focusTimer);
	}, [mobileDrawerMounted, mobileDrawerVisible]);

	useEffect(() => {
		if (mobileDrawerMounted) return;

		const focusTarget =
			lastFocusedElementRef.current || mobileTriggerRef.current;
		if (focusTarget && typeof focusTarget.focus === 'function') {
			focusTarget.focus();
		}
	}, [mobileDrawerMounted]);

	useEffect(() => {
		if (!mobileDrawerMounted || !mobileDrawerVisible) return;

		const drawerSurface = mobileSurfaceRef.current;
		if (!drawerSurface) return;

		const handleTrapFocus = (event) => {
			if (event.key !== 'Tab') return;

			const focusableElements = Array.from(
				drawerSurface.querySelectorAll(
					'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			).filter((element) => element.getAttribute('aria-hidden') !== 'true');

			if (!focusableElements.length) {
				event.preventDefault();
				return;
			}

			const first = focusableElements[0];
			const last = focusableElements[focusableElements.length - 1];
			const activeElement = document.activeElement;

			if (event.shiftKey && activeElement === first) {
				event.preventDefault();
				last.focus();
				return;
			}

			if (!event.shiftKey && activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		drawerSurface.addEventListener('keydown', handleTrapFocus);
		return () => drawerSurface.removeEventListener('keydown', handleTrapFocus);
	}, [mobileDrawerMounted, mobileDrawerVisible]);

	useEffect(() => {
		const handleEdgeSwipeStart = (event) => {
			if (mobileDrawerMounted || window.innerWidth >= 1024) return;

			const touch = event.touches?.[0];
			if (!touch || touch.clientX > EDGE_SWIPE_START_MAX_X) return;

			edgeSwipeRef.current = {
				tracking: true,
				startX: touch.clientX,
				startY: touch.clientY,
			};
		};

		const handleEdgeSwipeMove = (event) => {
			const swipe = edgeSwipeRef.current;
			if (!swipe.tracking || mobileDrawerMounted || window.innerWidth >= 1024) {
				return;
			}

			const touch = event.touches?.[0];
			if (!touch) return;

			const deltaX = touch.clientX - swipe.startX;
			const deltaY = Math.abs(touch.clientY - swipe.startY);

			if (
				deltaY > SWIPE_VERTICAL_TOLERANCE_PX &&
				deltaY > Math.abs(deltaX)
			) {
				edgeSwipeRef.current.tracking = false;
				return;
			}

			if (deltaX >= SWIPE_THRESHOLD_PX) {
				edgeSwipeRef.current.tracking = false;
				openMobile();
			}
		};

		const handleEdgeSwipeStop = () => {
			edgeSwipeRef.current.tracking = false;
		};

		window.addEventListener('touchstart', handleEdgeSwipeStart, {
			passive: true,
		});
		window.addEventListener('touchmove', handleEdgeSwipeMove, {
			passive: true,
		});
		window.addEventListener('touchend', handleEdgeSwipeStop);
		window.addEventListener('touchcancel', handleEdgeSwipeStop);

		return () => {
			window.removeEventListener('touchstart', handleEdgeSwipeStart);
			window.removeEventListener('touchmove', handleEdgeSwipeMove);
			window.removeEventListener('touchend', handleEdgeSwipeStop);
			window.removeEventListener('touchcancel', handleEdgeSwipeStop);
		};
	}, [mobileDrawerMounted, openMobile]);

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
			<div className='fixed inset-x-0 top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--color-surface)]/85 lg:hidden'>
				<div className='flex h-14 items-center gap-3 px-4'>
					<button
						ref={mobileTriggerRef}
						type='button'
						onClick={openMobile}
						aria-label='Open navigation menu'
						aria-haspopup='dialog'
						aria-controls={MOBILE_DRAWER_ID}
						aria-expanded={mobileDrawerMounted && mobileDrawerVisible}
						className='inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
					>
						<Menu size={16} aria-hidden='true' />
						<span>Menu</span>
					</button>

					<div className='min-w-0'>
						<p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
							Mizuka Portal
						</p>
						<p className='truncate text-sm font-medium text-[var(--color-text-primary)]'>
							{activeTabLabel}
						</p>
					</div>
				</div>
			</div>

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

			{mobileDrawerMounted && (
				<div className='lg:hidden fixed inset-0 z-40 flex'>
					<div
						aria-hidden='true'
						onClick={closeMobile}
						className={`
              absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none
              ${mobileDrawerVisible ? 'opacity-100' : 'opacity-0'}
            `}
					/>
					<div
						id={MOBILE_DRAWER_ID}
						ref={mobileSurfaceRef}
						role='dialog'
						aria-modal='true'
						aria-labelledby={MOBILE_DRAWER_TITLE_ID}
						onTouchStart={handleDrawerTouchStart}
						onTouchMove={handleDrawerTouchMove}
						onTouchEnd={handleDrawerTouchEnd}
						onTouchCancel={handleDrawerTouchEnd}
						className={`
              relative flex h-full w-[min(20rem,86vw)] max-w-[20rem]
              transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
              ${mobileDrawerVisible ? 'translate-x-0' : '-translate-x-full'}
            `}
					>
						<SidebarBody
							{...sharedProps}
							collapsed={false}
							isMobile={true}
							onClose={closeMobile}
							mobileCloseButtonRef={mobileCloseButtonRef}
							mobileTitleId={MOBILE_DRAWER_TITLE_ID}
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
