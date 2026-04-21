import { useAuth } from '../contexts/AuthContext';
import MobileHeader from '../components/MobileHeader';

export default function Profile() {
  const { currentEmployee, currentTenant, companyName, companyCode, logout } = useAuth();

  const fields = [
    { label: 'Name', value: currentEmployee?.name },
    { label: 'Role', value: currentEmployee?.role ? currentEmployee.role.charAt(0).toUpperCase() + currentEmployee.role.slice(1) : '' },
    { label: 'Department', value: currentEmployee?.department || '—' },
    { label: 'Email', value: currentEmployee?.email || '—' },
    { label: 'Company', value: companyName || '—' },
    { label: 'Company Code', value: companyCode || '—' },
  ];

  return (
    <div style={styles.page}>
      <MobileHeader />
      <div style={styles.content}>
        <div style={styles.avatar}>
          {currentEmployee?.name ? currentEmployee.name[0].toUpperCase() : 'U'}
        </div>
        <div style={styles.empName}>{currentEmployee?.name || 'Employee'}</div>
        <div style={styles.empRole}>{currentEmployee?.role}</div>

        <div style={styles.card}>
          {fields.map(f => (
            <div key={f.label} style={styles.row}>
              <div style={styles.rowLabel}>{f.label}</div>
              <div style={styles.rowValue}>{f.value || '—'}</div>
            </div>
          ))}
        </div>

        <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc', paddingBottom: 80 },
  content: { padding: '24px 20px', textAlign: 'center' },
  avatar: {
    width: 80, height: 80, borderRadius: '50%', background: '#1a1a2e',
    color: '#fff', fontSize: 32, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  empName: { fontSize: 22, fontWeight: 800, color: '#1a1a2e' },
  empRole: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginBottom: 28 },
  card: {
    background: '#fff', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 24, textAlign: 'left',
  },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #f3f4f6',
  },
  rowLabel: { fontSize: 14, color: '#888', fontWeight: 500 },
  rowValue: { fontSize: 14, fontWeight: 600, color: '#1a1a2e', textAlign: 'right', maxWidth: '60%' },
  logoutBtn: {
    width: '100%', padding: '15px', background: '#fff',
    border: '1.5px solid #fca5a5', borderRadius: 12,
    fontSize: 15, fontWeight: 700, color: '#ef4444', cursor: 'pointer',
  },
};
