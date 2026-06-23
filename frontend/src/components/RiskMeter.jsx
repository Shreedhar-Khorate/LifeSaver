import { useEffect, useState } from 'react';

/**
 * RiskMeter — Animated colored progress bar
 * Shows risk score with dynamic color (green → yellow → red)
 */
export default function RiskMeter({ value = 0, showLabel = true }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColor = (v) => {
    if (v >= 70) return 'var(--accent-red)';
    if (v >= 40) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
  };

  const getLabel = (v) => {
    if (v >= 80) return 'CRITICAL';
    if (v >= 60) return 'HIGH';
    if (v >= 40) return 'MODERATE';
    if (v >= 20) return 'LOW';
    return 'MINIMAL';
  };

  const getGlowColor = (v) => {
    if (v >= 70) return 'rgba(239, 68, 68, 0.3)';
    if (v >= 40) return 'rgba(245, 158, 11, 0.3)';
    return 'rgba(16, 185, 129, 0.3)';
  };

  const color = getColor(animatedValue);
  const riskLabel = getLabel(animatedValue);

  return (
    <div className="risk-meter">
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Risk Level
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: color,
            letterSpacing: '0.05em',
            transition: 'color 0.5s ease',
          }}>
            {riskLabel} ({Math.round(animatedValue)})
          </span>
        </div>
      )}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--bg-glass)',
        borderRadius: '9999px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          height: '100%',
          width: `${animatedValue}%`,
          background: color,
          borderRadius: '9999px',
          transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease',
          boxShadow: `0 0 12px ${getGlowColor(animatedValue)}`,
        }} />
      </div>
    </div>
  );
}
