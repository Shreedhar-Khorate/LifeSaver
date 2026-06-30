import { useState } from 'react';
import { registerUser } from '../services/api';

/**
 * Signup Page — Modern dark Luxury style registration form
 */
export default function Signup({ onSignupSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await registerUser(name, email, password);
      // Save token & user in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify({
        id: data.user_id,
        name: data.name,
        email: data.email,
      }));
      onSignupSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>•</span>
          <h2 style={{ letterSpacing: '0.1em' }} className="text-gradient">Create Account</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Set up your profile to manage project deadlines.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(204, 102, 102, 0.1)',
            border: '1px solid rgba(204, 102, 102, 0.3)',
            color: 'var(--accent-red)',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              type="text"
              className="input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              placeholder="e.g. demo@lifesaver.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="signup-password">Password (min 6 characters)</label>
            <input
              id="signup-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', height: '44px' }}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Creating account...</>
            ) : (
              'Join Crisis Team'
            )}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          Already registered?{' '}
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-accent)',
              cursor: 'pointer',
              fontWeight: 500,
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
