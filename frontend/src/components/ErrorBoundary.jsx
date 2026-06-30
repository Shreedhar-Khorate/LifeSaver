import { Component } from 'react';

/**
 * ErrorBoundary — Catches unhandled React component errors and shows a graceful fallback.
 * Wrap the app root with this to prevent blank white screens on crashes.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state glass-card" style={{ margin: '2rem' }}>
          <span style={{ fontSize: '1.5rem', color: 'var(--accent-red)', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>[ERROR]</span>
          <h3>Something went wrong</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
