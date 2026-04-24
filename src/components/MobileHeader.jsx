import { useAuth } from '../contexts/AuthContext';

export default function MobileHeader({ title }) {
  const { companyName, currentEmployee } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logoIcon}>📋</div>
        <div style={styles.logoText}>
          <div style={styles.appName}>Work<span style={{color:'#f5a623'}}>Track</span></div>
          {companyName && <div style={styles.company}>{companyName}</div>}
        </div>
      </div>
      {title && <div style={styles.title}>{title}</div>}
      <div style={styles.right}>
        <div style={styles.avatar}>
          {currentEmployee?.name ? currentEmployee.name[0].toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    background: '#fff', color: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    borderBottom: '1px solid #f0f0f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  left: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: 'linear-gradient(135deg, #f5a623, #e8951a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  },
  logoText: { display: 'flex', flexDirection: 'column' },
  appName: { fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px', color: '#1a1a2e', lineHeight: 1.1 },
  company: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a2e', flex: 1, textAlign: 'center' },
  right: {},
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: '#f5a623', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700,
  },
};
