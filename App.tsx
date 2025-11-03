import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './components/Dashboard';
import { Campaigns } from './components/Campaigns';
import { Agents } from './components/Agents';
import { Reports } from './components/Reports';
import { Toaster } from './components/ui/sonner';
import { useAuthStore } from './stores/authStore';
import authService from './services/authService';

export default function App() {
  const { isAuthenticated, session, logout: logoutStore } = useAuthStore();
  const [username, setUsername] = useState('');
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize with favorite or default to 'campaigns'
    const savedFavorite = localStorage.getItem('favoriteMenu');
    return savedFavorite || 'campaigns';
  });

  // On mount, check if we have a persisted session
  useEffect(() => {
    if (isAuthenticated && session) {
      console.log('[App] Restored session for user:', session.agent_user);
      setUsername(session.agent_user);

      // Load favorite menu from localStorage
      const savedFavorite = localStorage.getItem('favoriteMenu');
      if (savedFavorite) {
        setCurrentPage(savedFavorite);
      }
    }
  }, [isAuthenticated, session]);

  const handleLogin = (user: string) => {
    setUsername(user);

    // Load favorite menu from localStorage
    const savedFavorite = localStorage.getItem('favoriteMenu');
    if (savedFavorite) {
      setCurrentPage(savedFavorite);
    }
  };

  const handleLogout = () => {
    console.log('[App] Logging out user:', username);

    // Clear auth store
    logoutStore();

    // Clear auth service
    authService.logout();

    setUsername('');

    // Don't reset currentPage to preserve favorite for next login
    const savedFavorite = localStorage.getItem('favoriteMenu');
    setCurrentPage(savedFavorite || 'campaigns');
  };

  const handleNavigate = (menuId: string) => {
    setCurrentPage(menuId);
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard username={username} />;
      case 'campaigns':
      case 'campaigns-list':
      case 'campaigns-active':
      case 'campaigns-create':
        return <Campaigns username={username} />;
      case 'agents':
      case 'agents-list':
      case 'agents-performance':
        return <Agents username={username} />;
      case 'reports':
      case 'reports-calls':
      case 'reports-agents':
      case 'reports-campaigns':
        return <Reports username={username} />;
      default:
        return <Dashboard username={username} />;
    }
  };

  return (
    <>
      <DashboardLayout 
        username={username} 
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentPage={currentPage}
      >
        {renderPage()}
      </DashboardLayout>
      <Toaster />
    </>
  );
}
