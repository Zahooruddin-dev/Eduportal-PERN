// Sidebar.jsx
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, Calendar, BookOpen, FileText, BarChart, Users, Clock, GraduationCap, MessageSquare, UserCheck } from 'lucide-react';

const studentNavItems = [
  { id: 'live-sessions', label: 'Live Sessions', icon: Clock },
  { id: 'academic-calendar', label: 'Academic Calendar', icon: Calendar },
  { id: 'course-material', label: 'Course Material', icon: BookOpen },
  { id: 'gradebook', label: 'Gradebook', icon: BarChart },
  { id: 'report', label: 'Report', icon: FileText },
];

const teacherNavItems = [
  { id: 'live-sessions', label: 'Live Sessions', icon: Clock },
  { id: 'schedule-management', label: 'Class & Schedule Management', icon: Calendar },
  { id: 'course-repository', label: 'Course Repository', icon: BookOpen },
  { id: 'gradebook', label: 'Gradebook', icon: BarChart },
  { id: 'parent-communication', label: 'Parent Communication', icon: MessageSquare },
  { id: 'student-attendance', label: 'Student Attendance', icon: UserCheck },
];

export default function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const navItems = isStudent ? studentNavItems : teacherNavItems;

  return (
    <aside
      className={`bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="text-lg font-semibold text-[var(--color-text-primary)]">
            My App
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-[var(--color-border)] transition-colors"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-r-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div
        onClick={() => setActiveTab('profile')}
        className={`flex items-center gap-3 p-4 border-t border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-border)]/50 transition-colors ${
          activeTab === 'profile' ? 'bg-[var(--color-primary)]/10' : ''
        }`}
      >
        {user?.profile ? (
          <img
            src={user.profile}
            alt="profile"
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {user?.username}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] capitalize">
              {user?.role}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}