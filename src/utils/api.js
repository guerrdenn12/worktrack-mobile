// src/utils/api.js
// API client for server-side data sync

const TABLE_MAP = {
  'worktrack_tenants': 'tenants',
  'worktrack_employees': 'employees',
  'worktrack_time_entries': 'time_entries',
  'worktrack_schedules': 'schedules',
  'worktrack_time_off': 'time_off',
  'worktrack_clients': 'clients',
  'worktrack_projects': 'projects',
  'worktrack_project_assignments': 'project_assignments',
  'worktrack_invoices': 'invoices',
  'worktrack_invoice_line_items': 'invoice_line_items',
  'worktrack_breaks': 'breaks',
  'worktrack_locations': 'locations',
};

// Unsynced-change tracking (see utils/localStorage.js).
const PENDING_KEY = 'worktrack_sync_pending';
const TOMBSTONE_KEY = 'worktrack_tombstones';
export function hasPendingSync() {
  try { return !!localStorage.getItem(PENDING_KEY); } catch { return false; }
}
function notifySync() {
  try { window.dispatchEvent(new Event('worktrack-sync')); } catch { /* ignore */ }
}

const REVERSE_MAP = Object.fromEntries(
  Object.entries(TABLE_MAP).map(([k, v]) => [v, k])
);

// All API calls go to the web app's Netlify functions
const API_BASE = 'https://app.worktracksmb.com'

// Session token management
function getSessionToken() {
  return localStorage.getItem('worktrack_session_token') || '';
}

function setSessionToken(token) {
  if (token) {
    localStorage.setItem('worktrack_session_token', token);
  }
}

// Ask the server to revoke this phone's session token (best effort).
export function revokeSession(companyCode, token) {
  if (!companyCode || !token) return Promise.resolve();
  return fetch(`${API_BASE}/api/company/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ companyCode }),
    keepalive: true,
  }).catch(() => {});
}

export function getCurrentSessionToken() {
  return getSessionToken();
}

// Change a PIN on the server (stored hashed). Used by the forced PIN change.
export async function setEmployeePin(employeeId, newPin, currentPin) {
  const code = getCompanyCode();
  if (!code) return { ok: false, error: 'Not signed in' };
  try {
    const res = await fetch(`${API_BASE}/api/company/set-pin`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ companyCode: code, employeeId, newPin: String(newPin), ...(currentPin !== undefined ? { currentPin: String(currentPin) } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Could not update PIN. Try again.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to connect. Please check your internet.' };
  }
}

export function clearSessionToken() {
  localStorage.removeItem('worktrack_session_token');
}

function authHeaders() {
  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Get the current company code from session
function getCompanyCode() {
  try {
    const session = localStorage.getItem('worktrack_session');
    if (session) return JSON.parse(session).companyCode;
  } catch {}
  return null;
}

// Fetch all company data from server and load into localStorage
export async function pullFromServer(companyCode) {
  const code = companyCode || getCompanyCode();
  if (!code) return false;

  // Never overwrite unsynced local changes (e.g. a clock-in made offline):
  // push them first, and if that fails keep the local copy untouched.
  if (hasPendingSync()) {
    const pushed = await pushToServer(code);
    if (!pushed) return false;
  }

  try {
    const res = await fetch(`${API_BASE}/api/company/data?code=${code}`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      console.warn('Session expired — data pull skipped');
      return false;
    }

    const result = await res.json();
    if (!result.ok) return false;

    const data = result.data;
    // Load each table into localStorage
    Object.entries(TABLE_MAP).forEach(([localKey, serverKey]) => {
      if (data[serverKey]) {
        localStorage.setItem(localKey, JSON.stringify(data[serverKey]));
      }
    });

    return true;
  } catch (err) {
    console.warn('Failed to pull from server:', err);
    return false;
  }
}

// Push all localStorage data to server
export async function pushToServer(companyCode, { keepalive = false } = {}) {
  const code = companyCode || getCompanyCode();
  if (!code) return false;

  try {
    const pendingAtStart = localStorage.getItem(PENDING_KEY);
    const tombstones = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}');
    const data = {};
    const deleted = {};
    Object.entries(TABLE_MAP).forEach(([localKey, serverKey]) => {
      data[serverKey] = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (Array.isArray(tombstones[localKey]) && tombstones[localKey].length) deleted[serverKey] = tombstones[localKey];
    });

    const res = await fetch(`${API_BASE}/api/company/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ companyCode: code, data, deleted }),
      // keepalive lets the request complete even if the page is unloading
      keepalive,
    });

    if (res.status === 401) {
      console.warn('Session expired — sync skipped');
      return false;
    }

    const result = await res.json();
    if (result.ok) {
      // Server confirmed: drop the tombstones we sent, and clear the unsynced
      // flag unless something changed locally while the request was in flight.
      try {
        const t = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}');
        for (const [localKey, ids] of Object.entries(tombstones)) {
          const sent = new Set(ids);
          t[localKey] = (t[localKey] || []).filter(id => !sent.has(id));
          if (!t[localKey].length) delete t[localKey];
        }
        localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(t));
        if (localStorage.getItem(PENDING_KEY) === pendingAtStart) localStorage.removeItem(PENDING_KEY);
      } catch { /* ignore */ }
      notifySync();
    }
    return !!result.ok;
  } catch (err) {
    console.warn('Failed to push to server:', err);
    return false;
  }
}

// Debounced sync — waits 2s after last change before pushing
let syncTimer = null;
let pendingSync = false;
export function scheduleSync() {
  pendingSync = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    pendingSync = false;
    pushToServer();
  }, 2000);
}

// Flush a pending debounced sync immediately. Without this, a clock-in/out
// made within the 2s debounce window is lost if the app is backgrounded or
// closed before the timer fires — a constant risk on mobile, where switching
// apps or locking the phone mid-action is routine.
function flushSync({ keepalive = false } = {}) {
  if (!pendingSync) return;
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  pendingSync = false;
  pushToServer(undefined, { keepalive });
}

// Flush on app lifecycle transitions. visibilitychange→hidden is the reliable
// "going to background" signal on mobile PWAs — the page stays alive, so a
// normal fetch completes. pagehide covers tab close / navigation away, where
// keepalive lets the request outlive the unload (best-effort: keepalive bodies
// are capped at 64KB, so it's reserved for the true-unload case).
if (typeof document !== 'undefined' && !window.__wtSyncFlushBound) {
  window.__wtSyncFlushBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSync({ keepalive: false });
  });
  window.addEventListener('pagehide', () => flushSync({ keepalive: true }));
}

// Auth: login with company code + PIN
export async function serverLogin(companyCode, pin) {
  try {
    const res = await fetch(`${API_BASE}/api/company/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyCode, pin }),
    });
    const result = await res.json();

    // Store session token on successful login
    if (result.ok && result.sessionToken) {
      setSessionToken(result.sessionToken);
    }

    return result;
  } catch (err) {
    return { ok: false, error: 'Unable to connect. Please check your internet.' };
  }
}

// Create company on server
export async function createCompany(licenseKey, companyName) {
  try {
    const res = await fetch(`${API_BASE}/api/company/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, companyName }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: 'Unable to connect. Please check your internet.' };
  }
}

// Retry unsynced changes until the server confirms them: when the connection
// returns, when the app comes back to the foreground, and every 30s while
// anything is pending. Clock-ins made with no signal are kept on the device
// (pullFromServer won't overwrite them) and delivered as soon as possible.
if (typeof window !== 'undefined' && !window.__wtRetryBound) {
  window.__wtRetryBound = true;
  const retry = () => {
    if (hasPendingSync() && navigator.onLine !== false && !syncTimer) pushToServer();
  };
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retry();
  });
  setInterval(retry, 30000);
}
