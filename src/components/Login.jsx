import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Mobile is an EMPLOYEE-ONLY app. It is not a public/evaluation surface — after
// a company buys WorkTrack it hands this link to its staff, who sign in with the
// company code + PIN their employer issues them. Managers and admins use the
// desktop app (app.worktracksmb.com), so there is no email/SSO login here.
export default function Login() {
  const { login } = useAuth();
  const [companyCode, setCompanyCode] = useState('');
  const [pin, setPin] = useState('');
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

        <p className="login-help" style={{ marginTop: 16, fontSize: 12, color: '#7A746A', textAlign: 'center' }}>
          Your company code and PIN are provided by your employer.
          <br />Trouble signing in? Ask your manager or admin.
        </p>
      </div>
    </div>
  );
}
