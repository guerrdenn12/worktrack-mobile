import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTable, setTable, generateId } from '../utils/localStorage';
import MobileHeader from '../components/MobileHeader';

const TYPES = ['Vacation', 'Sick', 'Personal', 'Other'];

export default function TimeOff() {
  const { currentEmployee, currentTenant } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('Vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = () => {
    const all = getTable('worktrack_time_off').filter(r =>
      r.employeeId === currentEmployee?.id && r.tenantId === currentTenant?.id
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRequests(all);
  };

  const handleSubmit = () => {
    if (!startDate) return setError('Select a start date');
    if (!endDate) return setError('Select an end date');
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be after start date');

    const req = {
      id: generateId('pto'),
      employeeId: currentEmployee.id,
      tenantId: currentTenant.id,
      type, startDate, endDate, reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const all = getTable('worktrack_time_off');
    all.push(req);
    setTable('worktrack_time_off', all);
    setShowForm(false);
    setStartDate(''); setEndDate(''); setReason(''); setError('');
    loadRequests();
  };

  const statusColor = { pending: '#f5a623', approved: '#22c55e', denied: '#ef4444' };

  return (
    <div style={styles.page}>
      <MobileHeader />
      <div style={styles.content}>
        <div style={styles.titleRow}>
          <div style={styles.pageTitle}>Time Off</div>
          {!showForm && (
            <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ Request</button>
          )}
        </div>

        {showForm && (
          <div style={styles.form}>
            <div style={styles.formTitle}>New Request</div>
            <div style={styles.typeRow}>
              {TYPES.map(t => (
                <button key={t} style={{ ...styles.typeBtn, ...(type === t ? styles.typeBtnActive : {}) }} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
            <label style={styles.label}>Start Date</label>
            <input style={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <label style={styles.label}>End Date</label>
            <input style={styles.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <label style={styles.label}>Reason (optional)</label>
            <textarea style={{ ...styles.input, height: 80, resize: 'none' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Brief description…" />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.formBtns}>
              <button style={styles.cancelBtn} onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
              <button style={styles.submitBtn} onClick={handleSubmit}>Submit</button>
            </div>
          </div>
        )}

        {requests.length === 0 && !showForm ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏖️</div>
            <div style={{ fontSize: 15, color: '#888' }}>No time off requests yet</div>
          </div>
        ) : (
          requests.map(r => (
            <div key={r.id} style={styles.reqCard}>
              <div style={styles.reqHeader}>
                <div style={styles.reqType}>{r.type}</div>
                <div style={{ ...styles.reqStatus, color: statusColor[r.status] || '#888' }}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </div>
              </div>
              <div style={styles.reqDates}>{r.startDate} → {r.endDate}</div>
              {r.reason && <div style={styles.reqReason}>{r.reason}</div>}
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
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#1a1a2e' },
  addBtn: { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  form: { background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  formTitle: { fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  typeRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { padding: '8px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, color: '#666', cursor: 'pointer' },
  typeBtnActive: { background: '#1a1a2e', color: '#fff', border: '1.5px solid #1a1a2e' },
  label: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, marginBottom: 14, boxSizing: 'border-box', background: '#fafafa', outline: 'none' },
  error: { color: '#e53e3e', fontSize: 13, margin: '-8px 0 8px' },
  formBtns: { display: 'flex', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: '13px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 15, fontWeight: 600, color: '#666', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '13px', border: 'none', borderRadius: 10, background: '#f5a623', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '60px 0' },
  reqCard: { background: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 5px rgba(0,0,0,0.05)' },
  reqHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reqType: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  reqStatus: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  reqDates: { fontSize: 14, color: '#555' },
  reqReason: { fontSize: 13, color: '#999', marginTop: 4 },
};
