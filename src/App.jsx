import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import BottomNav from './components/BottomNav';
import InstallBanner from './components/InstallBanner';
import Home from './pages/Home';
import Clock from './pages/Clock';
import Schedule from './pages/Schedule';
import TimeOff from './pages/TimeOff';
import Profile from './pages/Profile';
import Team from './pages/Team';

function AppRoutes() {
  const { isAuthenticated, currentEmployee } = useAuth();
  const role = currentEmployee?.role;
  const isManager = role === 'admin' || role === 'manager';

  if (!isAuthenticated) return <Login />;

  return (
    <div style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clock" element={<Clock />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/time-off" element={<TimeOff />} />
        <Route path="/profile" element={<Profile />} />
        {isManager && <Route path="/team" element={<Team />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        {/* InstallBanner lives outside auth so it shows on the login screen too */}
        <InstallBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
