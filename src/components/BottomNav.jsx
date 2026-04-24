import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Clock, Calendar, Umbrella, Users, User } from 'lucide-react';

export default function BottomNav() {
  const { currentEmployee } = useAuth();
  const role = currentEmployee?.role;
  const isManager = role === 'admin' || role === 'manager';

  const tabs = [
    { to: '/', icon: Home, label: 'Home', exact: true },
    { to: '/clock', icon: Clock, label: 'Clock' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/time-off', icon: Umbrella, label: 'Time Off' },
    ...(isManager ? [{ to: '/team', icon: Users, label: 'Team' }] : []),
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav style={styles.nav}>
      {tabs.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          style={({ isActive }) => ({ ...styles.tab, ...(isActive ? styles.tabActive : {}) })}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={styles.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
    background: '#fff', borderTop: '1px solid #f0f0f0',
    display: 'flex', alignItems: 'stretch',
    paddingBottom: 'env(safe-area-inset-bottom)',
    boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '8px 0', gap: 3,
    color: '#aaa', textDecoration: 'none', minHeight: 60,
    fontSize: 10, fontWeight: 500,
  },
  tabActive: { color: '#f5a623' },
  label: { fontSize: 10, fontWeight: 600 },
};
