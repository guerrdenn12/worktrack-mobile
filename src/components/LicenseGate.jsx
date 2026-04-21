import { useState, useEffect } from 'react';
import { createCompany } from '../utils/api';

const DEMO_KEY = 'WTDEMO2024';

function useLicense() {
  const [status, setStatus] = useState('loading');
  const [licenseKey, setLicenseKey] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('worktrack_license');
    const demo = localStorage.getItem('worktrack_demo');
    if (demo === 'true' || stored) {
      setStatus('licensed');
    } else {
      setStatus('unlicensed');
    }
  }, []);

  return { status, licenseKey, setLicenseKey, companyCode, setCompanyCode, setStatus };
}

export default function LicenseGate({ children }) {
  const { status, setStatus } = useLicense();
  const [step, setStep] = useState('license');
  const [key, setKey] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') return null;
  if (status === 'licensed') return children;

  const handleValidate = async () => {
    if (!key.trim()) return setError('Enter your license key');
    setLoading(true);
    setError('');

    if (key.trim().toUpperCase() === DEMO_KEY) {
      localStorage.setItem('worktrack_demo', 'true');
      localStorage.setItem('worktrack_license', key.trim());
      setStatus('licensed');
      setLoading(false);
      return;
    }

    // Move to company setup — validation happens when createCompany is called
    localStorage.setItem('worktrack_license', key.trim());
    setStep('company');
    setLoading(false);
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return setError('Enter your company name');
    if (!industry) return setError('Select your industry');
    setLoading(true);
    setError('');
    try {
      const result = await createCompany(key.trim(), companyName.trim());
      if (result.ok) {
        setCode(result.companyCode);
        setStep('success');
      } else {
        setError(result.error || 'Could not create company');
      }
    } catch {
      setError('Could not create company. Check your connection.');
    }
    setLoading(false);
  };

  const handleDone = () => {
    setStatus('licensed');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>WorkTrack</div>

        {step === 'license' && (
          <>
            <h2 style={styles.title}>Activate Your License</h2>
            <p style={styles.sub}>Enter your license key to get started</p>
            <input
              style={styles.input}
              placeholder="License Key (e.g. WT-XXXX-XXXX)"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleValidate()}
              autoCapitalize="characters"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onClick={handleValidate} disabled={loading}>
              {loading ? 'Validating…' : 'Activate'}
            </button>
            <p style={styles.hint}>Use <strong>WTDEMO2024</strong> to try the demo</p>
          </>
        )}

        {step === 'company' && (
          <>
            <h2 style={styles.title}>Set Up Your Company</h2>
            <p style={styles.sub}>Almost there — tell us about your business</p>
            <input
              style={styles.input}
              placeholder="Company Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
            <select style={styles.input} value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">Select Industry</option>
              <option value="restaurant">Restaurant / Food Service</option>
              <option value="retail">Retail</option>
              <option value="healthcare">Healthcare</option>
              <option value="construction">Construction</option>
              <option value="hospitality">Hospitality</option>
              <option value="other">Other</option>
            </select>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onClick={handleCreateCompany} disabled={loading}>
              {loading ? 'Setting up…' : 'Create Company'}
            </button>
          </>
        )}

        {step === 'success' && (
          <>
            <div style={styles.checkmark}>✓</div>
            <h2 style={styles.title}>You're all set!</h2>
            <p style={styles.sub}>Your company code is:</p>
            <div style={styles.codeBox}>{code}</div>
            <p style={styles.hint}>Share this code with employees so they can log in</p>
            <button style={styles.btn} onClick={handleDone}>Get Started</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f7f8fc', padding: '24px',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '32px 24px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: 400,
    textAlign: 'center',
  },
  logo: {
    fontSize: 22, fontWeight: 700, color: '#1a1a2e',
    marginBottom: 24, letterSpacing: '-0.5px',
  },
  title: { fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' },
  sub: { fontSize: 14, color: '#666', margin: '0 0 24px' },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', fontSize: 16, marginBottom: 12,
    boxSizing: 'border-box', outline: 'none', background: '#fafafa',
  },
  btn: {
    width: '100%', padding: '16px', background: '#f5a623', border: 'none',
    borderRadius: 10, fontSize: 16, fontWeight: 700, color: '#fff',
    cursor: 'pointer', marginTop: 8,
  },
  error: { color: '#e53e3e', fontSize: 13, margin: '-4px 0 8px' },
  hint: { fontSize: 13, color: '#999', marginTop: 16 },
  checkmark: { fontSize: 48, color: '#22c55e', marginBottom: 12 },
  codeBox: {
    background: '#f0f4ff', borderRadius: 10, padding: '16px',
    fontSize: 28, fontWeight: 800, color: '#1a1a2e', letterSpacing: 4,
    margin: '12px 0',
  },
};
