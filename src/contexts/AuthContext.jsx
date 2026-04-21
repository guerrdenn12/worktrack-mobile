import { createContext, useContext, useState, useEffect } from 'react';
import { getTable, setTable, generateId } from '../utils/localStorage';
import { serverLogin, pullFromServer, pushToServer, clearSessionToken } from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companyCode, setCompanyCode] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [authMode, setAuthMode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authSubscription = null;

    const initAuth = async () => {
      const savedSession = localStorage.getItem('worktrack_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setCurrentTenant(session.tenant);
          setCurrentEmployee(session.employee);
          setCompanyCode(session.companyCode);
          setCompanyName(session.company || session.tenant?.name || '');
          setAuthMode(session.authMode || 'pin');
          setIsAuthenticated(true);
          pullFromServer(session.companyCode);
        } catch (e) {
          localStorage.removeItem('worktrack_session');
        }
      }

      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && !savedSession) await handleSupabaseUser(user);
        } catch (e) {}

        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await handleSupabaseUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            const mode = localStorage.getItem('worktrack_auth_mode');
            if (mode === 'email' || mode === 'sso') clearAuthState();
          }
        });
        authSubscription = data?.subscription;
      }

      setLoading(false);
    };

    initAuth();
    return () => { if (authSubscription) authSubscription.unsubscribe(); };
  }, []);

  const handleSupabaseUser = async (user) => {
    let employees = getTable('worktrack_employees');
    let employee = employees.find(e => e.authUserId === user.id || e.email === user.email);

    if (!employee) {
      const savedSession = localStorage.getItem('worktrack_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const se = employees.find(e => e.id === session.employee?.id && e.tenantId === session.tenant?.id);
          if (se && (se.role === 'admin' || se.role === 'manager') && (!se.email || !se.email.trim())) {
            se.email = user.email;
            se.authUserId = user.id;
            se.name = user.user_metadata?.full_name || se.name;
            se.updatedAt = new Date().toISOString();
            setTable('worktrack_employees', employees);
            employee = se;
            if (session.companyCode) pushToServer(session.companyCode);
          }
        } catch (e) {}
      }
    }

    if (employee) {
      const tenants = getTable('worktrack_tenants');
      const tenant = tenants.find(t => t.id === employee.tenantId);
      const code = tenant?.companyCode || localStorage.getItem('worktrack_last_company') || '';

      setCurrentTenant(tenant || { id: employee.tenantId });
      setCurrentEmployee(employee);
      setCompanyCode(code);
      setCompanyName(tenant?.name || '');
      setAuthMode('sso');
      setIsAuthenticated(true);

      localStorage.setItem('worktrack_session', JSON.stringify({
        tenant: tenant || { id: employee.tenantId },
        employee, companyCode: code,
        company: tenant?.name || '', authMode: 'sso'
      }));
      localStorage.setItem('worktrack_auth_mode', 'sso');
      if (code) pullFromServer(code);
    }
  };

  const login = async (companyCodeInput, pin) => {
    const result = await serverLogin(companyCodeInput, pin);
    if (result.ok) {
      await pullFromServer(result.companyCode);
      setCurrentTenant(result.tenant);
      setCurrentEmployee(result.employee);
      setCompanyCode(result.companyCode);
      setCompanyName(result.company);
      setAuthMode('pin');
      setIsAuthenticated(true);

      localStorage.setItem('worktrack_session', JSON.stringify({
        tenant: result.tenant, employee: result.employee,
        companyCode: result.companyCode, company: result.company, authMode: 'pin'
      }));
      localStorage.setItem('worktrack_auth_mode', 'pin');
      return { ok: true };
    }
    return { ok: false, error: result.error || 'Login failed' };
  };

  const loginWithEmail = async (email, password) => {
    if (!supabase) return { ok: false, error: 'Auth service not available' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Could not verify user' };
      await handleSupabaseUser(user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed' };
    }
  };

  const loginWithGoogle = async () => {
    if (!supabase) return { ok: false, error: 'Auth service not available' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: window.location.origin }
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Google sign-in failed' };
    }
  };

  const clearAuthState = () => {
    setCurrentTenant(null);
    setCurrentEmployee(null);
    setCompanyCode(null);
    setCompanyName('');
    setAuthMode(null);
    setIsAuthenticated(false);
    localStorage.removeItem('worktrack_session');
    localStorage.removeItem('worktrack_auth_mode');
    clearSessionToken();
  };

  const logout = async () => {
    if (companyCode) pushToServer(companyCode);
    if (supabase && (authMode === 'email' || authMode === 'sso')) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
    clearAuthState();
  };

  const getEmployees = () => {
    if (!currentTenant) return [];
    const employees = getTable('worktrack_employees').filter(e => e.tenantId === currentTenant.id);
    const role = currentEmployee?.role;
    const dept = currentEmployee?.department;
    if (role === 'admin') return employees;
    if (role === 'manager' || role === 'supervisor') {
      if (!dept) return employees;
      return employees.filter(e => e.department === dept || e.id === currentEmployee?.id);
    }
    return employees.filter(e => e.id === currentEmployee?.id);
  };

  const getAllEmployees = () => {
    if (!currentTenant) return [];
    return getTable('worktrack_employees').filter(e => e.tenantId === currentTenant.id);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{
      currentTenant, currentEmployee, isAuthenticated,
      companyCode, companyName, authMode,
      login, loginWithEmail, loginWithGoogle,
      logout, getEmployees, getAllEmployees,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
