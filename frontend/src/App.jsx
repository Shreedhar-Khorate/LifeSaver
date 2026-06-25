import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';

import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import Schedule from './pages/Schedule';
import Rescue from './pages/Rescue';

import { seedDemo, resetData } from './services/api';

function AppLayout() {
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    { path: '/rescue', label: 'Rescue', icon: '🚨' },
  ];

  return (
    <div className="bento-app-layout">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="logo-icon">🚨</span>
            <span className="logo-text">Life Saver</span>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            {navItems.map(({ path, label, icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}
            
            <div className="nav-controls">
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={handleReset} 
                title="Reset Data"
              >
                🔄 Reset
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleSeed} 
                disabled={seeding}
              >
                {seeding ? 'Loading...' : 'Load Crisis Demo'}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bento-main-content">
        <div className="content-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddTask />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/rescue" element={<Rescue />} />
          </Routes>
        </div>
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
