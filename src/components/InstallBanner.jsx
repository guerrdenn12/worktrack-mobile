import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;
    if (sessionStorage.getItem('install_dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    if (ios) {
      setShow(true);
      return;
    }

    if (window.__installPrompt) {
      setShow(true);
      return;
    }

    const handler = () => setShow(true);
    window.addEventListener('installpromptready', handler);
    return () => window.removeEventListener('installpromptready', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = window.__installPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      window.__installPrompt = null;
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('install_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  if (isIos) {
    return (
      <div style={styles.iosCard}>
        <button style={styles.closeBtn} onClick={handleDismiss}>✕</button>
        <div style={styles.iosTitle}>Add WorkTrack to your Home Screen</div>
        <div style={styles.iosSteps}>
          <div style={styles.step}>
            <div style={styles.stepNum}>1</div>
            <div style={styles.stepText}>
              Tap the <strong>Share</strong> button{' '}
              <span style={styles.shareIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              </span>{' '}
              at the bottom of Safari
            </div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>2</div>
            <div style={styles.stepText}>Scroll down and tap <strong>Add to Home Screen</strong></div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>3</div>
            <div style={styles.stepText}>Tap <strong>Add</strong> in the top right</div>
          </div>
        </div>
        {/* Arrow pointing down toward Safari's share button */}
        <div style={styles.arrow}>↓</div>
      </div>
    );
  }

  // Android — large bottom sheet with prominent install button
  return (
    <div style={styles.androidCard}>
      <button style={styles.closeBtn} onClick={handleDismiss}>✕</button>
      <div style={styles.androidIconRow}>
        <div style={styles.androidAppIcon}>W</div>
        <div>
          <div style={styles.androidTitle}>Install WorkTrack</div>
          <div style={styles.androidSub}>Add to your home screen</div>
        </div>
      </div>
      <p style={styles.androidDesc}>
        Get quick access to clock in, view your schedule, and request time off — right from your home screen.
      </p>
      <button style={styles.androidInstallBtn} onClick={handleInstall}>
        Add to Home Screen
      </button>
    </div>
  );
}

const styles = {
  // iOS card
  iosCard: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
    background: '#fff', borderRadius: '20px 20px 0 0',
    padding: '24px 24px 40px',
    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    background: '#f0f0f0', border: 'none', borderRadius: '50%',
    width: 34, height: 34, fontSize: 14, color: '#666', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iosTitle: {
    fontSize: 18, fontWeight: 800, color: '#1a1a2e',
    marginBottom: 20, textAlign: 'center',
  },
  iosSteps: { display: 'flex', flexDirection: 'column', gap: 16 },
  step: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  stepNum: {
    width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e',
    color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stepText: { fontSize: 16, color: '#333', lineHeight: 1.5, paddingTop: 6 },
  shareIcon: { display: 'inline-flex', verticalAlign: 'middle', color: '#007aff' },
  arrow: { textAlign: 'center', fontSize: 32, color: '#007aff', marginTop: 20 },
  // Android card
  androidCard: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
    background: '#fff', borderRadius: '20px 20px 0 0',
    padding: '28px 24px 40px',
    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
  },
  androidIconRow: {
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
  },
  androidAppIcon: {
    width: 64, height: 64, borderRadius: 16,
    background: '#1a1a2e', color: '#f5a623',
    fontSize: 32, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  androidTitle: { fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
  androidSub: { fontSize: 14, color: '#888', marginTop: 2 },
  androidDesc: {
    fontSize: 15, color: '#555', lineHeight: 1.6,
    margin: '0 0 24px',
  },
  androidInstallBtn: {
    width: '100%', padding: '18px',
    background: '#f5a623', border: 'none', borderRadius: 14,
    fontSize: 18, fontWeight: 800, color: '#fff', cursor: 'pointer',
  },
};
