/**
 * DNABadge — Shows user's Deadline DNA type with emoji, label, and tip
 */

const DNA_CONFIG = {
  last_minute:   { label: 'Last Minute Worker',  color: 'yellow' },
  consistent:    { label: 'Consistent Worker',   color: 'green'  },
  deep_focus:    { label: 'Deep Focus Worker',   color: 'blue'   },
  overcommitter: { label: 'Overcommitter',       color: 'red'    },
};

export default function DNABadge({ dnaType = 'consistent', tip = '' }) {
  const config = DNA_CONFIG[dnaType] || DNA_CONFIG.consistent;

  const colorMap = {
    yellow: { bg: 'var(--accent-yellow-glow)', border: 'rgba(245, 158, 11, 0.2)', text: 'var(--accent-yellow)' },
    green:  { bg: 'var(--accent-green-glow)',  border: 'rgba(16, 185, 129, 0.2)', text: 'var(--accent-green)' },
    blue:   { bg: 'var(--accent-blue-glow)',   border: 'rgba(59, 130, 246, 0.2)', text: 'var(--accent-blue)' },
    red:    { bg: 'var(--accent-red-glow)',    border: 'rgba(239, 68, 68, 0.2)',  text: 'var(--accent-red)' },
  };

  const colors = colorMap[config.color] || colorMap.green;

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      backdropFilter: 'blur(10px)',
      transition: 'all var(--transition-normal)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: tip ? '0.75rem' : 0,
      }}>
        <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--accent-gold)' }}>•</span>
        <div>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Deadline DNA
          </div>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: colors.text,
            letterSpacing: '-0.01em',
          }}>
            {config.label}
          </div>
        </div>
      </div>
      {tip && (
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          paddingTop: '0.75rem',
          borderTop: `1px solid ${colors.border}`,
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', letterSpacing: '0.05em', marginRight: '0.25rem' }}>ADVICE:</strong> {tip}
        </div>
      )}
    </div>
  );
}
