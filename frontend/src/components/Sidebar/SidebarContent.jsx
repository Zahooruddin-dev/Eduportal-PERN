import {
  BookOpen,
  User,
  Megaphone,
  Video,
  CalendarDays,
  FolderOpen,
  ClipboardList,
  FileText,
  Sparkles,
  GraduationCap,
  ChevronRight,
  LogOut,
  LayoutGrid,
  PanelLeft,
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
  { id: 'live-sessions', label: 'Live Sessions', hint: 'Join ongoing classes', icon: Video },
  { id: 'academic-calender', label: 'Academic Calender', hint: 'Important dates', icon: CalendarDays },
  { id: 'course-material', label: 'Course Material', hint: 'Notes and resources', icon: FolderOpen },
  { id: 'gradebook', label: 'Gradebook', hint: 'Marks and progress', icon: ClipboardList },
  { id: 'report', label: 'Report', hint: 'Performance summary', icon: FileText },
  { id: 'profile', label: 'Profile', hint: 'Account and settings', icon: User },
];

const TEACHER_NAV = [
  {
    id: 'teacher-classes',
    label: 'Teaching Hub',
    hint: 'Classes and posts',
    icon: GraduationCap,
  },
  { id: 'announcements', label: 'Announcements', hint: 'School-wide notes', icon: Megaphone },
  { id: 'profile', label: 'Profile', hint: 'Account and settings', icon: User },
];

const NavItem = ({ item, isActive, collapsed, onClick }) => {
  const Icon = item.icon;

  return (
    <li>
      <button
        onClick={() => onClick(item.id)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={`group flex w-full items-center gap-3 rounded-xl border text-sm transition-all duration-200 ${
          collapsed ? 'justify-center px-2.5 py-2.5' : 'justify-start px-3 py-2.5'
        } ${
          isActive
            ? 'border-[var(--sb-accent-border)] bg-[var(--sb-accent-bg)] text-[var(--sb-accent-light)]'
            : 'border-transparent text-[var(--sb-text-secondary)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]'
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isActive
              ? 'border-[var(--sb-accent-border)] bg-[var(--sb-bg)] text-[var(--sb-accent)]'
              : 'border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text-dim)] group-hover:text-[var(--sb-text)]'
          }`}
        >
          <Icon size={16} />
        </span>

        {!collapsed && (
          <span className='flex min-w-0 flex-1 flex-col items-start'>
            <span className='truncate text-sm font-semibold'>{item.label}</span>
            {item.hint ? <span className='truncate text-[11px] text-[var(--sb-text-dim)]'>{item.hint}</span> : null}
          </span>
        )}

        {!collapsed && (
          <ChevronRight
            size={14}
            className={`shrink-0 transition-colors duration-200 ${
              isActive ? 'text-[var(--sb-accent)]' : 'text-[var(--sb-text-dim)] group-hover:text-[var(--sb-text-secondary)]'
            }`}
          />
        )}
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
  const subtitle = isTeacher ? 'Teaching dashboard' : 'Student dashboard';

  return (
    <div className='flex h-full flex-col bg-[var(--sb-bg)]'>
      <header className='shrink-0 border-b border-[var(--sb-border)] px-4 pb-4 pt-5'>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          <button
            onClick={() => onPageChange(isTeacher ? 'teacher-classes' : 'live-sessions')}
            aria-label='Open dashboard home'
            title='Dashboard home'
            className='group flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-[var(--sb-hover)]'
          >
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-accent)]'>
              <BookOpen size={18} />
            </span>

            {!collapsed && (
              <span className='flex min-w-0 flex-col text-left'>
                <span className='truncate font-body text-[15px] font-semibold text-[var(--sb-text)]'>Mizuka Portal</span>
                <span className='truncate text-[11px] font-medium text-[var(--sb-text-dim)]'>Enterprise Learning</span>
              </span>
            )}
          </button>

          {!collapsed && (
            <button
              onClick={onCollapse}
              aria-label='Collapse sidebar'
              title='Collapse sidebar'
              className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]'
            >
              <PanelLeftClose size={15} />
            </button>
          )}

          {collapsed && (
            <button
              onClick={onCollapse}
              aria-label='Expand sidebar'
              title='Expand sidebar'
              className='absolute right-2 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text-secondary)] transition-colors hover:text-[var(--sb-text)]'
            >
              <PanelLeft size={12} />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className='mt-4 rounded-xl bg-[var(--sb-bg-elevated)] px-3 py-2.5'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-text-dim)]'>{subtitle}</p>
            <p className='mt-1 text-sm text-[var(--sb-text-secondary)]'>Everything you need in one workspace.</p>
          </div>
        )}
      </header>

      <nav className='flex-1 overflow-y-auto overflow-x-hidden px-3 py-4' role='navigation' aria-label='Main'>
        {!collapsed && (
          <div className='mb-3 flex items-center justify-between px-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-text-dim)]'>Navigation</p>
            <LayoutGrid size={13} className='text-[var(--sb-text-dim)]' />
          </div>
        )}

        <ul className='m-0 flex list-none flex-col gap-1.5 p-0'>
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

      <footer className='shrink-0 border-t border-[var(--sb-border)] px-3 pb-4 pt-3'>
        <button
          onClick={() => onPageChange('profile')}
          aria-label='Go to profile'
          title={collapsed ? 'Profile' : undefined}
          className={`mb-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--sb-hover)] ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <div className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sb-border)] bg-[var(--sb-avatar-bg)] text-sm font-semibold text-[var(--sb-avatar-text)]'>
            {userProfile ? (
              <img
                src={userProfile}
                alt={`${userName}'s avatar`}
                className='h-full w-full object-cover'
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <span>{userName?.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {!collapsed && (
            <div className='flex min-w-0 flex-1 flex-col text-left'>
              <span className='truncate text-sm font-semibold text-[var(--sb-text)]'>{userName || 'Guest'}</span>
              <span
                className='mt-1 inline-block w-max rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]'
                style={{
                  color: roleMeta.color,
                  backgroundColor: roleMeta.bg,
                  borderColor: roleMeta.border,
                }}
              >
                {roleMeta.label}
              </span>
            </div>
          )}
        </button>

        <div className={`flex ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-2.5 text-sm text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]'
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          <button
            onClick={logout}
            aria-label='Logout'
            title='Logout'
            className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent p-2.5 text-sm text-[var(--sb-text-secondary)] transition-colors hover:border-[var(--sb-danger-border)] hover:bg-[var(--sb-danger-hover-bg)] hover:text-[var(--sb-danger)]'
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default SidebarContent;