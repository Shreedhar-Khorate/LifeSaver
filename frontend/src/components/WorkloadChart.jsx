import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';

export default function WorkloadChart({ tasks = [] }) {
  const barCanvasRef = useRef(null);
  const doughnutCanvasRef = useRef(null);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const [activeTab, setActiveTab] = useState('hours'); // 'hours' or 'priority'

  useEffect(() => {
    if (tasks.length === 0) return;

    // Chart.js global font config
    Chart.defaults.font.family = 'Inter, system-ui, -apple-system, sans-serif';
    Chart.defaults.color = '#94a3b8'; // text-muted equivalent

    // 1. Bar Chart: Estimated Hours per Task (only pending tasks to see remaining work)
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    
    if (barCanvasRef.current && activeTab === 'hours') {
      if (barChartRef.current) {
        barChartRef.current.destroy();
      }

      const labels = pendingTasks.map(t => {
        // truncate long task names
        return t.task_name.length > 15 ? t.task_name.substring(0, 15) + '...' : t.task_name;
      });
      const data = pendingTasks.map(t => t.estimated_hours);

      barChartRef.current = new Chart(barCanvasRef.current, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['No pending tasks'],
          datasets: [{
            label: 'Estimated Hours',
            data: data.length > 0 ? data : [0],
            backgroundColor: 'rgba(212, 175, 55, 0.2)', // translucent gold
            borderColor: '#d4af37', // gold
            borderWidth: 1.5,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(212, 175, 55, 0.4)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#121220',
              titleColor: '#ffffff',
              bodyColor: '#d4af37',
              borderColor: 'rgba(212, 175, 55, 0.2)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.03)',
              },
              ticks: {
                font: { size: 10 }
              }
            },
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.03)',
              },
              ticks: {
                font: { size: 10 },
                callback: (value) => `${value}h`
              },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 2. Doughnut Chart: Priority Distribution (High, Med, Low)
    if (doughnutCanvasRef.current && activeTab === 'priority') {
      if (doughnutChartRef.current) {
        doughnutChartRef.current.destroy();
      }

      const high = tasks.filter(t => t.priority_score >= 70).length;
      const med = tasks.filter(t => t.priority_score >= 40 && t.priority_score < 70).length;
      const low = tasks.filter(t => t.priority_score < 40).length;

      doughnutChartRef.current = new Chart(doughnutCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['High Risk', 'Moderate Risk', 'Minimal Risk'],
          datasets: [{
            data: [high, med, low],
            backgroundColor: [
              'rgba(239, 68, 68, 0.2)',  // translucent red
              'rgba(245, 158, 11, 0.2)', // translucent yellow
              'rgba(16, 185, 129, 0.2)'  // translucent green
            ],
            borderColor: [
              '#ef4444', // red
              '#f59e0b', // yellow
              '#10b981'  // green
            ],
            borderWidth: 1.5,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                font: { size: 11 },
                padding: 15
              }
            },
            tooltip: {
              backgroundColor: '#121220',
              titleColor: '#ffffff',
              bodyColor: '#e2e8f0',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderWidth: 1,
              padding: 10
            }
          },
          cutout: '70%'
        }
      });
    }

    return () => {
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
      if (doughnutChartRef.current) {
        doughnutChartRef.current.destroy();
        doughnutChartRef.current = null;
      }
    };
  }, [tasks, activeTab]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>Workload Analysis</h3>
        <div style={{
          display: 'flex',
          gap: '0.375rem',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            className={`btn btn-sm ${activeTab === 'hours' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: 'none' }}
            onClick={() => setActiveTab('hours')}
          >
            Estimated Hours
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'priority' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: 'none' }}
            onClick={() => setActiveTab('priority')}
          >
            Priority Split
          </button>
        </div>
      </div>

      <div style={{ height: '220px', position: 'relative' }}>
        {activeTab === 'hours' && (
          <canvas ref={barCanvasRef} />
        )}
        {activeTab === 'priority' && (
          <canvas ref={doughnutCanvasRef} />
        )}
      </div>
    </div>
  );
}
