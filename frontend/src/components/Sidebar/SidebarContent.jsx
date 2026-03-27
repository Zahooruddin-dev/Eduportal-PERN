import {
	BookOpen,
	User,
	Megaphone,
	DoorOpen,
	LogOut,
	CalendarDays,
	Video,
	ClipboardList,
	FolderOpen,
	BookMarked,
	MessageCircle,
	PanelLeftClose,
	PanelLeftOpen,
	Sun,
	Moon,
} from 'lucide-react';
import { logout } from '../../utils/auth';

const ROLE_META = {
	student: {
		label: 'Student',
		color: 'var(--sb-badge-student-color)',
		bg: 'var(--sb-badge-student-bg)',
		border: 'var(--sb-badge-student-border)',
	},
	teacher: {
		label: 'Teacher',
		color: 'var(--sb-badge-teacher-color)',
		bg: 'var(--sb-badge-teacher-bg)',
		border: 'var(--sb-badge-teacher-border)',
	},
	admin: {
		label: 'Admin',
		color: 'var(--sb-badge-admin-color)',
		bg: 'var(--sb-badge-admin-bg)',
		border: 'var(--sb-badge-admin-border)',
	},
};

const getRoleMeta = (role) =>
	ROLE_META[role?.toLowerCase()] ?? {
		label: role ?? 'User',
		color: 'var(--sb-text-secondary)',
		bg: 'rgba(120,113,108,0.08)',
		border: 'rgba(120,113,108,0.18)',
	};

const STUDENT_NAV = [
	{ id: 'enrolled-classes', label: 'Enrolled Classes', icon: DoorOpen },
	{ id: 'classes', label: 'Class Directory', icon: BookOpen },
	{ id: 'announcements', label: 'Announcements', icon: Megaphone },
	{ id: 'profile', label: 'Profile', icon: User },
];

const TEACHER_NAV = [
	{ id: 'class-schedule', label: 'Class & Schedule', icon: CalendarDays },
	{ id: 'live-sessions', label: 'Live Sessions', icon: Video },
	{ id: 'attendance', label: 'Attendance', icon: ClipboardList },
	{ id: 'course-materials', label: 'Course Materials', icon: FolderOpen },
	{ id: 'gradebook', label: 'Grade Book', icon: BookMarked },
	{ id: 'parent-comms', label: 'Parent Communication', icon: MessageCircle },
];

const s = {
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		overflow: 'hidden',
	},

	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '0 1rem',
		height: '64px',
		borderBottom: '1px solid var(--sb-border)',
		flexShrink: 0,
	},

	logoWrap: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.625rem',
		minWidth: 0,
		overflow: 'hidden',
	},

	logoMark: {
		width: '30px',
		height: '30px',
		borderRadius: '8px',
		background: 'var(--sb-accent-bg)',
		border: '1px solid var(--sb-accent-border)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		color: 'var(--sb-accent)',
	},

	logoText: {
		fontFamily: 'var(--font-display)',
		fontSize: '1.1rem',
		color: 'var(--sb-text)',
		letterSpacing: '-0.01em',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	},

	collapseBtn: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '28px',
		height: '28px',
		borderRadius: '6px',
		border: '1px solid var(--sb-border)',
		background: 'transparent',
		color: 'var(--sb-text-secondary)',
		cursor: 'pointer',
		flexShrink: 0,
		transition: 'color 0.15s, border-color 0.15s, background 0.15s',
	},

	nav: {
		flex: 1,
		overflowY: 'auto',
		overflowX: 'hidden',
		padding: '1rem 0.625rem',
	},

	sectionLabel: {
		fontFamily: 'var(--font-body)',
		fontSize: '0.625rem',
		fontWeight: 600,
		letterSpacing: '0.1em',
		textTransform: 'uppercase',
		color: 'var(--sb-text-dim)',
		padding: '0 0.625rem',
		marginBottom: '0.375rem',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
	},

	navList: {
		listStyle: 'none',
		display: 'flex',
		flexDirection: 'column',
		gap: '1px',
	},

	navBtn: (isActive, collapsed) => ({
		width: '100%',
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: collapsed ? '0.625rem 0' : '0.5625rem 0.75rem',
		borderRadius: '8px',
		border: 'none',
		background: isActive ? 'var(--sb-active-bg)' : 'transparent',
		color: isActive ? 'var(--sb-accent-light)' : 'var(--sb-text-secondary)',
		cursor: 'pointer',
		fontSize: '0.8125rem',
		fontFamily: 'var(--font-body)',
		fontWeight: isActive ? 500 : 400,
		letterSpacing: '-0.01em',
		textAlign: 'left',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		position: 'relative',
		transition: 'background 0.15s, color 0.15s',
		justifyContent: collapsed ? 'center' : 'flex-start',
		boxSizing: 'border-box',
	}),

	activeBar: {
		position: 'absolute',
		left: 0,
		top: '20%',
		bottom: '20%',
		width: '2px',
		borderRadius: '0 2px 2px 0',
		background: 'var(--sb-accent)',
	},

	navIcon: (isActive) => ({
		flexShrink: 0,
		color: isActive ? 'var(--sb-accent)' : 'var(--sb-text-dim)',
		transition: 'color 0.15s',
	}),

	navLabel: {
		flex: 1,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	},

	divider: {
		height: '1px',
		background: 'var(--sb-border)',
		margin: '0.625rem 0.625rem',
	},

	footer: {
		padding: '0.625rem',
		borderTop: '1px solid var(--sb-border)',
		flexShrink: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
	},

	userBtn: (collapsed) => ({
		width: '100%',
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '0.5rem 0.625rem',
		borderRadius: '8px',
		border: 'none',
		background: 'transparent',
		cursor: 'pointer',
		textAlign: 'left',
		transition: 'background 0.15s',
		justifyContent: collapsed ? 'center' : 'flex-start',
		minWidth: 0,
		overflow: 'hidden',
	}),

	avatar: {
		width: '32px',
		height: '32px',
		borderRadius: '8px',
		background: 'var(--sb-avatar-bg)',
		border: '1px solid var(--sb-border-strong)',
		overflow: 'hidden',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		fontSize: '0.75rem',
		fontWeight: 600,
		color: 'var(--sb-avatar-text)',
		fontFamily: 'var(--font-body)',
	},

	userDetails: {
		display: 'flex',
		flexDirection: 'column',
		gap: '0.1875rem',
		minWidth: 0,
		overflow: 'hidden',
		flex: 1,
	},

	userName: {
		fontSize: '0.8125rem',
		fontWeight: 500,
		color: 'var(--sb-text)',
		fontFamily: 'var(--font-body)',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		letterSpacing: '-0.01em',
	},

	roleBadge: (meta) => ({
		display: 'inline-block',
		fontSize: '0.625rem',
		fontWeight: 600,
		letterSpacing: '0.06em',
		textTransform: 'uppercase',
		padding: '0.125rem 0.375rem',
		borderRadius: '4px',
		color: meta.color,
		background: meta.bg,
		border: `1px solid ${meta.border}`,
		fontFamily: 'var(--font-body)',
		width: 'fit-content',
	}),

	footerRow: {
		display: 'flex',
		gap: '2px',
	},

	iconBtn: (danger) => ({
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '0.5rem',
		padding: '0.5rem 0.625rem',
		borderRadius: '8px',
		border: 'none',
		background: 'transparent',
		color: danger ? 'var(--sb-text-secondary)' : 'var(--sb-text-secondary)',
		cursor: 'pointer',
		fontSize: '0.75rem',
		fontFamily: 'var(--font-body)',
		transition: 'background 0.15s, color 0.15s',
		whiteSpace: 'nowrap',
	}),
};

const NavItem = ({ item, isActive, collapsed, onClick }) => {
	const Icon = item.icon;
	return (
		<li>
			<button
				onClick={() => onClick(item.id)}
				aria-label={item.label}
				aria-current={isActive ? 'page' : undefined}
				title={collapsed ? item.label : undefined}
				style={s.navBtn(isActive, collapsed)}
				onMouseEnter={(e) => {
					if (!isActive) {
						e.currentTarget.style.background = 'var(--sb-hover)';
						e.currentTarget.style.color = 'var(--sb-text)';
					}
				}}
				onMouseLeave={(e) => {
					if (!isActive) {
						e.currentTarget.style.background = 'transparent';
						e.currentTarget.style.color = 'var(--sb-text-secondary)';
					}
				}}
			>
				{isActive && <span style={s.activeBar} aria-hidden='true' />}
				<Icon size={16} style={s.navIcon(isActive)} />
				{!collapsed && <span style={s.navLabel}>{item.label}</span>}
			</button>
		</li>
	);
};

const SidebarContent = ({
	activePage,
	onPageChange,
	userName,
	userRole,
	userProfile,
	collapsed,
	onCollapse,
	theme,
	onToggleTheme,
}) => {
	const isTeacher = userRole === 'teacher';
	const roleMeta = getRoleMeta(userRole);
	const menuItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;
	const sectionLabel = isTeacher ? 'Workspace' : 'Navigation';

	return (
		<div style={s.root}>
			<div style={s.header}>
				<div style={s.logoWrap}>
					{collapsed ? (
						<button
							onClick={onCollapse}
							aria-label='Expand sidebar'
							title='Expand sidebar'
							style={{ ...s.logoMark, cursor: 'pointer', border: 'none' }}
						>
							<BookOpen size={15} />
						</button>
					) : (
						<>
							<div style={s.logoMark}>
								<BookOpen size={15} />
							</div>
							<span style={s.logoText}>Mizuka Portal</span>
						</>
					)}
				</div>

				{!collapsed && (
					<button
						onClick={onCollapse}
						aria-label='Collapse sidebar'
						title='Collapse sidebar'
						style={s.collapseBtn}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = 'var(--sb-text)';
							e.currentTarget.style.borderColor = 'var(--sb-border-strong)';
							e.currentTarget.style.background = 'var(--sb-hover)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = 'var(--sb-text-secondary)';
							e.currentTarget.style.borderColor = 'var(--sb-border)';
							e.currentTarget.style.background = 'transparent';
						}}
					>
						<PanelLeftClose size={13} />
					</button>
				)}
			</div>

			<nav style={s.nav} role='navigation' aria-label='Main'>
				{!collapsed && <p style={s.sectionLabel}>{sectionLabel}</p>}
				<ul style={s.navList}>
					{menuItems.map((item) => (
						<NavItem
							key={item.id}
							item={item}
							isActive={activePage === item.id}
							collapsed={collapsed}
							onClick={onPageChange}
						/>
					))}
				</ul>
			</nav>

			<div style={s.footer}>
				<button
					onClick={() => onPageChange('profile')}
					aria-label='Go to profile'
					style={s.userBtn(collapsed)}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = 'var(--sb-hover)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = 'transparent';
					}}
				>
					<div style={s.avatar}>
						{userProfile ? (
							<img
								src={userProfile}
								alt={`${userName}'s avatar`}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								onError={(e) => {
									e.target.style.display = 'none';
								}}
							/>
						) : (
							<span>{userName?.charAt(0).toUpperCase()}</span>
						)}
					</div>
					{!collapsed && (
						<div style={s.userDetails}>
							<span style={s.userName}>{userName || 'Guest'}</span>
							<span style={s.roleBadge(roleMeta)}>{roleMeta.label}</span>
						</div>
					)}
				</button>

				<div style={s.footerRow}>
					<button
						onClick={onToggleTheme}
						aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
						title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
						style={s.iconBtn(false)}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--sb-hover)';
							e.currentTarget.style.color = 'var(--sb-accent)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--sb-text-secondary)';
						}}
					>
						{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
						{!collapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
					</button>

					<button
						onClick={logout}
						aria-label='Logout'
						title={collapsed ? 'Logout' : undefined}
						style={s.iconBtn(true)}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--sb-danger-hover-bg)';
							e.currentTarget.style.color = 'var(--sb-danger)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--sb-text-secondary)';
						}}
					>
						<LogOut size={14} />
						{!collapsed && <span>Logout</span>}
					</button>
				</div>
			</div>
		</div>
	);
};

export default SidebarContent;
