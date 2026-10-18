import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setEmployeePin } from '../utils/api';
import BrandLogo from './BrandLogo';

// Shown when the server flags `mustChangePin`: an admin-assigned temporary PIN,
// or an old 4-digit PIN (WorkTrack now requires 6 digits).
export default function ForcePinChange() {
  const { currentEmployee, clearPinChangeFlag, logout } = useAuth();
  const [step, setStep] = useState('new'); // 'new' | 'confirm'
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const weak = (p) => /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);

  const next = async () => {
    setError('');
    if (!/^\d{6}$/.test(pin)) return setError('Enter 6 digits');
    if (step === 'new') {
      if (weak(pin)) { setPin(''); return setError('That PIN is too easy to guess. Try another.'); }
      setFirst(pin); setPin(''); setStep('confirm'); return;
    }
    if (pin !== first) { setPin(''); setFirst(''); setStep('new'); return setError("PINs didn't match. Start again."); }
    setSaving(true);
    const res = await setEmployeePin(currentEmployee.id, pin);
    setSaving(false);
    if (!res.ok) { setPin(''); setFirst(''); setStep('new'); return setError(res.error); }
    clearPinChangeFlag();
  };

  const key = (k) => {
    if (k === '⌫') return setPin(p => p.slice(0, -1));
    if (k !== '' && pin.length < 6) setPin(p => p + k);
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo-wrap" aria-label="WorkTrack"><BrandLogo size={44} fontSize={34} /></div>
        <p className="login-tagline">
          {currentEmployee?.pinUpgradeRequired
            ? 'WorkTrack now uses 6-digit PINs. Choose a new one to continue.'
            : 'Choose your own 6-digit PIN to replace the temporary one.'}
        </p>
      </div>
      <div className="login-form">
        <div className="pin-label">{step === 'new' ? 'New PIN' : 'Confirm new PIN'}</div>
        <div className="pin-display">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`pin-dot${i < pin.length ? ' pin-dot--filled' : ''}`} />
          ))}
        </div>
        <div className="keypad">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button key={i} className={`keypad-key${k === '' ? ' keypad-key--empty' : ''}`}
              onClick={() => key(k)} disabled={k === ''}>{k}</button>
          ))}
        </div>
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={next} disabled={saving}>
          {saving ? 'Saving…' : step === 'new' ? 'Next' : 'Save PIN'}
        </button>
        <button onClick={logout} style={{ width: '100%', marginTop: 12, background: 'none', border: 0, color: '#7A746A', fontSize: 13, textDecoration: 'underline' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
