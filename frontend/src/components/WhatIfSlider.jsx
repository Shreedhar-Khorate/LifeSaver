import { useState, useEffect, useCallback } from 'react';
import { simulateRescue } from '../services/api';

/**
 * WhatIfSlider — Drag to simulate success probability with extra hours
 * Calls /rescue/simulate — pure Python, instant response, no AI
 */
export default function WhatIfSlider({ coreHours = 0, currentSuccess = 0 }) {
  const [extraHours, setExtraHours] = useState(0);
  const [simulatedSuccess, setSimulatedSuccess] = useState(currentSuccess);
  const [loading, setLoading] = useState(false);

  // Debounced simulation
  useEffect(() => {
    if (extraHours === 0) {
      setSimulatedSuccess(currentSuccess);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await simulateRescue(extraHours);
        setSimulatedSuccess(result.success_probability);
      } catch (err) {
        console.error('Simulation failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [extraHours, currentSuccess]);

  const getColor = (v) => {
    if (v >= 70) return 'var(--accent-green)';
    if (v >= 40) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const diff = simulatedSuccess - currentSuccess;

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            What-If Simulator
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '0.125rem',
          }}>
            What if you had more time?
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: getColor(simulatedSuccess),
            transition: 'color var(--transition-fast)',
          }}>
            {simulatedSuccess}%
          </span>
          {diff > 0 && (
            <span style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--accent-green)',
            }}>
              +{diff}% improvement
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={extraHours}
          onChange={(e) => setExtraHours(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            appearance: 'none',
            background: `linear-gradient(to right, var(--accent-purple) ${(extraHours / 12) * 100}%, var(--border-subtle) ${(extraHours / 12) * 100}%)`,
            borderRadius: '9999px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <span>+0h (current)</span>
        <span style={{
          fontWeight: 600,
          color: extraHours > 0 ? 'var(--accent-purple)' : 'var(--text-muted)',
        }}>
          +{extraHours}h extra
        </span>
        <span>+12h</span>
      </div>

      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <span className="spinner" style={{ width: '0.75rem', height: '0.75rem' }} />
          Simulating...
        </div>
      )}
    </div>
  );
}
