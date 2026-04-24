import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, loginWithEmail, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState('pin');
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
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo-wrap">
          <div className="login-logo-icon">📋</div>
          <div className="login-logo">Work<span>Track</span></div>
        </div>
        <p className="login-tagline">Clock in &amp; manage shifts</p>
      </div>

      <div className="login-tabs">
        <button
          className={`login-tab${tab === 'pin' ? ' login-tab--active' : ''}`}
          onClick={() => { setTab('pin'); setError(''); }}
        >PIN Login</button>
        <button
          className={`login-tab${tab === 'email' ? ' login-tab--active' : ''}`}
          onClick={() => { setTab('email'); setError(''); }}
        >Manager Login</button>
      </div>

      {tab === 'pin' && (
        <div className="login-form">
          <input
            className="login-input"
            placeholder="Company Code (e.g. ACME42)"
            value={companyCode}
            onChange={e => setCompanyCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
          />

          <div className="pin-label">Your PIN</div>
          <div className="pin-display">
            {Array.from({ length: Math.max(pin.length, 4) }, (_, i) => (
              <div key={i} className={`pin-dot${i < pin.length ? ' pin-dot--filled' : ''}`} />
            ))}
          </div>

          <div className="keypad">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button
                key={i}
                className={`keypad-key${k === '' ? ' keypad-key--empty' : ''}`}
                onClick={() => k === '⌫' ? handlePinDelete() : k !== '' ? handlePinKey(k) : null}
                disabled={k === ''}
              >
                {k}
              </button>
            ))}
          </div>

          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" onClick={handlePinLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      )}

      {tab === 'email' && (
        <div className="login-form">
          <input
            className="login-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoCapitalize="none"
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" onClick={handleEmailLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="login-divider"><span>or</span></div>

          <button className="google-btn" onClick={loginWithGoogle}>
            <svg width="20" height="20" viewBox="0 0 18 18" style={{ marginRight: 10 }}>
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
