import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  FileText,
  BarChart,
  MessageSquare,
  UserCheck,
  LogOut,
  GraduationCap,
  Sun,
  Megaphone,
  Moon,
  X,
} from 'lucide-react';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';

const studentNavItems = [
  { id: 'enrolled-classes',      label: 'Enrolled Classes',      icon: GraduationCap  },
  { id: 'announcements',         label: 'Announcements',         icon: Megaphone      },
  { id: 'teacher-communication', label: 'Teacher Communication', icon: MessageSquare  },
  { id: 'academic-calendar',     label: 'Academic Calendar',     icon: Calendar       },
  { id: 'course-material',       label: 'Course Material',       icon: BookOpen       },
  { id: 'gradebook',             label: 'Gradebook',             icon: BarChart       },
  { id: 'assignments',           label: 'Assignments',           icon: FileText       },
  { id: 'report',                label: 'Report',                icon: FileText       },
];

const teacherNavItems = [
  { id: 'schedule-management',   label: 'Class & Schedule Management', icon: Calendar      },
  { id: 'course-material',       label: 'Course Material',             icon: BookOpen      },
  { id: 'assignments',           label: 'Assignments',                 icon: FileText      },
  { id: 'student-communication', label: 'Student Communication',       icon: MessageSquare },
  { id: 'teacher-attendance',    label: 'Student Attendance',          icon: UserCheck     },
];

function NavTooltip({ label, show }) {
  if (!show) return null;
  return (
    <div
      role="tooltip"
      className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-medium whitespace-nowrap pointer-events-none z-50 shadow-lg"
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
    <div className="relative px-2" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={handleClick}
        aria-current={active ? 'page' : undefined}
        className={[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group relative',
          active
            ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
        )}
        <Icon
          size={18}
          aria-hidden="true"
          className={`shrink-0 transition-colors ${active ? 'text-[var(--color-primary)]' : ''}`}
        />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.label}</span>
        )}
      </button>
      {collapsed && <NavTooltip label={item.label} show={hovered} />}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const { theme, toggle } = useTheme();
  const sidebarRef = useRef(null);

  const isStudent = user?.role === 'student';
  const navItems = isStudent ? studentNavItems : teacherNavItems;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = ({ isMobile = false }) => (
    <aside
      ref={isMobile ? null : sidebarRef}
      aria-label="Main navigation"
      className={[
        'flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)]',
        isMobile ? 'w-72' : `transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-60'}`,
      ].join(' ')}
    >
      <div className={`flex items-center border-b border-[var(--color-border)] h-16 shrink-0 ${collapsed && !isMobile ? 'justify-center px-3' : 'px-4 gap-3'}`}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span aria-hidden="true" className="text-white text-xs font-bold">M</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                Mizuka Portal
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] capitalize truncate leading-tight">
                {user?.role} dashboard
              </p>
            </div>
          </div>
        )}

        {isMobile ? (
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors shrink-0"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
        )}
      </div>

      {(!collapsed || isMobile) && (
        <div className="px-4 pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Menu
          </p>
        </div>
      )}

      <nav aria-label="Primary navigation" className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeTab === item.id}
            collapsed={collapsed && !isMobile}
            onClick={setActiveTab}
            onMobileClose={isMobile ? closeMobile : undefined}
          />
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3 shrink-0">
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); isMobile && closeMobile(); }}
          aria-label="Go to profile settings"
          className={[
            'w-full flex items-center gap-3 p-2 rounded-xl transition-colors group',
            activeTab === 'profile'
              ? 'bg-[var(--color-primary)]/10'
              : 'hover:bg-[var(--color-border)]/60',
            collapsed && !isMobile ? 'justify-center' : '',
          ].join(' ')}
        >
          {user?.profile ? (
            <img
              src={user.profile}
              alt=""
              aria-hidden="true"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-border)] shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0"
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          {(!collapsed || isMobile) && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate leading-tight">
                {user?.username}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] capitalize truncate leading-tight">
                {user?.role}
              </p>
            </div>
          )}
        </button>

        <div className={`flex mt-1 ${collapsed && !isMobile ? 'flex-col items-center gap-1' : 'gap-1'}`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 transition-colors"
          >
            {theme === 'dark'
              ? <Sun size={16} aria-hidden="true" />
              : <Moon size={16} aria-hidden="true" />}
            {(!collapsed || isMobile) && (
              <span className="text-xs font-medium">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setConfirmLogoutOpen(true)}
            aria-label="Log out"
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/8 transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            {(!collapsed || isMobile) && (
              <span className="text-xs font-medium">Log out</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        className="lg:hidden fixed top-4 left-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-sm transition hover:text-[var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <div className="hidden lg:flex h-full">
        <SidebarContent isMobile={false} />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={closeMobile}
          />
          <div
            className="relative flex h-full"
            style={{ animation: 'slideIn 220ms cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <SidebarContent isMobile={true} />
          </div>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(-100%); opacity: 0.6; }
              to   { transform: translateX(0);    opacity: 1;   }
            }
          `}</style>
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
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          setToast({ isOpen: true, type: 'success', message: 'Logging out…' });
          setTimeout(logout, 700);
        }}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Log out"
        cancelText="Cancel"
        type="warning"
      />
    </>
  );
}