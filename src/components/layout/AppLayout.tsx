import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';

export function AppLayout() {
  const { state, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_82%_8%,rgba(166,211,184,.22),transparent_24rem),linear-gradient(135deg,#f8faf9_0%,#f3f7f4_100%)] flex">
      <Sidebar
        userRole={state.user?.role || 'ESTUDIANTE'}
        userName={state.user?.full_name || 'Usuario'}
        onLogout={logout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className="flex-1 flex flex-col">
        <Header
          userName={state.user?.full_name || 'Usuario'}
          userRole={state.user?.role || 'ESTUDIANTE'}
          onNotificationClick={() => {}}
          onProfileClick={() => {}}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
