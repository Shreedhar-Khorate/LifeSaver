import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';

import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import Schedule from './pages/Schedule';
import Rescue from './pages/Rescue';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';

import { seedDemo, resetData } from './services/api';

function AppLayout({ user, onLogout }) {
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
      showToast('Crisis loaded. View dashboard to inspect.');
      navigate('/');
      window.location.reload();
    } catch (err) {
      showToast(`Seed failed: ${err.message}`, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetData();
      showToast('All database records cleared.');
      window.location.reload();
    } catch (err) {
      showToast(`Reset failed: ${err.message}`, 'error');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/add', label: 'Add Task' },
    { path: '/schedule', label: 'Schedule' },
    { path: '/rescue', label: 'Rescue' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <div className="bento-app-layout">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="nav-container">
          <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <span className="logo-icon" style={{ color: 'var(--accent-gold)', marginRight: '0.25rem', fontWeight: 'bold' }}>•</span>
            <span className="logo-text">Life Saver</span>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            {navItems.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}
            
            <div className="nav-controls" style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-accent)', marginRight: '0.5rem', fontWeight: 500 }}>
                {user?.name || 'User'}
              </span>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={handleReset} 
                title="Reset Data"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Reset
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleSeed} 
                disabled={seeding}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                {seeding ? 'Loading...' : 'Load Crisis'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={onLogout}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Logout
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
            <Route path="/profile" element={<UserProfile />} />
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
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  useEffect(() => {
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLoginSuccess = (data) => {
    setToken(data.token);
    setUser({
      id: data.user_id,
      name: data.name,
      email: data.email,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {authMode === 'login' ? (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onSwitchToSignup={() => setAuthMode('signup')} 
          />
        ) : (
          <Signup 
            onSignupSuccess={handleLoginSuccess} 
            onSwitchToLogin={() => setAuthMode('login')} 
          />
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

export default App;

