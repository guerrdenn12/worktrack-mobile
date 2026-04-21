// src/utils/localStorage.js
// Helper functions for localStorage CRUD operations with server sync
import { scheduleSync } from './api';

export const getTable = (tableName) => {
  return JSON.parse(localStorage.getItem(tableName) || '[]');
};

export const setTable = (tableName, data) => {
  localStorage.setItem(tableName, JSON.stringify(data));
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
