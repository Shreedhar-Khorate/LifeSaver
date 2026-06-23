import { useState } from 'react';

/**
 * TaskCard — Display a task with priority badge, countdown, and status controls
 */
export default function TaskCard({ task, onStatusChange, onDecompose, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [decomposing, setDecomposing] = useState(false);

  const getTimeLeft = () => {
    if (!task.deadline) return null;
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diff = deadline - now;

    if (diff < 0) return { text: 'OVERDUE', urgent: true };

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ${hours % 24}h left`, urgent: false };
    }
    if (hours > 0) {
      return { text: `${hours}h ${mins}m left`, urgent: hours < 4 };
    }
    return { text: `${mins}m left`, urgent: true };
  };

  const getPriorityColor = () => {
    const s = task.priority_score;
    if (s >= 80) return 'red';
    if (s >= 60) return 'yellow';
    if (s >= 40) return 'blue';
    return 'green';
  };

  const timeLeft = getTimeLeft();
  const priorityColor = getPriorityColor();
  const isCompleted = task.status === 'completed';
  const isDropped = task.status === 'dropped';

  const handleDecompose = async () => {
    if (decomposing || !onDecompose) return;
    setDecomposing(true);
    try {
      await onDecompose(task.id);
      setIsExpanded(true);
    } finally {
      setDecomposing(false);
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        opacity: isCompleted || isDropped ? 0.5 : 1,
        transition: 'all var(--transition-normal)',
        cursor: 'pointer',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Status toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange?.(task.id, isCompleted ? 'pending' : 'completed');
          }}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `2px solid ${isCompleted ? 'var(--accent-green)' : 'var(--border-medium)'}`,
            background: isCompleted ? 'var(--accent-green)' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            fontSize: '0.7rem',
            color: 'white',
          }}
        >
          {isCompleted && '✓'}
        </button>

        {/* Task info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}>
              {task.task_name}
            </span>
            <span className={`badge badge-${priorityColor}`}>
              P{Math.round(task.priority_score)}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}>
            <span>⏱ {task.estimated_hours}h</span>
            <span>⭐ {task.importance}/10</span>
            {timeLeft && (
              <span style={{
                color: timeLeft.urgent ? 'var(--accent-red)' : 'var(--text-secondary)',
                fontWeight: timeLeft.urgent ? 600 : 400,
                animation: timeLeft.urgent ? 'pulse 2s infinite' : 'none',
              }}>
                🕐 {timeLeft.text}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          {!isCompleted && !isDropped && (
            <button
              className="btn btn-ghost btn-icon"
              title="Decompose task"
              onClick={(e) => {
                e.stopPropagation();
                handleDecompose();
              }}
              disabled={decomposing}
            >
              {decomposing ? <span className="spinner" /> : '🔬'}
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon"
            title="Delete task"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(task.id);
            }}
            style={{ color: 'var(--accent-red)' }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Expanded subtasks */}
      {isExpanded && task.subtasks?.length > 0 && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}>
            Subtasks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {task.subtasks.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  padding: '0.375rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-glass)',
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: sub.is_core ? 'var(--accent-green)' : 'var(--accent-yellow)',
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{sub.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {sub.hours}h
                </span>
                <span className={`badge ${sub.is_core ? 'badge-green' : 'badge-yellow'}`}
                  style={{ fontSize: '0.6rem', padding: '0.125rem 0.375rem' }}>
                  {sub.is_core ? 'CORE' : 'OPTIONAL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
