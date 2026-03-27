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

const NavItem = ({ item, isActive, collapsed, onClick }) => {
  const Icon = item.icon;
  const base = `w-full flex items-center gap-3 rounded-lg text-sm transition-colors duration-150`;
  const sizePadding = collapsed ? 'py-2 justify-center' : 'py-2 px-3 justify-start';
  const activeClasses = isActive
    ? 'bg-[var(--sb-active-bg)] text-[var(--sb-accent-light)] font-medium'
    : 'text-[var(--sb-text-secondary)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]';

  return (
    <li>
      <button
        onClick={() => onClick(item.id)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={`${base} ${sizePadding} ${activeClasses} relative`}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/5 bottom-1/5 w-0.5 rounded-r"
            style={{ background: 'var(--sb-accent)' }}
            aria-hidden="true"
          />
        )}
        <Icon size={16} className={isActive ? 'text-[var(--sb-accent)]' : 'text-[var(--sb-text-dim)]'} />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 h-16 border-b" style={{ borderColor: 'var(--sb-border)' }}>
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          {collapsed ? (
            <button
              onClick={onCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-8 h-8 rounded-md flex items-center justify-center border-0"
              style={{ background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)' }}
            >
              <BookOpen size={15} />
            </button>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--sb-accent-bg)', border: '1px solid var(--sb-accent-border)', color: 'var(--sb-accent)' }}
              >
                <BookOpen size={15} />
              </div>
              <span className="font-serif text-lg truncate" style={{ color: 'var(--sb-text)' }}>
                Mizuka Portal
              </span>
            </>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="w-7 h-7 rounded-md flex items-center justify-center border"
            style={{ borderColor: 'var(--sb-border)', color: 'var(--sb-text-secondary)' }}
          >
            <PanelLeftClose size={13} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4" role="navigation" aria-label="Main">
        {!collapsed && <p className="font-body text-xs font-semibold tracking-wider uppercase text-[var(--sb-text-dim)] px-2.5 mb-1">{sectionLabel}</p>}
        <ul className="flex flex-col gap-px list-none">
          {menuItems.map((item) => (
            <NavItem key={item.id} item={item} isActive={activePage === item.id} collapsed={collapsed} onClick={onPageChange} />
          ))}
        </ul>
      </nav>

      <div className="px-2.5 py-2 border-t" style={{ borderColor: 'var(--sb-border)' }}>
        <button
          onClick={() => onPageChange('profile')}
          aria-label="Go to profile"
          className={`w-full flex items-center gap-3 py-2 px-2.5 rounded-lg transition-colors duration-150 ${collapsed ? 'justify-center' : 'justify-start'}`}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sb-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div className="w-8 h-8 rounded-md border overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: 'var(--sb-avatar-bg)', borderColor: 'var(--sb-border-strong)', color: 'var(--sb-avatar-text)' }}>
            {userProfile ? (
              <img src={userProfile} alt={`${userName}'s avatar`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              <span>{userName?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden flex-1">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--sb-text)' }}>{userName || 'Guest'}</span>
              <span style={{ display: 'inline-block', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.125rem 0.375rem', borderRadius: '4px', color: roleMeta.color, background: roleMeta.bg, border: `1px solid ${roleMeta.border}`, fontFamily: 'var(--font-body)' }}>{roleMeta.label}</span>
            </div>
          )}
        </button>

        <div className="flex gap-1 mt-2">
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-sm transition-colors duration-150"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sb-text-secondary)'; }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          <button
            onClick={logout}
            aria-label="Logout"
            title={collapsed ? 'Logout' : undefined}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-sm transition-colors duration-150"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sb-danger-hover-bg)'; e.currentTarget.style.color = 'var(--sb-danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sb-text-secondary)'; }}
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
