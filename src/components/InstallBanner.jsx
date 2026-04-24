import { useState, useEffect } from 'react';

// Bottom nav height so the banner sits just above it.
const NAV_HEIGHT = 60;

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;
    // Persistent dismiss — if user closed the banner once, never show again on this device.
    if (localStorage.getItem('install_dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    if (ios) { setShow(true); return; }
    if (window.__installPrompt) { setShow(true); return; }

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
    localStorage.setItem('install_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  // iOS: slim collapsed bar by default; taps expand to show the Share-sheet steps,
  // since iOS doesn't support programmatic install.
  if (isIos) {
    return (
      <div style={{ ...styles.bar, bottom: NAV_HEIGHT }}>
        {!expanded ? (
          <div style={styles.row} onClick={() => setExpanded(true)}>
            <div style={styles.appIcon}>W</div>
            <div style={styles.textCol}>
              <div style={styles.title}>Install WorkTrack</div>
              <div style={styles.sub}>Tap for instructions</div>
            </div>
            <button style={styles.closeBtn} onClick={(e) => { e.stopPropagation(); handleDismiss(); }}>✕</button>
          </div>
        ) : (
          <div style={styles.iosSteps}>
            <button style={{ ...styles.closeBtn, top: 10, right: 10 }} onClick={handleDismiss}>✕</button>
            <div style={styles.iosTitle}>Add to Home Screen</div>
            <div style={styles.iosStep}>
              <span style={styles.stepNum}>1</span>
              Tap the <strong style={{ margin: '0 4px' }}>Share</strong>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" style={{ marginLeft: 2 }}>
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span style={{ marginLeft: 4 }}>button</span>
            </div>
            <div style={styles.iosStep}>
              <span style={styles.stepNum}>2</span>
              Tap <strong style={{ margin: '0 4px' }}>Add to Home Screen</strong>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Android: slim single-row bar with install button.
  return (
    <div style={{ ...styles.bar, bottom: NAV_HEIGHT }}>
      <div style={styles.row}>
        <div style={styles.appIcon}>W</div>
        <div style={styles.textCol}>
          <div style={styles.title}>Install WorkTrack</div>
          <div style={styles.sub}>Add to home screen</div>
        </div>
        <button style={styles.installBtn} onClick={handleInstall}>Install</button>
        <button style={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss install prompt">✕</button>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    position: 'fixed', left: 0, right: 0, zIndex: 100,
    background: '#fff', borderTop: '1px solid #eee',
    boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', minHeight: 56, cursor: 'pointer',
  },
  appIcon: {
    width: 36, height: 36, borderRadius: 8,
    background: '#1a1a2e', color: '#f5a623',
    fontSize: 18, fontWeight: 900, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 },
  sub: { fontSize: 12, color: '#888', marginTop: 2, lineHeight: 1.2 },
  installBtn: {
    background: '#f5a623', border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#fff',
    cursor: 'pointer', flexShrink: 0,
  },
  closeBtn: {
    background: 'transparent', border: 'none', borderRadius: '50%',
    width: 32, height: 32, fontSize: 16, color: '#888', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iosSteps: { padding: '12px 40px 12px 12px', position: 'relative' },
  iosTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  iosStep: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    fontSize: 13, color: '#333', marginBottom: 4,
  },
  stepNum: {
    width: 20, height: 20, borderRadius: '50%', background: '#1a1a2e',
    color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
};
