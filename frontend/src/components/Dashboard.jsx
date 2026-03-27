// Dashboard.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Profile from './Profile';

export default function Dashboard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    if (user?.role === 'admin' || user?.role === 'parent') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {user?.role === 'admin' ? 'Admin Panel' : 'Parent Portal'}
            </h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              This role is not fully supported yet. Coming soon!
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'profile':
        return <Profile />;
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Welcome, {user?.username}!
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              This is your dashboard. Select an option from the sidebar.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <main className="flex-1 overflow-auto transition-all duration-300">
        {renderContent()}
      </main>
    </div>
  );
}