import { useState, useEffect } from 'react';
import { getDashboard, getTasks, decomposeTask, updateTask, deleteTask } from '../services/api';
import SuccessGauge from '../components/SuccessGauge';
import RiskMeter from '../components/RiskMeter';
import DNABadge from '../components/DNABadge';
import TaskCard from '../components/TaskCard';
import WorkloadChart from '../components/WorkloadChart';

/**
 * Dashboard Page — Main overview showing stats, risk, DNA, and task list
 */
export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, taskData] = await Promise.all([
        getDashboard(),
        getTasks(),
      ]);
      setDashboard(dashData);
      setTasks(taskData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleUpdate = async (taskId, updatedData) => {
    try {
      await updateTask(taskId, updatedData);
      fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDecompose = async (taskId) => {
    try {
      await decomposeTask(taskId);
      fetchData();
    } catch (err) {
      console.error('Decompose failed:', err);
    }
  };

  const handleDelete = async (taskId) => {
    // Optimistically remove from UI immediately (no flicker)
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Delete failed:', err);
      // Rollback — re-fetch real state from server
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <span className="emoji">⚠️</span>
        <h3>Failed to load dashboard</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Your deadline crisis command center</p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }} className="stagger">
        {[
          { label: 'Total Tasks', value: d.total_tasks || 0, color: 'var(--accent-purple)' },
          { label: 'Pending', value: d.pending_tasks || 0, color: 'var(--accent-yellow)' },
          { label: 'Completed', value: d.completed_tasks || 0, color: 'var(--accent-green)' },
        ].map((stat) => (
          <div className="glass-card" key={stat.label} style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>•</div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: stat.color,
              lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginTop: '0.25rem',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Gauge + Risk + DNA row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 1fr',
        gap: '1.5rem',
        marginBottom: '2rem',
        alignItems: 'stretch',
      }}>
        {/* Success Gauge */}
        <div className="glass-card animate-fade-in-up" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <SuccessGauge value={d.success_probability || 0} />
        </div>

        {/* Risk + Stats */}
        <div className="glass-card animate-fade-in-up" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '1.5rem',
          animationDelay: '0.1s',
        }}>
          <RiskMeter value={d.risk_score || 0} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risk Score
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
                {d.risk_score || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Success Rate
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
                {d.success_probability || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* DNA Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <DNABadge dnaType={d.dna_type} tip={d.dna_tip} />
        </div>
      </div>

      <WorkloadChart tasks={tasks} />

      {/* Task List */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2>Your Tasks</h2>
          <button className="btn btn-ghost" onClick={fetchData}>Refresh</button>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state glass-card">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-accent)', letterSpacing: '0.1em', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>[NO TASKS ACTIVE]</span>
            <h3>No tasks yet</h3>
            <p>Add tasks using the "Add Task" page, or seed demo data from the sidebar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="stagger">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDecompose={handleDecompose}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
