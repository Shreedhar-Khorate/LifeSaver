import { useEffect, useRef, useState } from 'react';

/**
 * SuccessGauge — Animated circular gauge using SVG
 * Displays success probability as a vibrant donut chart
 */
export default function SuccessGauge({ value = 0, size = 180, label = 'Success' }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColor = (v) => {
    if (v >= 70) return 'var(--accent-green)';
    if (v >= 40) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const getGlow = (v) => {
    if (v >= 70) return 'var(--shadow-glow-green)';
    if (v >= 40) return '0 0 30px rgba(245, 158, 11, 0.2)';
    return 'var(--shadow-glow-red)';
  };

  const color = getColor(animatedValue);

  return (
    <div className="success-gauge" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(${getGlow(animatedValue)})` }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="10"
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: size * 0.22,
          fontWeight: 800,
          color: color,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          transition: 'color 0.5s ease',
        }}>
          {Math.round(animatedValue)}%
        </span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: '0.25rem',
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
