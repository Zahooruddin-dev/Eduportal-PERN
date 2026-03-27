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
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.5rem',
            background: 'var(--sb-bg-elevated)',
            border: '1px solid var(--sb-border-strong)',
            color: 'var(--sb-text)',
            cursor: 'pointer',
          }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isMobile && isOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          zIndex: 50,
          width: isMobile ? '272px' : effectiveCollapsed ? '68px' : '272px',
          background: 'var(--sb-bg)',
          borderRight: '1px solid var(--sb-border)',
          display: 'flex',
          flexDirection: 'column',
          transition:
            'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
          willChange: 'transform, width',
          overflow: 'hidden',
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