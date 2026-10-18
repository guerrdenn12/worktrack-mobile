import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable, setTable, generateId } from '../utils/localStorage';
import { getCurrentPosition } from '../utils/geolocation';
import { hasPendingSync } from '../utils/api';
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
  const { currentEmployee, currentTenant } = useAuth();
  const [activeEntry, setActiveEntry] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('unknown'); // 'ok' | 'warn' | 'error' | 'unknown'
  const [gpsMsg, setGpsMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEntries, setTodayEntries] = useState([]);
  const [pending, setPending] = useState(hasPendingSync());
  const [choosingBreak, setChoosingBreak] = useState(false);

  useEffect(() => {
    loadTodayEntries();
    const update = () => setPending(hasPendingSync());
    window.addEventListener('worktrack-sync', update);
    const t = setInterval(update, 5000);
    return () => { window.removeEventListener('worktrack-sync', update); clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!activeEntry || onBreak) return;
    const start = new Date(activeEntry.clockIn).getTime();
    const tick = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(tick);
  }, [activeEntry, onBreak]);

  // Breaks are stored in their own table (same format as the manager app) so
  // timesheets and payroll can deduct them.
  const openBreakFor = (entryId) =>
    getTable('worktrack_breaks').find(b => b.timeEntryId === entryId && !b.breakEnd) ||
    null;

  const loadTodayEntries = () => {
    const today = new Date().toDateString();
    const entries = getTable('worktrack_time_entries').filter(e =>
      e.employeeId === currentEmployee?.id &&
      e.tenantId === currentTenant?.id &&
      new Date(e.clockIn).toDateString() === today
    );
    setTodayEntries(entries);
    const active = entries.find(e => !e.clockOut);
    setActiveEntry(active || null);
    if (active) {
      setElapsed(Date.now() - new Date(active.clockIn).getTime());
      setOnBreak(!!openBreakFor(active.id) || (active.breaks || []).some(b => !b.end));
    } else {
      setOnBreak(false);
    }
  };

  // The work location the manager assigned to this employee (Settings → Locations).
  const myLocation = () =>
    getTable('worktrack_locations').find(l =>
      l.tenantId === currentTenant?.id && (l.assignedEmployees || []).includes(currentEmployee?.id)
    ) || null;

  // Capture GPS and check it against the assigned location. Never blocks
  // clocking in or out — an off-site punch is recorded and flagged for the manager.
  const captureLocation = async () => {
    const pos = await getCurrentPosition();
    const loc = myLocation();
    let within = null;
    if (pos && loc && loc.latitude != null && loc.longitude != null) {
      within = isWithinGeofence(pos.latitude, pos.longitude, loc.latitude, loc.longitude, loc.radiusMeters || 150);
    }
    if (!pos) { setGpsStatus('error'); setGpsMsg('Location unavailable — your manager will see this punch without GPS'); }
    else if (within === false) { setGpsStatus('warn'); setGpsMsg('Outside your work area — your manager will see this punch as off-site'); }
    else { setGpsStatus('ok'); setGpsMsg(within ? 'At your work location' : 'Location recorded'); }
    return { pos, loc, within };
  };

  const handleClockIn = async () => {
    if (activeEntry) return;
    setLoading(true);
    const { pos, loc, within } = await captureLocation();

    const entry = {
      id: generateId('time'),
      employeeId: currentEmployee.id,
      tenantId: currentTenant.id,
      clockIn: new Date().toISOString(),
      clockOut: null,
      projectId: null,
      taskDescription: null,
      isBillable: false,
      billingRate: 0,
      billingAmount: 0,
      isInvoiced: false,
      invoiceId: null,
      clockInLat: pos?.latitude ?? null,
      clockInLng: pos?.longitude ?? null,
      clockInWithinGeofence: within,
      clockOutLat: null,
      clockOutLng: null,
      clockOutWithinGeofence: null,
      locationId: loc?.id || null,
      source: 'mobile',
    };

    const entries = getTable('worktrack_time_entries');
    entries.push(entry);
    setTable('worktrack_time_entries', entries);
    setElapsed(0);
    loadTodayEntries();
    setLoading(false);
  };

  const endOpenBreak = (entryId, when) => {
    const breaks = getTable('worktrack_breaks');
    const idx = breaks.findIndex(b => b.timeEntryId === entryId && !b.breakEnd);
    if (idx !== -1) {
      breaks[idx] = { ...breaks[idx], breakEnd: when };
      setTable('worktrack_breaks', breaks);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setLoading(true);
    const { pos, within } = await captureLocation();
    const now = new Date().toISOString();
    endOpenBreak(activeEntry.id, now);

    const entries = getTable('worktrack_time_entries');
    const idx = entries.findIndex(e => e.id === activeEntry.id);
    if (idx !== -1) {
      entries[idx] = {
        ...entries[idx],
        clockOut: now,
        clockOutLat: pos?.latitude ?? null,
        clockOutLng: pos?.longitude ?? null,
        clockOutWithinGeofence: within,
      };
      setTable('worktrack_time_entries', entries);
    }

    setElapsed(0);
    loadTodayEntries();
    setLoading(false);
  };

  // Same break types as the manager app; unpaid and meal breaks are deducted
  // from paid hours on timesheets and payroll.
  const BREAK_TYPES = [
    { value: 'paid', label: 'Paid break' },
    { value: 'unpaid', label: 'Unpaid break' },
    { value: 'meal', label: 'Meal break' },
  ];

  const handleBreak = (breakType) => {
    if (!activeEntry) return;
    const now = new Date().toISOString();
    if (!onBreak) {
      if (!breakType) { setChoosingBreak(true); return; }
      setChoosingBreak(false);
      const breaks = getTable('worktrack_breaks');
      breaks.push({
        id: generateId('brk'),
        timeEntryId: activeEntry.id,
        tenantId: currentTenant.id,
        employeeId: currentEmployee.id,
        breakStart: now,
        breakEnd: null,
        breakType,
      });
      setTable('worktrack_breaks', breaks);
      setOnBreak(true);
    } else {
      endOpenBreak(activeEntry.id, now);
      setOnBreak(false);
    }
  };

  const isClockedIn = !!activeEntry;

  return (
    <div style={styles.page}>
      <MobileHeader title="Clock" />

      <div style={styles.content}>
        {/* GPS status */}
        {pending && (
          <div style={{ ...styles.gpsBar, background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <span style={{ fontSize: 12, color: '#9a3412' }}>
              ⏳ Saved on this phone — will send to your manager automatically when you're back online.
            </span>
          </div>
        )}
        <div style={{ ...styles.gpsBar, background: gpsStatus === 'ok' ? '#f0fdf4' : gpsStatus === 'error' ? '#fef2f2' : gpsStatus === 'warn' ? '#fffbeb' : '#f7f8fc' }}>
          <span style={{ fontSize: 12, color: gpsStatus === 'ok' ? '#16a34a' : gpsStatus === 'error' ? '#dc2626' : gpsStatus === 'warn' ? '#b45309' : '#888' }}>
            {gpsStatus === 'ok' ? '📍 ' : gpsStatus === 'error' || gpsStatus === 'warn' ? '⚠️ ' : '📍 '}
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
        {isClockedIn && !choosingBreak && (
          <button style={{ ...styles.breakBtn, ...(onBreak ? styles.breakBtnActive : {}) }} onClick={() => handleBreak()}>
            {onBreak ? 'End Break' : 'Start Break'}
          </button>
        )}
        {isClockedIn && choosingBreak && !onBreak && (
          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
            {BREAK_TYPES.map(t => (
              <button key={t.value} style={styles.breakBtn} onClick={() => handleBreak(t.value)}>{t.label}</button>
            ))}
            <button style={{ ...styles.breakBtn, background: 'transparent', border: 'none', color: '#888' }} onClick={() => setChoosingBreak(false)}>Cancel</button>
          </div>
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
