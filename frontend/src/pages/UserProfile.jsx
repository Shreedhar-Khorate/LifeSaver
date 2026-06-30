import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../services/api';
import DNABadge from '../components/DNABadge';

/**
 * User Profile Settings Page — Edit name, available hours, peak hours, and view DNA
 */
export default function UserProfile({ onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [availableHours, setAvailableHours] = useState(6.0);
  const [intervals, setIntervals] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name);
      setAvailableHours(data.available_hours);
      
      let parsedIntervals = [];
      try {
        const rawList = JSON.parse(data.peak_hours || '["09:00-12:00","14:00-18:00"]');
        parsedIntervals = rawList.map((str, idx) => {
          const [start, end] = str.split('-');
          return { id: idx + 1, start: start || '09:00', end: end || '17:00' };
        });
      } catch (e) {
        parsedIntervals = [
          { id: 1, start: '09:00', end: '12:00' },
          { id: 2, start: '14:00', end: '18:00' }
        ];
      }
      setIntervals(parsedIntervals);
    } catch (err) {
      showToast(`Failed to load profile: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleIntervalChange = (id, field, value) => {
    setIntervals(prev =>
      prev.map(i => i.id === id ? { ...i, [field]: value } : i)
    );
  };

  const handleAddInterval = () => {
    setIntervals(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(i => i.id)) + 1 : 1;
      return [...prev, { id: nextId, start: '09:00', end: '17:00' }];
    });
  };

  const handleRemoveInterval = (id) => {
    setIntervals(prev => prev.filter(i => i.id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate intervals
    for (const val of intervals) {
      if (!val.start || !val.end) {
        showToast('Please fill in all time slots', 'error');
        return;
      }
      if (val.start >= val.end) {
        showToast(`Start time must be before end time: ${val.start} - ${val.end}`, 'error');
        return;
      }
    }

    const peakHoursArray = intervals.map(i => `${i.start}-${i.end}`);
    const peakHoursJSON = JSON.stringify(peakHoursArray);

    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        available_hours: parseFloat(availableHours),
        peak_hours: peakHoursJSON,
      });
      setProfile(updated);
      showToast('Profile updated successfully.');
      
      // Update local storage user name
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      authUser.name = updated.name;
      localStorage.setItem('authUser', JSON.stringify(authUser));

      if (onProfileUpdate) {
        onProfileUpdate(updated);
      }
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <span>Syncing profile settings...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>Profile & Settings</h1>
        <p className="page-subtitle">Personalize your productivity and deadline profile</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2.5rem',
        alignItems: 'start',
      }}>
        {/* DNA Overview Card */}
        {profile && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-accent)' }}>Your Analytical DNA</h3>
            <DNABadge 
              dnaType={profile.dna_type} 
              tip={
                profile.dna_type === 'last_minute' 
                  ? 'You tend to work near deadlines. We recommend decomposing tasks early to allow Rescue Mode to function.'
                  : profile.dna_type === 'overcommitter'
                  ? 'You take on a lot. Try settings a tighter available hours limit and dropping non-essential subtasks.'
                  : 'You work steadily. Maintain this structure to optimize priority scores.'
              } 
            />
          </div>
        )}

        {/* Settings Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            Settings
          </h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="profile-email">Email Address (Read-only)</label>
              <input
                id="profile-email"
                type="email"
                className="input"
                value={profile?.email || 'N/A'}
                readOnly
                style={{ color: 'var(--text-muted)', borderBottomColor: 'var(--border-subtle)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div style={{ maxWidth: '200px' }}>
                <label htmlFor="profile-hours">Daily Available Hours</label>
                <input
                  id="profile-hours"
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  className="input"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 6.0)}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label>Peak Focused Hours (Time Blocks)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {intervals.map((interval) => (
                    <div 
                      key={interval.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        padding: '0.625rem 1rem', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        width: 'fit-content',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</span>
                        <input
                          type="time"
                          className="input"
                          style={{ borderBottom: 'none', padding: 0, width: '90px', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          value={interval.start}
                          onChange={(e) => handleIntervalChange(interval.id, 'start', e.target.value)}
                          required
                          disabled={saving}
                        />
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To</span>
                        <input
                          type="time"
                          className="input"
                          style={{ borderBottom: 'none', padding: 0, width: '90px', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          value={interval.end}
                          onChange={(e) => handleIntervalChange(interval.id, 'end', e.target.value)}
                          required
                          disabled={saving}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ height: '28px', width: '28px', color: 'var(--accent-red)', padding: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveInterval(interval.id)}
                        disabled={saving}
                        title="Remove time block"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {intervals.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No peak hours configured. Add one below!
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ 
                      width: 'fit-content', 
                      fontSize: '0.75rem', 
                      padding: '0.5rem 1rem', 
                      marginTop: '0.25rem',
                      borderColor: 'var(--border-accent)',
                      color: 'var(--accent-gold)'
                    }}
                    onClick={handleAddInterval}
                    disabled={saving}
                  >
                    Add Peak Interval
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'fit-content', justifySelf: 'end', minWidth: '150px' }}
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Saving...</>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Profile Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
