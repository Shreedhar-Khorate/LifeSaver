import { useState } from 'react';

/**
 * TaskCard — Display a task with priority badge, countdown, and status controls
 */
export default function TaskCard({ task, onStatusChange, onDecompose, onDelete, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [isCheckboxHovered, setIsCheckboxHovered] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.task_name);
  const [editHours, setEditHours] = useState(task.estimated_hours);
  const [editImportance, setEditImportance] = useState(task.importance);
  const [editDeadline, setEditDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().substring(0, 16) : ''
  );

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

  const startEditing = (e) => {
    e.stopPropagation();
    setEditName(task.task_name);
    setEditHours(task.estimated_hours);
    setEditImportance(task.importance);
    setEditDeadline(task.deadline ? new Date(task.deadline).toISOString().substring(0, 16) : '');
    setIsEditing(true);
  };

  const handleSaveClick = async (e) => {
    e.stopPropagation();
    if (!editName.trim()) return;

    try {
      const isoDeadline = editDeadline ? new Date(editDeadline).toISOString() : null;
      await onUpdate?.(task.id, {
        task_name: editName.trim(),
        estimated_hours: parseFloat(editHours) || 1.0,
        importance: parseInt(editImportance) || 5,
        deadline: isoDeadline,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save task details:", err);
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
      onClick={() => !isEditing && setIsExpanded(!isExpanded)}
    >
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', width: '100%' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ flex: 1, display: 'grid', gap: '0.75rem', minWidth: 0 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Task Name</label>
              <input
                className="input"
                style={{ fontSize: '0.9rem', padding: '0.375rem 0.5rem', width: '100%', boxSizing: 'border-box' }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Task Name"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 80px', minWidth: '80px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Est. Hours</label>
                <input
                  type="number"
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem', width: '100%', boxSizing: 'border-box' }}
                  value={editHours}
                  onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
                  min={0.25}
                  step={0.25}
                />
              </div>
              <div style={{ flex: '1 1 80px', minWidth: '80px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Importance</label>
                <input
                  type="number"
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem', width: '100%', boxSizing: 'border-box' }}
                  value={editImportance}
                  onChange={(e) => setEditImportance(parseInt(e.target.value) || 5)}
                  min={1}
                  max={10}
                />
              </div>
              <div style={{ flex: '2 1 180px', minWidth: '180px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Deadline</label>
                <input
                  type="datetime-local"
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem', width: '100%', boxSizing: 'border-box' }}
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, justifyContent: 'center', minHeight: '80px' }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', width: '100%' }}
              onClick={handleSaveClick}
              disabled={!editName.trim()}
            >
              Save
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', width: '100%' }}
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {/* Status toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(task.id, isCompleted ? 'pending' : 'completed');
            }}
            onMouseEnter={() => setIsCheckboxHovered(true)}
            onMouseLeave={() => setIsCheckboxHovered(false)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: `1.5px solid ${isCompleted ? 'var(--accent-gold)' : (isCheckboxHovered ? 'var(--accent-gold)' : 'var(--border-medium)')}`,
              background: isCompleted ? 'var(--accent-gold)' : 'transparent',
              boxShadow: !isCompleted && isCheckboxHovered ? '0 0 10px rgba(212, 175, 55, 0.2)' : 'none',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: isCompleted ? '#030303' : 'transparent',
            }}
            title={isCompleted ? "Mark as pending" : "Mark as complete"}
          >
            ✓
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
              <span>Est: {task.estimated_hours}h</span>
              <span>Imp: {task.importance}/10</span>
              {timeLeft && (
                <span style={{
                  color: timeLeft.urgent ? 'var(--accent-red)' : 'var(--text-secondary)',
                  fontWeight: timeLeft.urgent ? 600 : 400,
                  animation: timeLeft.urgent ? 'pulse 2s infinite' : 'none',
                }}>
                  Due: {timeLeft.text}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {!isCompleted && !isDropped && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Edit task details"
                  onClick={startEditing}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'fit-content' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Decompose task"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecompose();
                  }}
                  disabled={decomposing}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'fit-content' }}
                >
                  {decomposing ? <span className="spinner" style={{ width: '0.75rem', height: '0.75rem' }} /> : 'Decompose'}
                </button>
              </>
            )}
            <button
              className="btn btn-ghost btn-icon"
              title="Delete task"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(task.id);
              }}
              style={{ color: 'var(--accent-red)', fontSize: '1.25rem', height: '28px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
          {task.completion_tip && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              background: 'rgba(212, 175, 55, 0.08)',
              borderLeft: '2px solid var(--accent-gold)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.75rem',
            }}>
              <strong style={{ color: 'var(--accent-gold)', marginRight: '0.25rem', fontSize: '0.75rem', letterSpacing: '0.05em' }}>TIP:</strong> {task.completion_tip}
            </div>
          )}
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
