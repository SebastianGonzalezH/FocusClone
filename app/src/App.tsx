import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, List, Tags, LogOut, Power, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AccessibilityBanner } from './components/AccessibilityBanner';
import Dashboard from './pages/Dashboard';
import EventLog from './pages/EventLog';
import Categories from './pages/Categories';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TemplateSelection from './pages/onboarding/TemplateSelection';
import SettingsPage from './pages/Settings';
import Landing from './pages/Landing';

// Redirect to landing if not authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Nav item component - Premium minimal with gold active indicator
function NavItem({ to, icon: Icon, isActive }: { to: string; icon: typeof LayoutDashboard; isActive: boolean }) {
  return (
    <NavLink to={to} className="relative">
      <motion.div
        className={`p-3.5 transition-colors duration-200 ${
          isActive ? 'text-accent' : 'text-muted hover:text-white'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Icon size={18} strokeWidth={1.5} />
      </motion.div>
      {/* Gold active indicator line */}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </NavLink>
  );
}

function AppLayout() {
  const { signOut, user, loading } = useAuth();
  const [trackingPaused, setTrackingPaused] = useState(false);
  const location = useLocation();

  // Load tracking pause state on mount
  useEffect(() => {
    if (window.electronAPI?.getTrackingPaused) {
      window.electronAPI.getTrackingPaused().then((result) => {
        setTrackingPaused(result?.paused || false);
      });
    }
  }, []);

  // Show loading screen while auth is resolving (prevents sidebar flash)
  if (loading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <span className="text-display text-2xl text-accent">K</span>
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  async function toggleTracking() {
    const newPaused = !trackingPaused;
    if (window.electronAPI?.setTrackingPaused) {
      await window.electronAPI.setTrackingPaused(newPaused);
      setTrackingPaused(newPaused);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Ultra minimal, sharp */}
      <nav className="w-14 bg-background border-r border-border flex flex-col items-center pt-8 pb-6">
        {/* Logo - Serif K for Kronos */}
        <span className="text-display text-xl text-accent mb-10">K</span>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-1">
          <NavItem to="/" icon={LayoutDashboard} isActive={location.pathname === '/'} />
          <NavItem to="/events" icon={List} isActive={location.pathname === '/events'} />
          <NavItem to="/categories" icon={Tags} isActive={location.pathname === '/categories'} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1">
          {/* Settings */}
          {user && (
            <NavItem to="/settings" icon={Settings} isActive={location.pathname === '/settings'} />
          )}

          {/* Tracking toggle */}
          {user && (
            <motion.button
              onClick={toggleTracking}
              className={`p-3.5 transition-colors duration-200 ${
                trackingPaused ? 'text-rose-400' : 'text-accent'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={trackingPaused ? 'Resume tracking' : 'Pause tracking'}
            >
              <Power size={18} strokeWidth={1.5} />
            </motion.button>
          )}

          {/* Sign out */}
          {user && (
            <motion.button
              onClick={signOut}
              className="p-3.5 text-muted hover:text-white transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Sign out"
            >
              <LogOut size={18} strokeWidth={1.5} />
            </motion.button>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <AccessibilityBanner />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-8 flex-1"
          >
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventLog /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/onboarding/template" element={<TemplateSelection />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
