import { useState, useEffect } from 'react';
import { runRescue, getDashboard } from '../services/api';
import SuccessGauge from '../components/SuccessGauge';
import WhatIfSlider from '../components/WhatIfSlider';

/**
 * Rescue Page — Emergency mode that drops non-core subtasks
 * Shows before/after probability flip + what-if slider
 */
export default function Rescue() {
  const [rescueData, setRescueData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [hoursRemaining, setHoursRemaining] = useState(4);
  const [rescuing, setRescuing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleRescue = async () => {
    if (hoursRemaining <= 0) return;
    setRescuing(true);
    setError(null);

    try {
      const data = await runRescue(hoursRemaining);
      setRescueData(data);
      showToast('Rescue Mode activated. Non-essentials dropped.');
    } catch (err) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setRescuing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <span>Loading rescue data...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Rescue Mode</h1>
        <p className="page-subtitle">When time runs out, we cut the non-essentials and save your grade</p>
      </div>

      {/* Rescue Trigger */}
      <div className="glass-card" style={{
        marginBottom: '2rem',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        background: 'rgba(239, 68, 68, 0.03)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <label>Hours Remaining</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                className="input"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hoursRemaining}
                onChange={(e) => setHoursRemaining(parseFloat(e.target.value) || 4)}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>hours left</span>
            </div>
          </div>

          <button
            className="btn btn-danger btn-lg"
            onClick={handleRescue}
            disabled={rescuing}
            style={{
              animation: !rescueData ? 'glow-pulse 2s infinite' : 'none',
              fontSize: '1rem',
            }}
          >
            {rescuing ? (
              <><span className="spinner" /> Rescuing...</>
            ) : (
              <>Rescue Me</>
            )}
          </button>
        </div>

        {!rescueData && (
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>ADVICE:</strong> Make sure your tasks are decomposed first (from the Dashboard or Add Task page). Rescue Mode drops optional subtasks and focuses on what matters most.
          </p>
        )}
      </div>

      {/* Rescue Results */}
      {rescueData && (
        <div className="stagger">
          {/* Probability Flip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '1.5rem',
            alignItems: 'center',
            marginBottom: '2rem',
          }}>
            {/* Before */}
            <div className="glass-card" style={{
              textAlign: 'center',
              padding: '2rem',
              opacity: 0.6,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Before Rescue
              </div>
              <SuccessGauge value={rescueData.before_success} size={140} label="Before" />
            </div>

            {/* Arrow */}
            <div style={{
              fontSize: '2.5rem',
              color: 'var(--accent-green)',
              animation: 'pulse 1.5s infinite',
              textAlign: 'center',
            }}>
              →
            </div>

            {/* After */}
            <div className="glass-card" style={{
              textAlign: 'center',
              padding: '2rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: 'var(--shadow-glow-green)',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                After Rescue
              </div>
              <SuccessGauge value={rescueData.after_success} size={140} label="After" />
            </div>
          </div>

          {/* Focus & Dropped Lists */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Focus List */}
            <div className="glass-card" style={{
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 'bold', letterSpacing: '0.05em' }}>FOCUS</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)', marginLeft: '0.5rem' }}>Core Tasks</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    {rescueData.core_hours}h of core work
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {rescueData.focus.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--accent-green-glow)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--accent-green)',
                    }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Dropped List */}
            <div className="glass-card" style={{
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: 'bold', letterSpacing: '0.05em' }}>CUT</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-red)', marginLeft: '0.5rem' }}>Dropped Items</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    Non-essential items removed
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {rescueData.dropped.length > 0 ? rescueData.dropped.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--accent-red-glow)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'line-through',
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--accent-red)',
                    }} />
                    {item}
                  </div>
                )) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                    Nothing to drop — all subtasks are core!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Tip */}
          {rescueData.tip && (
            <div style={{
              padding: '1rem 1.25rem',
              background: 'var(--accent-purple-glow)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
            }}>
              <strong>AI TIP:</strong> {rescueData.tip}
            </div>
          )}

          {/* What-If Slider */}
          <WhatIfSlider
            coreHours={rescueData.core_hours}
            currentSuccess={rescueData.after_success}
            hoursRemaining={hoursRemaining}
          />
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
