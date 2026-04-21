import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, loginWithEmail, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState('pin'); // 'pin' | 'email'
  const [companyCode, setCompanyCode] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinLogin = async () => {
    if (!companyCode.trim()) return setError('Enter your company code');
    if (!pin) return setError('Enter your PIN');
    setLoading(true);
    setError('');
    const result = await login(companyCode.trim().toUpperCase(), pin);
    if (!result.ok) setError(result.error || 'Login failed');
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email.trim()) return setError('Enter your email');
    if (!password) return setError('Enter your password');
    setLoading(true);
    setError('');
    const result = await loginWithEmail(email.trim(), password);
    if (!result.ok) setError(result.error || 'Login failed');
    setLoading(false);
  };

  const handlePinKey = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handlePinDelete = () => setPin(p => p.slice(0, -1));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>WorkTrack</div>
        <p style={styles.tagline}>Employee Time Tracking</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'pin' ? styles.tabActive : {}) }}
          onClick={() => { setTab('pin'); setError(''); }}
        >PIN Login</button>
        <button
          style={{ ...styles.tab, ...(tab === 'email' ? styles.tabActive : {}) }}
          onClick={() => { setTab('email'); setError(''); }}
        >Manager Login</button>
      </div>

      {tab === 'pin' && (
        <div style={styles.form}>
          <input
            style={styles.input}
            placeholder="Company Code (e.g. ACME42)"
            value={companyCode}
            onChange={e => setCompanyCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
          />

          <div style={styles.pinLabel}>Your PIN</div>
          <div style={styles.pinDisplay}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ ...styles.pinDot, ...(i < pin.length ? styles.pinFilled : {}) }} />
            ))}
          </div>

          <div style={styles.keypad}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button
                key={i}
                style={{ ...styles.key, ...(k === '' ? styles.keyEmpty : {}) }}
                onClick={() => k === '⌫' ? handlePinDelete() : k !== '' ? handlePinKey(k) : null}
                disabled={k === ''}
              >
                {k}
              </button>
            ))}
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.loginBtn} onClick={handlePinLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      )}

      {tab === 'email' && (
        <div style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoCapitalize="none"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.loginBtn} onClick={handleEmailLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div style={styles.divider}><span>or</span></div>

          <button style={styles.googleBtn} onClick={loginWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', background: '#f7f8fc',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 24px 32px',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  logo: { fontSize: 28, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-1px' },
  tagline: { fontSize: 14, color: '#888', margin: '4px 0 0' },
  tabs: {
    display: 'flex', background: '#fff', borderRadius: 12,
    padding: 4, marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    width: '100%', maxWidth: 360,
  },
  tab: {
    flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
    borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#888', cursor: 'pointer',
  },
  tabActive: { background: '#1a1a2e', color: '#fff' },
  form: { width: '100%', maxWidth: 360 },
  input: {
    width: '100%', padding: '15px 16px', borderRadius: 12,
    border: '1.5px solid #e5e7eb', fontSize: 16, marginBottom: 14,
    boxSizing: 'border-box', background: '#fff', outline: 'none',
  },
  pinLabel: { fontSize: 14, fontWeight: 600, color: '#444', textAlign: 'center', marginBottom: 16 },
  pinDisplay: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 },
  pinDot: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid #d1d5db', background: 'transparent',
  },
  pinFilled: { background: '#1a1a2e', border: '2px solid #1a1a2e' },
  keypad: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12, marginBottom: 24,
  },
  key: {
    height: 64, borderRadius: 12, border: 'none', background: '#fff',
    fontSize: 22, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  keyEmpty: { background: 'transparent', boxShadow: 'none', cursor: 'default' },
  loginBtn: {
    width: '100%', padding: '16px', background: '#f5a623', border: 'none',
    borderRadius: 12, fontSize: 17, fontWeight: 700, color: '#fff', cursor: 'pointer',
  },
  error: { color: '#e53e3e', fontSize: 13, textAlign: 'center', margin: '-8px 0 12px' },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    color: '#bbb', fontSize: 13, margin: '20px 0',
  },
  googleBtn: {
    width: '100%', padding: '14px', background: '#fff',
    border: '1.5px solid #e5e7eb', borderRadius: 12,
    fontSize: 15, fontWeight: 600, color: '#333',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
