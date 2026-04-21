import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable, setTable, generateId } from '../utils/localStorage';
import { getCurrentPosition } from '../utils/geolocation';
import { isWithinGeofence } from '../utils/geofence';
import MobileHeader from '../components/MobileHeader';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Clock() {
  const { currentEmployee, currentTenant, companyCode } = useAuth();
  const [activeEntry, setActiveEntry] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('unknown'); // 'ok' | 'error' | 'unknown'
  const [gpsMsg, setGpsMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEntries, setTodayEntries] = useState([]);

  useEffect(() => {
    loadTodayEntries();
    checkActiveEntry();
  }, []);

  useEffect(() => {
    if (!activeEntry || onBreak) return;
    const start = new Date(activeEntry.clockIn).getTime();
    const tick = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(tick);
  }, [activeEntry, onBreak]);

  const loadTodayEntries = () => {
    const today = new Date().toDateString();
    const entries = getTable('worktrack_time_entries').filter(e =>
      e.employeeId === currentEmployee?.id &&
      e.tenantId === currentTenant?.id &&
      new Date(e.clockIn).toDateString() === today
    );
    setTodayEntries(entries);
    const active = entries.find(e => !e.clockOut);
    if (active) {
      setActiveEntry(active);
      setElapsed(Date.now() - new Date(active.clockIn).getTime());
      const lastBreak = (active.breaks || []).find(b => !b.end);
      if (lastBreak) setOnBreak(true);
    }
  };

  const checkActiveEntry = () => {
    const today = new Date().toDateString();
    const entries = getTable('worktrack_time_entries').filter(e =>
      e.employeeId === currentEmployee?.id &&
      e.tenantId === currentTenant?.id &&
      new Date(e.clockIn).toDateString() === today
    );
    const active = entries.find(e => !e.clockOut);
    setActiveEntry(active || null);
  };

  const getGps = async () => {
    try {
      const pos = await getCurrentPosition();
      // Check geofence if tenant has one configured
      const tenant = getTable('worktrack_tenants').find(t => t.id === currentTenant?.id);
      if (tenant?.geofence?.lat) {
        const within = isWithinGeofence(pos, tenant.geofence);
        if (!within) {
          setGpsStatus('error');
          setGpsMsg('Outside work area');
          return null;
        }
      }
      setGpsStatus('ok');
      setGpsMsg('Location verified');
      return pos;
    } catch (e) {
      setGpsStatus('error');
      setGpsMsg('Location unavailable');
      return null;
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    const pos = await getGps();

    const entry = {
      id: generateId('te'),
      employeeId: currentEmployee.id,
      tenantId: currentTenant.id,
      clockIn: new Date().toISOString(),
      clockOut: null,
      breaks: [],
      lat: pos?.latitude,
      lng: pos?.longitude,
    };

    const entries = getTable('worktrack_time_entries');
    entries.push(entry);
    setTable('worktrack_time_entries', entries);
    setActiveEntry(entry);
    setElapsed(0);
    loadTodayEntries();
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setLoading(true);
    await getGps();

    const entries = getTable('worktrack_time_entries');
    const idx = entries.findIndex(e => e.id === activeEntry.id);
    if (idx !== -1) {
      entries[idx].clockOut = new Date().toISOString();
      if (onBreak) {
        const breaks = entries[idx].breaks || [];
        const openBreak = breaks.findIndex(b => !b.end);
        if (openBreak !== -1) breaks[openBreak].end = new Date().toISOString();
        entries[idx].breaks = breaks;
      }
      setTable('worktrack_time_entries', entries);
    }

    setActiveEntry(null);
    setOnBreak(false);
    setElapsed(0);
    loadTodayEntries();
    setLoading(false);
  };

  const handleBreak = () => {
    if (!activeEntry) return;
    const entries = getTable('worktrack_time_entries');
    const idx = entries.findIndex(e => e.id === activeEntry.id);
    if (idx === -1) return;

    const breaks = entries[idx].breaks || [];
    if (!onBreak) {
      breaks.push({ id: generateId('brk'), start: new Date().toISOString(), end: null });
      setOnBreak(true);
    } else {
      const openBreak = breaks.findIndex(b => !b.end);
      if (openBreak !== -1) breaks[openBreak].end = new Date().toISOString();
      setOnBreak(false);
    }
    entries[idx].breaks = breaks;
    setTable('worktrack_time_entries', entries);
    loadTodayEntries();
  };

  const isClockedIn = !!activeEntry;

  return (
    <div style={styles.page}>
      <MobileHeader title="Clock" />

      <div style={styles.content}>
        {/* GPS status */}
        <div style={{ ...styles.gpsBar, background: gpsStatus === 'ok' ? '#f0fdf4' : gpsStatus === 'error' ? '#fef2f2' : '#f7f8fc' }}>
          <span style={{ fontSize: 12, color: gpsStatus === 'ok' ? '#16a34a' : gpsStatus === 'error' ? '#dc2626' : '#888' }}>
            {gpsStatus === 'ok' ? '📍 ' : gpsStatus === 'error' ? '⚠️ ' : '📍 '}
            {gpsMsg || 'Location will be checked on clock in/out'}
          </span>
        </div>

        {/* Timer */}
        <div style={styles.timerCard}>
          <div style={styles.status}>
            {isClockedIn ? (onBreak ? '☕ On Break' : '🟢 Clocked In') : '⚪ Not Clocked In'}
          </div>
          <div style={styles.timer}>{isClockedIn ? fmt(elapsed) : '00:00:00'}</div>
          {isClockedIn && activeEntry && (
            <div style={styles.since}>Since {fmtTime(activeEntry.clockIn)}</div>
          )}
        </div>

        {/* Main clock button */}
        <button
          style={{
            ...styles.clockBtn,
            background: isClockedIn ? '#ef4444' : '#22c55e',
          }}
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
        >
          {loading ? '…' : isClockedIn ? 'Clock Out' : 'Clock In'}
        </button>

        {/* Break button */}
        {isClockedIn && (
          <button style={{ ...styles.breakBtn, ...(onBreak ? styles.breakBtnActive : {}) }} onClick={handleBreak}>
            {onBreak ? 'End Break' : 'Start Break'}
          </button>
        )}

        {/* Today's entries */}
        {todayEntries.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Today's Entries</div>
            {todayEntries.filter(e => e.clockOut).map(e => {
              const dur = new Date(e.clockOut) - new Date(e.clockIn);
              return (
                <div key={e.id} style={styles.entryCard}>
                  <div style={styles.entryTimes}>
                    <span>{fmtTime(e.clockIn)}</span>
                    <span style={styles.entryArrow}>→</span>
                    <span>{fmtTime(e.clockOut)}</span>
                  </div>
                  <div style={styles.entryDur}>{fmt(dur)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc', paddingBottom: 80 },
  content: { padding: '16px 20px' },
  gpsBar: { borderRadius: 10, padding: '10px 14px', marginBottom: 16 },
  timerCard: {
    background: '#fff', borderRadius: 20, padding: '32px 24px',
    textAlign: 'center', marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  status: { fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 8 },
  timer: { fontSize: 52, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' },
  since: { fontSize: 13, color: '#999', marginTop: 6 },
  clockBtn: {
    width: '100%', height: 80, borderRadius: 20, border: 'none',
    fontSize: 22, fontWeight: 800, color: '#fff', cursor: 'pointer',
    marginBottom: 12, letterSpacing: '-0.5px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  breakBtn: {
    width: '100%', height: 52, borderRadius: 14, border: '2px solid #e5e7eb',
    fontSize: 16, fontWeight: 600, color: '#555', cursor: 'pointer',
    background: '#fff', marginBottom: 24,
  },
  breakBtnActive: { border: '2px solid #f5a623', color: '#f5a623' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  entryCard: {
    background: '#fff', borderRadius: 12, padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  entryTimes: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#333' },
  entryArrow: { color: '#ccc', fontWeight: 400 },
  entryDur: { fontSize: 14, color: '#888', fontWeight: 500 },
};
