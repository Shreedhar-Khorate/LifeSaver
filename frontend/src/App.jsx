import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';

import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import Schedule from './pages/Schedule';
import Rescue from './pages/Rescue';

import { seedDemo, resetData } from './services/api';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      showToast('🚨 7 PM Crisis loaded! Check the dashboard.');
      navigate('/');
      // Force page reload to refresh dashboard
      window.location.reload();
    } catch (err) {
      showToast(`❌ Seed failed: ${err.message}`, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetData();
      showToast('🔄 All data cleared!');
      window.location.reload();
    } catch (err) {
      showToast(`❌ Reset failed: ${err.message}`, 'error');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/add', label: 'Add Task', icon: '➕' },
    { path: '/schedule', label: 'Schedule', icon: '📅' },
    { path: '/rescue', label: 'Rescue Mode', icon: '🚨' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
          <span className="text-gradient">Life Saver</span>
        </span>
        <div style={{ width: '2rem' }} />
      </div>

      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🚨</span>
            <div className="logo-text">
              <span>Life Saver</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-section-label" style={{ padding: '0 0.25rem 0.5rem' }}>Demo Controls</div>
          <button
            className="seed-btn"
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginBottom: '0.5rem' }}
          >
            {seeding ? (
              <><span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderTopColor: 'var(--accent-red)' }} /> Loading...</>
            ) : (
              <>🚨 Load 7PM Crisis</>
            )}
          </button>
          <button
            className="seed-btn"
            onClick={handleReset}
            style={{
              background: 'var(--bg-glass)',
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            🔄 Reset All Data
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddTask />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/rescue" element={<Rescue />} />
        </Routes>
      </main>

      {/* Global Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
