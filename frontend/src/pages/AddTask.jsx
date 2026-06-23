import { useState } from 'react';
import { parseTasks, createTask, decomposeTask } from '../services/api';

/**
 * AddTask Page — NL input with AI parse, manual form, and decompose
 */
export default function AddTask() {
  const [mode, setMode] = useState('ai'); // 'ai' or 'manual'
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    task_name: '',
    deadline: '',
    importance: 5,
    estimated_hours: 1.0,
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setParseError(null);
    setParsedTasks([]);
    setSaved(false);

    try {
      const tasks = await parseTasks(text);
      setParsedTasks(tasks);
      showToast(`🎯 Parsed ${tasks.length} task(s) from your text!`);
    } catch (err) {
      setParseError(err.message);
      setMode('manual'); // Auto-fallback to manual
    } finally {
      setParsing(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualForm.task_name.trim()) return;

    try {
      const data = {
        ...manualForm,
        deadline: manualForm.deadline ? new Date(manualForm.deadline).toISOString() : null,
      };
      await createTask(data);
      showToast('✅ Task created successfully!');
      setManualForm({ task_name: '', deadline: '', importance: 5, estimated_hours: 1.0 });
    } catch (err) {
      showToast(`❌ Failed: ${err.message}`, 'error');
    }
  };

  const handleDecompose = async (taskId) => {
    try {
      const subtasks = await decomposeTask(taskId);
      // Update parsed task with subtasks
      setParsedTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, subtasks } : t)
      );
      showToast('🔬 Task decomposed into subtasks!');
    } catch (err) {
      showToast(`❌ Decompose failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>➕ Add Tasks</h1>
        <p className="page-subtitle">Add tasks with AI or manually</p>
      </div>

      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: 'var(--bg-glass)',
        padding: '0.375rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        width: 'fit-content',
      }}>
        {[
          { key: 'ai', label: '🤖 AI Parse', },
          { key: 'manual', label: '✏️ Manual', },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn ${mode === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode(key)}
            style={{ fontSize: '0.85rem' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* AI Parse Mode */}
      {mode === 'ai' && (
        <div className="animate-fade-in-up">
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <label>Describe your tasks in natural language</label>
            <textarea
              className="textarea"
              placeholder={`Try something like:\n"I have a hackathon PPT due tonight at 8pm, super important. Also need to finish my AI assignment by tomorrow, and I have a Google interview next Monday. Oh and I should go to the gym today."`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ marginBottom: '1rem', minHeight: '150px' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleParse}
                disabled={parsing || !text.trim()}
              >
                {parsing ? (
                  <><span className="spinner" /> Parsing with AI...</>
                ) : (
                  <>🧠 Parse with AI</>
                )}
              </button>
              {parseError && (
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                  ⚠️ {parseError} — Try manual mode
                </span>
              )}
            </div>
          </div>

          {/* Parsed Results */}
          {parsedTasks.length > 0 && (
            <div className="stagger">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h2>🎯 Parsed Tasks ({parsedTasks.length})</h2>
                <span className="badge badge-green">Saved to database</span>
              </div>

              {parsedTasks.map((task) => (
                <div key={task.id} className="glass-card" style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{task.task_name}</div>
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}>
                        <span>⏱ {task.estimated_hours}h</span>
                        <span>⭐ {task.importance}/10</span>
                        {task.deadline && (
                          <span>📅 {new Date(task.deadline).toLocaleString()}</span>
                        )}
                        <span className="badge badge-purple">P{Math.round(task.priority_score)}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem' }}
                      onClick={() => handleDecompose(task.id)}
                    >
                      🔬 Decompose
                    </button>
                  </div>

                  {/* Subtasks if decomposed */}
                  {task.subtasks?.length > 0 && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Subtasks
                      </div>
                      {task.subtasks.map((sub) => (
                        <div key={sub.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.375rem 0.5rem',
                          fontSize: '0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-glass)',
                          marginBottom: '0.25rem',
                        }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: sub.is_core ? 'var(--accent-green)' : 'var(--accent-yellow)',
                          }} />
                          <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{sub.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.hours}h</span>
                          <span className={`badge ${sub.is_core ? 'badge-green' : 'badge-yellow'}`}
                            style={{ fontSize: '0.6rem', padding: '0.125rem 0.375rem' }}>
                            {sub.is_core ? 'CORE' : 'OPTIONAL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="glass-card animate-fade-in-up">
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label>Task Name *</label>
              <input
                className="input"
                placeholder="e.g. Hackathon PPT Presentation"
                value={manualForm.task_name}
                onChange={(e) => setManualForm(f => ({ ...f, task_name: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Deadline</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={manualForm.deadline}
                  onChange={(e) => setManualForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                <label>Importance (1-10)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={10}
                  value={manualForm.importance}
                  onChange={(e) => setManualForm(f => ({ ...f, importance: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div>
                <label>Estimated Hours</label>
                <input
                  className="input"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={manualForm.estimated_hours}
                  onChange={(e) => setManualForm(f => ({ ...f, estimated_hours: parseFloat(e.target.value) || 1.0 }))}
                />
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleManualCreate}
              disabled={!manualForm.task_name.trim()}
            >
              ✅ Create Task
            </button>
          </div>
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
