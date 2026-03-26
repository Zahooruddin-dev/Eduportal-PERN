import {
	BookOpen,
	User,
	Megaphone,
	DoorOpen,
	LogOut,
	PanelLeftClose,
	PanelLeftOpen,
	CalendarDays,
	Video,
	ClipboardList,
	FolderOpen,
	BookMarked,
	MessageCircle,
} from 'lucide-react';
import { logout } from '../../utils/auth';

const ROLE_META = {
	student: {
		label: 'Student',
		color: '#38bdf8',
		bg: 'rgba(56,189,248,0.1)',
		border: 'rgba(56,189,248,0.2)',
	},
	teacher: {
		label: 'Teacher',
		color: '#a78bfa',
		bg: 'rgba(167,139,250,0.1)',
		border: 'rgba(167,139,250,0.2)',
	},
	admin: {
		label: 'Admin',
		color: '#fbbf24',
		bg: 'rgba(251,191,36,0.1)',
		border: 'rgba(251,191,36,0.2)',
	},
};

const getRoleMeta = (role) =>
	ROLE_META[role?.toLowerCase()] ?? {
		label: role ?? 'User',
		color: '#94a3b8',
		bg: 'rgba(148,163,184,0.1)',
		border: 'rgba(148,163,184,0.2)',
	};

const STUDENT_MENU = [
	{ id: 'enrolled-classes', label: 'Enrolled Classes', icon: DoorOpen },
	{ id: 'classes', label: 'Class Directory', icon: BookOpen },
	{ id: 'announcements', label: 'Announcements', icon: Megaphone },
	{ id: 'profile', label: 'Profile', icon: User },
];

const TEACHER_MENU = [
	{ id: 'class-schedule', label: 'Class & Schedule', icon: CalendarDays },
	{ id: 'live-sessions', label: 'Live Sessions', icon: Video },
	{ id: 'attendance', label: 'Attendance', icon: ClipboardList },
	{ id: 'course-materials', label: 'Course Materials', icon: FolderOpen },
	{ id: 'gradebook', label: 'Grade Book', icon: BookMarked },
	{ id: 'parent-comms', label: 'Parent Communication', icon: MessageCircle },
];

const SidebarContent = ({
	activePage,
	onPageChange,
	userName,
	userRole,
	userProfile,
	collapsed,
	onCollapse,
	isMobile,
}) => {
	const isTeacher = userRole === 'teacher';
	const roleMeta = getRoleMeta(userRole);
	const menuItems = isTeacher ? TEACHER_MENU : STUDENT_MENU;

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-slate-800/60">
				<div className="flex items-center gap-3 min-w-0">
					{collapsed ? (
						<button
							onClick={onCollapse}
							aria-label="Expand sidebar"
							title="Expand sidebar"
							className="text-indigo-400 hover:text-indigo-300 transition-colors"
						>
							<BookOpen size={24} />
						</button>
					) : (
						<>
							<BookOpen size={24} className="text-indigo-400 shrink-0" />
							<span className="text-slate-100 font-semibold text-sm tracking-wide truncate">
								EduPortal
							</span>
						</>
					)}
				</div>

				{!isMobile && !collapsed && (
					<button
						onClick={onCollapse}
						aria-label="Collapse sidebar"
						title="Collapse sidebar"
						className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
					>
						<PanelLeftClose size={16} />
					</button>
				)}
			</div>

			<nav className="flex-1 overflow-y-auto py-3 px-2" role="navigation">
				<ul className="space-y-0.5">
					{menuItems.map(({ id, label, icon: Icon }) => {
						const isActive = activePage === id;
						return (
							<li key={id}>
								<button
									onClick={() => onPageChange(id)}
									aria-label={label}
									aria-current={isActive ? 'page' : undefined}
									title={collapsed ? label : undefined}
									className={[
										'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
										collapsed ? 'justify-center' : '',
										isActive
											? 'bg-indigo-500/15 text-indigo-300 font-medium'
											: 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
									].join(' ')}
								>
									<Icon
										size={18}
										className={isActive ? 'text-indigo-400' : 'text-slate-500'}
									/>
									{!collapsed && <span>{label}</span>}
									{isActive && !collapsed && (
										<span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
									)}
								</button>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="shrink-0 border-t border-slate-800/60 p-2 space-y-1">
				{!collapsed ? (
					<button
						onClick={() => onPageChange('profile')}
						aria-label="Go to profile"
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
					>
						<div className="w-8 h-8 rounded-full bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
							{userProfile ? (
								<img
									src={userProfile}
									alt={`${userName}'s avatar`}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.style.display = 'none';
									}}
								/>
							) : (
								<span className="text-slate-300 text-xs font-semibold">
									{userName?.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-slate-200 text-sm font-medium truncate">{userName || 'Guest'}</p>
							<span
								className="text-xs px-1.5 py-0.5 rounded border font-medium"
								style={{
									color: roleMeta.color,
									background: roleMeta.bg,
									borderColor: roleMeta.border,
								}}
							>
								{roleMeta.label}
							</span>
						</div>
					</button>
				) : (
					<button
						onClick={() => onPageChange('profile')}
						title={`${userName} — view profile`}
						aria-label="Go to profile"
						className="w-full flex justify-center py-2"
					>
						<div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
							{userProfile ? (
								<img
									src={userProfile}
									alt={`${userName}'s avatar`}
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-slate-300 text-xs font-semibold">
									{userName?.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
					</button>
				)}

				<button
					onClick={logout}
					title={collapsed ? 'Logout' : undefined}
					aria-label="Logout"
					className={[
						'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-colors',
						collapsed ? 'justify-center' : '',
					].join(' ')}
				>
					<LogOut size={16} />
					{!collapsed && <span>Logout</span>}
				</button>
			</div>
		</div>
	);
};

export default SidebarContent;