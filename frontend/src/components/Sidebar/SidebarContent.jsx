import {
  BookOpen,
  User,
  Megaphone,
  Video,
  CalendarDays,
  FolderOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  BookMarked,
  MessageCircle,
  ChevronRight,
  LogOut,
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

const STUDENT_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      { id: 'live-sessions', label: 'Live Sessions', hint: 'Join ongoing classes', icon: Video },
      { id: 'academic-calender', label: 'Academic Calender', hint: 'Important dates', icon: CalendarDays },
      { id: 'report', label: 'Report', hint: 'Performance summary', icon: FileText },
    ],
  },
  {
    title: 'My Courses',
    items: [
      { id: 'course-material', label: 'Course Material', hint: 'Notes and resources', icon: FolderOpen },
      { id: 'gradebook', label: 'Gradebook', hint: 'Marks and progress', icon: ClipboardList },
    ],
  },
  {
    title: 'Settings',
    items: [{ id: 'profile', label: 'Profile', hint: 'Account and settings', icon: User }],
  },
];

const TEACHER_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      {
        id: 'teacher-classes',
        label: 'Teaching Hub',
        hint: 'Classes and posts',
        icon: GraduationCap,
      },
      { id: 'announcements', label: 'Announcements', hint: 'School-wide notes', icon: Megaphone },
    ],
  },
  {
    title: 'Instructor Tools',
    items: [
      { id: 'teacher-live-sessions', label: 'Live Sessions', hint: 'Start or join live classes', icon: Video },
      { id: 'class-schedule-management', label: 'Schedule', hint: 'Manage class timings', icon: CalendarDays },
      { id: 'teacher-course-material', label: 'Course Material', hint: 'Upload and share resources', icon: FolderOpen },
      { id: 'teacher-gradebook', label: 'Gradebook', hint: 'Manage grades and reports', icon: BookMarked },
      { id: 'parent-communication', label: 'Parent Communication', hint: 'Message parents', icon: MessageCircle },
      { id: 'student-attendance-tracking', label: 'Attendance', hint: 'Track attendance', icon: ClipboardList },
    ],
  },
  {
    title: 'Settings',
    items: [{ id: 'profile', label: 'Profile', hint: 'Account and settings', icon: User }],
  },
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
        className={`group flex w-full items-center rounded-lg border text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center p-3.5' : 'justify-start px-3.5 py-3.5'
        } ${
          isActive
            ? 'border-[var(--sb-accent-border)] bg-[var(--sb-accent-bg)] text-[var(--sb-accent-light)]'
            : 'border-transparent text-[var(--sb-text-secondary)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]'
        }`}
      >
        <span
          className={`mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isActive
              ? 'border-[var(--sb-accent-border)] bg-[var(--sb-bg)] text-[var(--sb-accent)]'
              : 'border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text-dim)] group-hover:text-[var(--sb-text-secondary)]'
          }`}
        >
          <Icon size={17} />
        </span>

        {!collapsed && (
          <span className='flex min-w-0 flex-1 flex-col items-start'>
            <span className='truncate text-base leading-tight text-inherit'>{item.label}</span>
            {item.hint ? <span className='truncate pt-0.5 text-xs text-[var(--sb-text-dim)]'>{item.hint}</span> : null}
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
  const sections = isTeacher ? TEACHER_SECTIONS : STUDENT_SECTIONS;
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <div className='flex h-full flex-col bg-[var(--sb-bg)] font-sans text-[var(--sb-text)]'>
      <header className='shrink-0 border-b border-[var(--sb-border)] px-6 pb-6 pt-8'>
        <div className='flex items-center justify-between gap-3'>
          <button
            onClick={() => onPageChange(isTeacher ? 'teacher-classes' : 'live-sessions')}
            aria-label='Open dashboard home'
            title='Dashboard home'
            className='group flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--sb-hover)]'
          >
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-accent)]'>
              <BookOpen size={19} />
            </span>

            {!collapsed && (
              <span className='flex min-w-0 flex-col text-left'>
                <span className='truncate text-base font-semibold text-[var(--sb-text)]'>Mizuka Portal</span>
                <span className='truncate text-xs font-medium text-[var(--sb-text-dim)]'>Edu Portal</span>
              </span>
            )}
          </button>

          <button
            onClick={onCollapse}
            aria-label={toggleLabel}
            title={toggleLabel}
            className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]'
          >
            {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
      </header>

      <nav className='flex-1 overflow-y-auto overflow-x-hidden px-6 py-8' role='navigation' aria-label='Main'>
        <div className='flex flex-col gap-7'>
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className='mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sb-text-dim)]'>
                  {section.title}
                </h3>
              )}

              <ul className='m-0 flex list-none flex-col gap-2 p-0'>
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={activePage === item.id}
                    collapsed={collapsed}
                    onClick={onPageChange}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <footer className='shrink-0 border-t border-[var(--sb-border)] px-6 py-6'>
        <div className='flex flex-col'>
          <button
            onClick={() => onPageChange('profile')}
            aria-label='Go to profile'
            title={collapsed ? 'Profile' : undefined}
            className={`mb-4 flex w-full items-center gap-3 rounded-lg px-3.5 py-3 transition-all duration-150 hover:bg-[var(--sb-hover)] ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <div className='mr-4 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sb-border)] bg-[var(--sb-avatar-bg)] text-base font-semibold text-[var(--sb-avatar-text)]'>
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
                <span className='truncate text-[15px] font-semibold text-[var(--sb-text)]'>{userName || 'Guest'}</span>
                <span
                  className='mt-1 inline-flex items-center w-max rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm'
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

          <div className={`flex ${collapsed ? 'flex-col gap-2.5' : 'gap-2.5 items-center'}`}>
            <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className='flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-3 text-sm text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] shadow-sm'
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              {!collapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
            </button>

            <button
              onClick={logout}
              aria-label='Logout'
              title='Logout'
              className='flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-transparent p-3 text-sm text-[var(--sb-text-secondary)] transition-colors hover:border-[var(--sb-danger-border)] hover:bg-[var(--sb-danger-hover-bg)] hover:text-[var(--sb-danger)] shadow-sm'
            >
              <LogOut size={17} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SidebarContent;