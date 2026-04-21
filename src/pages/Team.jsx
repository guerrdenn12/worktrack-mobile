import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable, setTable } from '../utils/localStorage';
import MobileHeader from '../components/MobileHeader';

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Team() {
  const { getAllEmployees, currentTenant } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [tab, setTab] = useState('live'); // 'live' | 'pto'

  useEffect(() => {
    const emps = getAllEmployees().filter(e => e.isActive);
    const today = new Date().toDateString();
    const entries = getTable('worktrack_time_entries').filter(e =>
      e.tenantId === currentTenant?.id &&
      new Date(e.clockIn).toDateString() === today
    );

    const enriched = emps.map(emp => {
      const active = entries.find(e => e.employeeId === emp.id && !e.clockOut);
      return { ...emp, isClockedIn: !!active, clockInTime: active?.clockIn || null };
    });

    enriched.sort((a, b) => {
      if (a.isClockedIn && !b.isClockedIn) return -1;
      if (!a.isClockedIn && b.isClockedIn) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    setEmployees(enriched);

    const pending = getTable('worktrack_time_off').filter(r =>
      r.tenantId === currentTenant?.id && r.status === 'pending'
    );
    setTimeOffRequests(pending);
  }, []);

  const approveTimeOff = (id, approved) => {
    const all = getTable('worktrack_time_off');
    const idx = all.findIndex(r => r.id === id);
    if (idx !== -1) {
      all[idx].status = approved ? 'approved' : 'denied';
      setTable('worktrack_time_off', all);
      setTimeOffRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div style={styles.page}>
      <MobileHeader />
      <div style={styles.content}>
        <div style={styles.pageTitle}>Team</div>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'live' ? styles.tabActive : {}) }} onClick={() => setTab('live')}>
            Live ({employees.filter(e => e.isClockedIn).length} in)
          </button>
          <button style={{ ...styles.tab, ...(tab === 'pto' ? styles.tabActive : {}) }} onClick={() => setTab('pto')}>
            Time Off {timeOffRequests.length > 0 && <span style={styles.badge}>{timeOffRequests.length}</span>}
          </button>
        </div>

        {tab === 'live' && (
          <>
            {employees.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                <div style={{ fontSize: 14, color: '#888' }}>No active employees</div>
              </div>
            ) : (
              employees.map(emp => (
                <div key={emp.id} style={styles.empCard}>
                  <div style={styles.empAvatar}>
                    {(emp.name || 'U')[0].toUpperCase()}
                  </div>
                  <div style={styles.empInfo}>
                    <div style={styles.empName}>{emp.name}</div>
                    <div style={styles.empRole}>{emp.role} {emp.department ? `· ${emp.department}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...styles.dot, background: emp.isClockedIn ? '#22c55e' : '#d1d5db' }} />
                    {emp.isClockedIn && (
                      <div style={styles.since}>in {fmtTime(emp.clockInTime)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'pto' && (
          <>
            {timeOffRequests.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, color: '#888' }}>No pending time off requests</div>
              </div>
            ) : (
              timeOffRequests.map(r => {
                const emp = employees.find(e => e.id === r.employeeId);
                return (
                  <div key={r.id} style={styles.reqCard}>
                    <div style={styles.reqName}>{emp?.name || 'Employee'}</div>
                    <div style={styles.reqDetails}>{r.type} · {r.startDate} → {r.endDate}</div>
                    {r.reason && <div style={styles.reqReason}>{r.reason}</div>}
                    <div style={styles.reqBtns}>
                      <button style={styles.denyBtn} onClick={() => approveTimeOff(r.id, false)}>Deny</button>
                      <button style={styles.approveBtn} onClick={() => approveTimeOff(r.id, true)}>Approve</button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc', paddingBottom: 80 },
  content: { padding: '20px' },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 16 },
  tabs: { display: 'flex', background: '#fff', borderRadius: 12, padding: 4, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tab: { flex: 1, padding: '10px 0', border: 'none', background: 'transparent', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActive: { background: '#1a1a2e', color: '#fff' },
  badge: { background: '#f5a623', color: '#fff', borderRadius: 20, fontSize: 11, padding: '1px 7px', fontWeight: 800 },
  empty: { textAlign: 'center', padding: '48px 0' },
  empCard: { background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 5px rgba(0,0,0,0.05)' },
  empAvatar: { width: 42, height: 42, borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0 },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  empRole: { fontSize: 12, color: '#888', textTransform: 'capitalize', marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: '50%', marginLeft: 'auto' },
  since: { fontSize: 11, color: '#888', marginTop: 4 },
  reqCard: { background: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 5px rgba(0,0,0,0.05)' },
  reqName: { fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  reqDetails: { fontSize: 13, color: '#555', marginBottom: 4 },
  reqReason: { fontSize: 12, color: '#999', marginBottom: 12 },
  reqBtns: { display: 'flex', gap: 10 },
  denyBtn: { flex: 1, padding: '10px', border: '1.5px solid #fca5a5', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, color: '#ef4444', cursor: 'pointer' },
  approveBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: '#22c55e', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' },
};
