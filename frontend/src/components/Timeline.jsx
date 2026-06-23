/**
 * Timeline — Horizontal colored blocks for schedule visualization
 */
export default function Timeline({ slots = [] }) {
  if (slots.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <span className="emoji">📅</span>
        <p>No schedule generated yet. Set your available hours and generate one!</p>
      </div>
    );
  }

  const colors = [
    'var(--accent-purple)',
    'var(--accent-blue)',
    'var(--accent-green)',
    'var(--accent-cyan)',
    'var(--accent-yellow)',
    'var(--accent-orange)',
    'var(--accent-red)',
  ];

  const totalHours = slots.reduce((sum, s) => sum + s.hours, 0);

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="timeline-container">
      {/* Horizontal bar */}
      <div style={{
        display: 'flex',
        width: '100%',
        height: '48px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem',
      }}>
        {slots.map((slot, i) => {
          const widthPercent = (slot.hours / totalHours) * 100;
          const color = colors[i % colors.length];
          return (
            <div
              key={slot.id || i}
              title={`${slot.task_name} (${slot.hours}h)`}
              style={{
                width: `${widthPercent}%`,
                height: '100%',
                background: color,
                opacity: 0.85,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'white',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                padding: '0 0.375rem',
                transition: 'opacity var(--transition-fast)',
                cursor: 'default',
                minWidth: '30px',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.85'}
            >
              {widthPercent > 12 ? slot.task_name : ''}
            </div>
          );
        })}
      </div>

      {/* Slot details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {slots.map((slot, i) => {
          const color = colors[i % colors.length];
          return (
            <div
              key={slot.id || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{slot.task_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
                </div>
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
                {slot.hours}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
