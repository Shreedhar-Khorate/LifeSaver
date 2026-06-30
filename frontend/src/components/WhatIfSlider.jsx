import { useState, useEffect, useCallback } from 'react';
import { simulateRescue } from '../services/api';

/**
 * WhatIfSlider — Drag to simulate success probability with extra hours
 * Calls /rescue/simulate — pure Python, instant response, no AI
 */
export default function WhatIfSlider({ coreHours = 0, currentSuccess = 0, hoursRemaining = 0 }) {
  const [extraHours, setExtraHours] = useState(0);
  const [simulatedSuccess, setSimulatedSuccess] = useState(currentSuccess);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Debounced simulation
  useEffect(() => {
    if (extraHours === 0) {
      setSimulatedSuccess(currentSuccess);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await simulateRescue(extraHours, hoursRemaining);
        setSimulatedSuccess(result.success_probability);
      } catch (err) {
        console.error('Simulation failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [extraHours, currentSuccess, hoursRemaining]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              What-If Simulator
            </span>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid var(--border-accent)',
                color: 'var(--accent-gold)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all var(--transition-fast)',
                fontWeight: 'bold',
              }}
              title="What is this?"
            >
              ?
            </button>
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

      {showHelp && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          lineHeight: '1.4',
          color: 'var(--text-secondary)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-accent)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            HOW THE SIMULATOR WORKS
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            When you enter <strong>Rescue Mode</strong>, LifeSaver drops optional subtasks (like polish or animations) to fit your core work in.
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            Drag this slider to simulate adding extra working hours to your day (e.g. by canceling other plans).
          </p>
          <div style={{ display: 'grid', gap: '0.375rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
              <span><strong>70%+ (Safe):</strong> Highly likely to complete core tasks.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-yellow)', flexShrink: 0 }} />
              <span><strong>40%-69% (Risk):</strong> Tight timeline. High chance of rushing or failure.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)', flexShrink: 0 }} />
              <span><strong>&lt;40% (Danger):</strong> Inadequate time. You must carve out more hours.</span>
            </div>
          </div>
        </div>
      )}

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
