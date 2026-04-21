import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable } from '../utils/localStorage';
import MobileHeader from '../components/MobileHeader';

function fmt(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const { currentEmployee, currentTenant, companyName, logout } = useAuth();
  const [todayHours, setTodayHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [nextShift, setNextShift] = useState(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const entries = getTable('worktrack_time_entries').filter(e =>
      e.employeeId === currentEmployee?.id && e.tenantId === currentTenant?.id
    );

    const todayEntries = entries.filter(e => new Date(e.clockIn).toDateString() === today);
    const activeEntry = todayEntries.find(e => !e.clockOut);
    setIsClockedIn(!!activeEntry);
    setClockInTime(activeEntry?.clockIn || null);

    let todayMs = todayEntries.reduce((acc, e) => {
      const end = e.clockOut ? new Date(e.clockOut) : new Date();
      return acc + (end - new Date(e.clockIn));
    }, 0);
    setTodayHours(todayMs);

    const weekEntries = entries.filter(e => new Date(e.clockIn) >= weekStart);
    let weekMs = weekEntries.reduce((acc, e) => {
      const end = e.clockOut ? new Date(e.clockOut) : new Date();
      return acc + (end - new Date(e.clockIn));
    }, 0);
    setWeekHours(weekMs);

    // Next shift
    const now = new Date();
    const shifts = getTable('worktrack_schedules').filter(s =>
      s.employeeId === currentEmployee?.id &&
      s.tenantId === currentTenant?.id &&
      new Date(s.startTime) > now
    ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    setNextShift(shifts[0] || null);
  }, [currentEmployee, currentTenant]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={styles.page}>
      <MobileHeader />

      <div style={styles.content}>
        <div style={styles.greetCard}>
          <div style={styles.greet}>{greeting()},</div>
          <div style={styles.name}>{currentEmployee?.name || 'there'} 👋</div>
          <div style={styles.role}>{currentEmployee?.role} · {companyName}</div>
        </div>

        {/* Status banner */}
        <div style={{ ...styles.statusBanner, background: isClockedIn ? '#f0fdf4' : '#fff3e0' }}>
          <div style={{ fontSize: 20 }}>{isClockedIn ? '🟢' : '⚪'}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isClockedIn ? '#16a34a' : '#92400e' }}>
              {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
            </div>
            {isClockedIn && clockInTime && (
              <div style={{ fontSize: 13, color: '#666' }}>Since {fmtTime(clockInTime)}</div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statVal}>{fmt(todayHours)}</div>
            <div style={styles.statLabel}>Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statVal}>{fmt(weekHours)}</div>
            <div style={styles.statLabel}>This Week</div>
          </div>
        </div>

        {/* Next shift */}
        {nextShift && (
          <div style={styles.shiftCard}>
            <div style={styles.shiftLabel}>Next Shift</div>
            <div style={styles.shiftTime}>
              {new Date(nextShift.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {fmtTime(nextShift.startTime)} – {fmtTime(nextShift.endTime)}
            </div>
          </div>
        )}

        <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc', paddingBottom: 80 },
  content: { padding: '20px' },
  greetCard: {
    background: '#1a1a2e', borderRadius: 20, padding: '24px',
    marginBottom: 16, color: '#fff',
  },
  greet: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  name: { fontSize: 24, fontWeight: 800, marginTop: 2 },
  role: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'capitalize' },
  statusBanner: {
    borderRadius: 14, padding: '16px', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  statCard: {
    background: '#fff', borderRadius: 16, padding: '20px',
    textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  statVal: { fontSize: 26, fontWeight: 800, color: '#1a1a2e' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftCard: {
    background: '#fff', borderRadius: 14, padding: '16px 20px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 16,
  },
  shiftLabel: { fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  shiftTime: { fontSize: 16, fontWeight: 600, color: '#1a1a2e' },
  logoutBtn: {
    width: '100%', padding: '14px', background: 'transparent',
    border: '1.5px solid #e5e7eb', borderRadius: 12,
    fontSize: 15, fontWeight: 600, color: '#888', cursor: 'pointer',
    marginTop: 8,
  },
};
