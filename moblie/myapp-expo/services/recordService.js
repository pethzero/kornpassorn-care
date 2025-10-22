import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'finance_records_v1';

export async function loadAll() {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  console.log(json)
  if (!json) return { meta: { version: 1, deviceId: null, updatedAt: null }, records: [] };
  try {
    return JSON.parse(json);
  } catch {
    return { meta: { version: 1, deviceId: null, updatedAt: null }, records: [] };
  }
}

// ...existing code...
export async function saveAll(store) {
  try {
    store.meta = { ...(store.meta || {}), updatedAt: new Date().toISOString() };
    const str = JSON.stringify(store);
    console.log('saveAll -> writing', STORAGE_KEY, str.length, 'chars');
    await AsyncStorage.setItem(STORAGE_KEY, str);
    return store;
  } catch (err) {
    console.error('saveAll error:', err);
    throw err;
  }
}

// debug helper: seed some sample data
export async function seedSample() {
  const sample = {
    meta: { version: 1, deviceId: 'dev-local', updatedAt: new Date().toISOString() },
    records: [
      { id: uuidv4(), type: 'income', title: 'ทดสอบ', amount: 20, currency: 'THB', date: new Date().toISOString().slice(0,10),
        description: '', createdAt: new Date().toISOString(), lastModified: new Date().toISOString(), deleted: false, syncStatus: 'dirty' }
    ]
  };
  console.log('seedSample -> saving sample');
  await saveAll(sample);
  return sample;
}

export async function addRecord({ title, amount, type = 'income', date, description = '' }) {
console.log('AAA')
  const store = await loadAll();
  const rec = {
    id: uuidv4(),
    type,
    title,
    amount: Number(amount),
    currency: 'THB',
    date: date || new Date().toISOString().slice(0, 10),
    description,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    deleted: false,
    syncStatus: 'dirty'
  };
  store.records = [rec, ...(store.records || [])];
  await saveAll(store);
  return rec;
}

export async function updateRecord(id, patch) {
  const store = await loadAll();
  store.records = (store.records || []).map(r => r.id === id ? { ...r, ...patch, lastModified: new Date().toISOString(), syncStatus: 'dirty' } : r);
  await saveAll(store);
  return store.records.find(r => r.id === id);
}

export async function deleteRecord(id) {
  const store = await loadAll();
  // soft delete
  store.records = (store.records || []).map(r => r.id === id ? { ...r, deleted: true, lastModified: new Date().toISOString(), syncStatus: 'dirty' } : r);
  await saveAll(store);
  return id;
}

export async function exportJSON() {
  const store = await loadAll();
  return JSON.stringify(store, null, 2);
}

export async function importJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    await saveAll(parsed);
    return parsed;
  } catch (err) {
    throw new Error('Invalid JSON');
  }
}

// placeholder for server sync (implement API call)
export async function syncToServer(apiUrl, token) {
  const store = await loadAll();
  const dirty = (store.records || []).filter(r => r.syncStatus === 'dirty' || r.deleted);
  if (!dirty.length) return { uploaded: 0 };
  // TODO: POST dirty to server, handle response, update syncStatus
  return { uploaded: dirty.length };
}