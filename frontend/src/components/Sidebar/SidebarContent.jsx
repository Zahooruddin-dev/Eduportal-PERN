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
        className={`relative flex w-full items-center gap-3 rounded-lg text-sm transition-colors duration-200 ${
          collapsed ? 'justify-center py-2.5' : 'justify-start px-3 py-2.5'
        } ${activeClasses}`}
      >
        {isActive && (
          <span
            className="absolute bottom-1/5 left-0 top-1/5 w-0.5 rounded-r bg-[var(--sb-accent)]"
            aria-hidden="true"
          />
        )}
        <Icon
          size={18}
          className={isActive ? 'text-[var(--sb-accent)]' : 'text-[var(--sb-text-dim)]'}
        />
        {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
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
    <div className="flex h-full flex-col overflow-hidden bg-[var(--sb-bg)]">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--sb-border)] px-4">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          {collapsed ? (
            <button
              onClick={onCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--sb-accent-bg)] text-[var(--sb-accent)] transition-colors hover:bg-[var(--sb-hover)]"
            >
              <BookOpen size={16} />
            </button>
          ) : (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--sb-accent-border)] bg-[var(--sb-accent-bg)] text-[var(--sb-accent)]">
                <BookOpen size={16} />
              </div>
              <span className="truncate font-serif text-lg font-semibold text-[var(--sb-text)]">
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--sb-border)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)]"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin" role="navigation" aria-label="Main">
        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--sb-text-dim)]">
            {sectionLabel}
          </p>
        )}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
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

      {/* Footer Area */}
      <div className="shrink-0 border-t border-[var(--sb-border)] p-4">
        
        {/* Profile Info */}
        <button
          onClick={() => onPageChange('profile')}
          aria-label="Go to profile"
          className={`mb-3 flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--sb-hover)] ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--sb-border-strong)] bg-[var(--sb-avatar-bg)] text-sm font-semibold text-[var(--sb-avatar-text)]">
            {userProfile ? (
              <img
                src={userProfile}
                alt={`${userName}'s avatar`}
                className="h-full w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <span>{userName?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-sm font-medium text-[var(--sb-text)]">
                {userName || 'Guest'}
              </span>
              <span
                className="mt-0.5 inline-block w-max rounded px-1.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: roleMeta.color,
                  backgroundColor: roleMeta.bg,
                  borderColor: roleMeta.border,
                  borderWidth: '1px',
                }}
              >
                {roleMeta.label}
              </span>
            </div>
          )}
        </button>

        {/* Quick Actions (Theme / Logout) */}
        <div className={`flex ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2.5 text-sm text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-accent)]"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          <button
            onClick={logout}
            aria-label="Logout"
            title={collapsed ? 'Logout' : undefined}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2.5 text-sm text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-danger-hover-bg)] hover:text-[var(--sb-danger)]"
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarContent;