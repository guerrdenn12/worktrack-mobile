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
};

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
export async function pushToServer(companyCode) {
  const code = companyCode || getCompanyCode();
  if (!code) return false;

  try {
    const data = {};
    Object.entries(TABLE_MAP).forEach(([localKey, serverKey]) => {
      data[serverKey] = JSON.parse(localStorage.getItem(localKey) || '[]');
    });

    const res = await fetch(`${API_BASE}/api/company/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ companyCode: code, data }),
    });

    if (res.status === 401) {
      console.warn('Session expired — sync skipped');
      return false;
    }

    const result = await res.json();
    return result.ok;
  } catch (err) {
    console.warn('Failed to push to server:', err);
    return false;
  }
}

// Debounced sync — waits 2s after last change before pushing
let syncTimer = null;
export function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushToServer();
  }, 2000);
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
