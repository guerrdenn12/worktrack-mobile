// src/utils/localStorage.js
// Helper functions for localStorage CRUD operations with server sync
import { scheduleSync } from './api';

export const getTable = (tableName) => {
  return JSON.parse(localStorage.getItem(tableName) || '[]');
};

// Tables whose deletions must be sent to the server explicitly. The server
// never removes a row just because a device doesn't have it (that device may
// simply be out of date), so intentional deletes are recorded here as
// "tombstones" and sent with the next sync.
const TRACKED_TABLES = new Set([
  'worktrack_time_entries', 'worktrack_breaks', 'worktrack_time_off', 'worktrack_schedules',
  'worktrack_locations', 'worktrack_clients', 'worktrack_projects', 'worktrack_project_assignments',
  'worktrack_invoices', 'worktrack_invoice_line_items',
]);
export const TOMBSTONE_KEY = 'worktrack_tombstones';
export const PENDING_KEY = 'worktrack_sync_pending';

function recordDeletions(tableName, prevRows, nextRows) {
  try {
    const nextIds = new Set((nextRows || []).map(r => String(r?.id)));
    const removed = (prevRows || []).map(r => String(r?.id)).filter(id => id !== 'undefined' && !nextIds.has(id));
    if (!removed.length) return;
    const t = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}');
    t[tableName] = [...new Set([...(t[tableName] || []), ...removed])];
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(t));
  } catch { /* ignore */ }
}

export const setTable = (tableName, data) => {
  if (TRACKED_TABLES.has(tableName)) recordDeletions(tableName, getTable(tableName), data);
  localStorage.setItem(tableName, JSON.stringify(data));
  // Mark unsynced changes; cleared only when the server confirms the sync.
  try { localStorage.setItem(PENDING_KEY, String(Date.now())); } catch { /* ignore */ }
  // Auto-sync to server after any write
  scheduleSync();
};

export const addRecord = (tableName, record) => {
  const data = getTable(tableName);
  data.push(record);
  setTable(tableName, data);
  return record;
};

export const updateRecord = (tableName, id, updates) => {
  const data = getTable(tableName);
  const index = data.findIndex(r => r.id === id);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  setTable(tableName, data);
  return data[index];
};

export const deleteRecord = (tableName, id) => {
  const data = getTable(tableName);
  const filtered = data.filter(r => r.id !== id);
  setTable(tableName, filtered);
  return filtered;
};

export const getRecordsByTenant = (tableName, tenantId) => {
  const data = getTable(tableName);
  return data.filter(r => r.tenantId === tenantId);
};

export const generateId = (prefix = 'rec') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
