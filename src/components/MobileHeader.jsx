import { useAuth } from '../contexts/AuthContext';

export default function MobileHeader({ title }) {
  const { companyName, currentEmployee } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.appName}>WorkTrack</div>
        {companyName && <div style={styles.company}>{companyName}</div>}
      </div>
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
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
  },
  left: { display: 'flex', flexDirection: 'column' },
  appName: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' },
  company: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  right: {},
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#f5a623', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 700,
  },
};
