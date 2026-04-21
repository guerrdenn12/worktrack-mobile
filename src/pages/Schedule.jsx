import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable } from '../utils/localStorage';
import MobileHeader from '../components/MobileHeader';

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Schedule() {
  const { currentEmployee, currentTenant } = useAuth();
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 14);

    const all = getTable('worktrack_schedules').filter(s =>
      s.employeeId === currentEmployee?.id &&
      s.tenantId === currentTenant?.id &&
      new Date(s.startTime) >= weekStart &&
      new Date(s.startTime) <= weekEnd
    ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    setShifts(all);
  }, [currentEmployee, currentTenant]);

  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

  return (
    <div style={styles.page}>
      <MobileHeader />
      <div style={styles.content}>
        <div style={styles.pageTitle}>My Schedule</div>

        {shifts.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, color: '#888' }}>No upcoming shifts scheduled</div>
          </div>
        ) : (
          shifts.map(shift => (
            <div key={shift.id} style={{ ...styles.shiftCard, ...(isToday(shift.startTime) ? styles.todayCard : {}) }}>
              {isToday(shift.startTime) && <div style={styles.todayBadge}>TODAY</div>}
              <div style={styles.shiftDate}>{fmtDate(shift.startTime)}</div>
              <div style={styles.shiftTime}>
                {fmtTime(shift.startTime)} – {fmtTime(shift.endTime)}
              </div>
              {shift.position && <div style={styles.shiftPos}>{shift.position}</div>}
              {shift.department && <div style={styles.shiftDept}>{shift.department}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc', paddingBottom: 80 },
  content: { padding: '20px' },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 20 },
  empty: { textAlign: 'center', padding: '60px 0' },
  shiftCard: {
    background: '#fff', borderRadius: 16, padding: '18px 20px',
    marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', position: 'relative',
  },
  todayCard: { border: '2px solid #f5a623' },
  todayBadge: {
    position: 'absolute', top: -10, right: 16,
    background: '#f5a623', color: '#fff', fontSize: 10,
    fontWeight: 800, padding: '2px 10px', borderRadius: 20, letterSpacing: 1,
  },
  shiftDate: { fontSize: 13, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  shiftTime: { fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 },
  shiftPos: { fontSize: 13, color: '#555', fontWeight: 600 },
  shiftDept: { fontSize: 12, color: '#aaa', marginTop: 2 },
};
