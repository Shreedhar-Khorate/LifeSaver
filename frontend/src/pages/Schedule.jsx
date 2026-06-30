import { useState, useEffect } from 'react';
import { getTodaySchedule, generateSchedule } from '../services/api';
import Timeline from '../components/Timeline';

/**
 * Schedule Page — Generate and view today's time-blocked schedule
 */
export default function Schedule() {
  const [slots, setSlots] = useState([]);
  const [availableHours, setAvailableHours] = useState(6);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const data = await getTodaySchedule();
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedule(); }, []);

  const handleGenerate = async () => {
    if (availableHours <= 0) return;
    setGenerating(true);
    setError(null);

    try {
      const data = await generateSchedule(availableHours);
      setSlots(data);
      showToast(`Schedule generated. ${data.length} task(s) scheduled.`);
    } catch (err) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const totalScheduled = slots.reduce((sum, s) => sum + s.hours, 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Schedule</h1>
        <p className="page-subtitle">Your optimized time-blocked plan for today</p>
      </div>

      {/* Generate Controls */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <label>Available Hours Today</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                className="input"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={availableHours}
                onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 6)}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>hours</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <><span className="spinner" /> Generating...</>
            ) : (
              <>Generate Schedule</>
            )}
          </button>

          {slots.length > 0 && (
            <div style={{
              marginLeft: 'auto',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Scheduled
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                {totalScheduled.toFixed(1)}h / {availableHours}h
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Timeline */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
          <span>Loading schedule...</span>
        </div>
      ) : error ? (
        <div className="empty-state glass-card">
          <span style={{ fontSize: '1.5rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>[ERROR]</span>
          <h3>Error loading schedule</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchSchedule}>Retry</button>
        </div>
      ) : (
        <div className="glass-card animate-fade-in-up">
          <Timeline slots={slots} />
        </div>
      )}

      {/* Quick tips */}
      {slots.length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--accent-purple-glow)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <strong>Advice:</strong> Tasks are ordered by priority score. The most urgent and important tasks come first. Adjust your available hours and regenerate to see how the schedule adapts.
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
