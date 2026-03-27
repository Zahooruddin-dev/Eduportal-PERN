import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import SidebarContent from './SidebarContent';
import useTheme from '../../hooks/useTheme';

const Sidebar = ({
  activePage,
  onPageChange,
  userName = 'Guest',
  userRole = 'user',
  userProfile = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? 'hidden' : '';
  }, [isOpen, isMobile]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isMobile ? '272px' : collapsed ? '68px' : '272px',
    );
  }, [collapsed, isMobile]);

  const handlePageChange = (id) => {
    onPageChange(id);
    if (isMobile) setIsOpen(false);
  };

  const effectiveCollapsed = collapsed && !isMobile;

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          className={"fixed top-4 left-4 z-[60] flex items-center justify-center w-9 h-9 rounded-md bg-[var(--sb-bg-elevated)] border border-[var(--sb-border-strong)] text-[var(--sb-text)] cursor-pointer"}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isMobile && isOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={"fixed top-0 left-0 h-[100dvh] z-50 flex flex-col overflow-hidden bg-[var(--sb-bg)] border-r"}
        style={{
          width: isMobile ? '272px' : effectiveCollapsed ? '68px' : '272px',
          borderRightColor: 'var(--sb-border)',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)'
        }}
      >
        <SidebarContent
          activePage={activePage}
          onPageChange={handlePageChange}
          userName={userName}
          userRole={userRole}
          userProfile={userProfile}
          collapsed={effectiveCollapsed}
          onCollapse={() => setCollapsed((v) => !v)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </aside>
    </>
  );
};

export default Sidebar;