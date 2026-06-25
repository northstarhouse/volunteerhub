// Data helpers — raw fetch against Portal Supabase tables
// (existing tables use anon key + permissive policies, same as Portal)

const URL  = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VOL  = encodeURIComponent('2026 Volunteers');

const hdr = (extra = {}) => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
  ...extra,
});

async function get(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: hdr() });
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: hdr(),
    body: JSON.stringify(body),
  });
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: hdr(),
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── Volunteers ────────────────────────────────────────────────────────────────

export async function fetchAllActiveVolunteers() {
  return get(`${VOL}?Status=eq.Active&select=*&order=Last%20Name.asc,First%20Name.asc`);
}

export async function fetchVolunteerById(id) {
  const rows = await get(`${VOL}?id=eq.${id}&select=*`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function fetchVolunteerByEmail(email) {
  const rows = await get(`${VOL}?Email=ilike.${encodeURIComponent(email)}&select=*`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function updateVolunteer(id, patch_data) {
  const rows = await patch(`${VOL}?id=eq.${id}`, patch_data);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

// ── Out-of-Town ───────────────────────────────────────────────────────────────

export async function fetchOotNotices() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = new Date(today.getTime() + 90 * 86400000);
  const t = today.toISOString().slice(0, 10);
  const f = future.toISOString().slice(0, 10);
  return get(`oot_notices?end_date=gte.${t}&start_date=lte.${f}&order=start_date.asc&select=*`);
}

export async function insertOotNotice(payload) {
  return post('oot_notices', payload);
}

// ── Hours (Google Apps Script) ────────────────────────────────────────────────

const HOURS_URL = 'https://script.google.com/macros/s/AKfycbwbVk0SB6geUv4xcbxkps06qXwkggMfrD59GMlC_0gRRjQ8p4rr4FNCqgEeY04RrAU_/exec?action=getHours';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export async function fetchHours() {
  try {
    const r = await fetch(HOURS_URL);
    const data = await r.json();
    if (!data.success || !Array.isArray(data.hours)) return {};
    const map = {};
    data.hours.forEach(row => {
      const name = (row.name || '').trim().toLowerCase();
      if (!name) return;
      const months = {};
      MONTHS.forEach(m => {
        const v = parseFloat(row[m.toLowerCase()]) || 0;
        if (v > 0) months[m] = v;
      });
      const total = parseFloat(row.total_hours) || 0;
      if (!map[name]) {
        map[name] = { total, months };
      } else {
        map[name].total += total;
        MONTHS.forEach(m => { if (months[m]) map[name].months[m] = (map[name].months[m] || 0) + months[m]; });
      }
    });
    return map;
  } catch {
    return {};
  }
}

export function getVolunteerHours(hoursMap, firstName, lastName) {
  const first = (firstName || '').trim().toLowerCase();
  const last  = (lastName  || '').trim().toLowerCase();
  const full  = `${first} ${last}`.trim();
  const merged = { total: 0, months: {} };
  let found = false;
  Object.entries(hoursMap).forEach(([key, data]) => {
    const match = key === full
      || key === first
      || (last && key === last)
      || (first && key.startsWith(first) && (!last || key.endsWith(last)));
    if (match) {
      found = true;
      merged.total += data.total;
      MONTHS.forEach(m => { if (data.months[m]) merged.months[m] = (merged.months[m] || 0) + data.months[m]; });
    }
  });
  return found ? merged : null;
}

export { MONTHS };
