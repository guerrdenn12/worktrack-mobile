import { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import wtMark from '../assets/wt-mark.svg';

// First-visit "install the app" sheet for mobile.worktracksmb.com.
// - Shows on phones/tablets opened in a browser (not already installed), before
//   or after login. It's a dismissible sheet, so it never blocks Sign In.
// - Android Chrome/Edge: one-tap Install via the captured beforeinstallprompt.
// - Android browsers without that event (Samsung, Firefox, or event not fired
//   yet): menu steps; upgrades to the Install button if the event arrives.
// - iOS (any browser): Share → Add to Home Screen steps (no programmatic install).
// "Not now" snoozes for SNOOZE_DAYS instead of hiding forever.
const SNOOZE_KEY = 'wt_install_snooze_until';
const SNOOZE_DAYS = 3;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function platform() {
  const ua = navigator.userAgent || '';
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}
function snoozed() {
  try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
}

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.4" style={{ verticalAlign: '-3px', margin: '0 3px' }} aria-hidden="true">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
  </svg>
);
const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a1a2e" style={{ verticalAlign: '-3px', margin: '0 3px' }} aria-hidden="true">
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [os] = useState(platform);
  const [canPrompt, setCanPrompt] = useState(() => !!window.__installPrompt);

  useEffect(() => {
    if (isStandalone() || os === 'other' || snoozed()) return;
    // Short delay so the page paints first and the sheet slides in.
    const t = setTimeout(() => setShow(true), 900);
    const onReady = () => setCanPrompt(true);
    const onInstalled = () => setShow(false);
    window.addEventListener('installpromptready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener('installpromptready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [os]);

  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* ignore */ }
    setShow(false);
  };

  const install = async () => {
    const p = window.__installPrompt;
    if (!p) return;
    p.prompt();
    const { outcome } = await p.userChoice;
    window.__installPrompt = null;
    setCanPrompt(false);
    if (outcome === 'accepted') setShow(false);
  };

  if (!show) return null;

  return (
    <div style={s.overlay} onClick={snooze} role="dialog" aria-modal="true" aria-labelledby="wt-install-title">
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.handle} />
        <div style={s.head}>
          <img src={wtMark} alt="" width="56" height="56" style={s.icon} />
          <div>
            <div id="wt-install-title" style={s.title}>Get the WorkTrack app</div>
            <div style={s.sub}>Clock in with one tap from your home screen. Free, no app store needed.</div>
          </div>
        </div>

        {os === 'android' && canPrompt && (
          <button style={s.primary} onClick={install}>Install app</button>
        )}

        {os === 'android' && !canPrompt && (
          <ol style={s.steps}>
            <li style={s.step}><span style={s.num}>1</span><span>Tap the menu <MenuIcon /> in your browser</span></li>
            <li style={s.step}><span style={s.num}>2</span><span>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong></span></li>
          </ol>
        )}

        {os === 'ios' && (
          <ol style={s.steps}>
            <li style={s.step}><span style={s.num}>1</span><span>Tap the <strong>Share</strong><ShareIcon />button</span></li>
            <li style={s.step}><span style={s.num}>2</span><span>Scroll down and tap <strong>Add to Home Screen</strong></span></li>
            <li style={s.step}><span style={s.num}>3</span><span>Tap <strong>Add</strong> — WorkTrack appears on your home screen</span></li>
          </ol>
        )}

        <button style={s.secondary} onClick={snooze}>Not now — continue in browser</button>
        <div style={s.brand}><BrandLogo size={18} fontSize={13} /></div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,24,21,.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'wtFade .2s ease-out',
  },
  sheet: {
    width: '100%', maxWidth: 520, background: '#fff', borderRadius: '20px 20px 0 0',
    padding: '10px 22px calc(18px + env(safe-area-inset-bottom))',
    boxShadow: '0 -10px 40px rgba(0,0,0,.18)', animation: 'wtUp .28s ease-out',
    boxSizing: 'border-box',
  },
  handle: { width: 40, height: 4, borderRadius: 2, background: '#e2ded6', margin: '0 auto 16px' },
  head: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 },
  icon: { width: 56, height: 56, borderRadius: 13, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,.18)' },
  title: { fontSize: 18, fontWeight: 700, color: '#1A1815', letterSpacing: '-0.01em' },
  sub: { fontSize: 14, color: '#6b6560', marginTop: 4, lineHeight: 1.4 },
  primary: {
    width: '100%', padding: '15px', border: 'none', borderRadius: 12, background: '#C8542C',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
  },
  steps: { listStyle: 'none', margin: '0 0 14px', padding: '14px 14px 4px', background: '#f7f5f1', borderRadius: 12 },
  step: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#2b2824', marginBottom: 10, lineHeight: 1.35 },
  num: {
    width: 22, height: 22, borderRadius: '50%', background: '#1A1815', color: '#fff', fontSize: 12,
    fontWeight: 800, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  secondary: {
    width: '100%', padding: '12px', border: 'none', background: 'transparent', color: '#6b6560',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  brand: { display: 'flex', justifyContent: 'center', marginTop: 6, opacity: .7 },
};
