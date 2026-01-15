import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, List } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import EventLog from './pages/EventLog';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `p-3 rounded-lg transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-muted hover:text-foreground hover:bg-border'
              }`
            }
          >
            <LayoutDashboard size={24} />
          </NavLink>
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `p-3 rounded-lg transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-muted hover:text-foreground hover:bg-border'
              }`
            }
          >
            <List size={24} />
          </NavLink>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<EventLog />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
