// Data helpers — raw fetch against Portal Supabase tables
// (existing tables use anon key + permissive policies, same as Portal)

import { supabase } from '../supabase.js';

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

// ── Image helpers ────────────────────────────────────────────────────────────

export function photoUrl(value) {
  if (!value) return null;
  // Full URL already (Supabase storage, Google Drive, etc.)
  if (value.startsWith('http')) {
    // Convert old Google Drive share links
    if (value.includes('drive.google.com')) {
      const i = value.indexOf('/d/');
      if (i === -1) return value;
      const id = value.substring(i + 3).split('/')[0].split('?')[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w200`;
    }
    return value;
  }
  // Bare filename → Supabase team-photos bucket
  return `${URL}/storage/v1/object/public/team-photos/${value}`;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

const CALENDAR_ICAL_URL = 'https://calendar.google.com/calendar/ical/thenorthstarhouse%40gmail.com/private-06287b2ca0d9ee6acd4f49f9d4d0d2da/basic.ics';

export async function fetchCalendarEvents() {
  const proxy = 'https://corsproxy.io/?' + encodeURIComponent(CALENDAR_ICAL_URL);
  const text = await fetch(proxy).then(r => r.text());
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  const events = [];
  let current = null;
  unfolded.split('\n').forEach(line => {
    if (line === 'BEGIN:VEVENT') { current = {}; }
    else if (line === 'END:VEVENT') { if (current) events.push(current); current = null; }
    else if (current) {
      const ci = line.indexOf(':');
      if (ci !== -1) { current[line.slice(0, ci).split(';')[0]] = line.slice(ci + 1); }
    }
  });
  return events;
}

export function parseIcalDate(val) {
  if (!val) return null;
  val = val.replace(/[^0-9TZ]/g, '');
  if (val.length === 8) return new Date(`${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00`);
  const [y, mo, d, h, mi] = [val.slice(0,4), val.slice(4,6), val.slice(6,8), val.slice(9,11), val.slice(11,13)];
  const s = val.slice(13,15) || '00';
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${val.endsWith('Z') ? 'Z' : ''}`);
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
  const { error } = await supabase
    .from('2026 Volunteers')
    .update(patch_data)
    .eq('id', id);
  if (error) return { code: error.code, message: error.message };
  return patch_data;
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

// ── Hours (Supabase kiosk_logs) ───────────────────────────────────────────────

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildHoursMap(logs) {
  const byName = {};
  for (const log of logs) {
    const name = (log.name || '').trim();
    if (!name) continue;
    if (!byName[name]) byName[name] = [];
    byName[name].push(log);
  }

  const map = {};
  for (const [name, nameLogs] of Object.entries(byName)) {
    const key = name.toLowerCase();
    const months = {};
    let total = 0;

    for (let i = 0; i < nameLogs.length; i++) {
      if (nameLogs[i].action !== 'check-in') continue;
      const checkOut = nameLogs.find((l, idx) => idx > i && l.action === 'check-out');
      if (!checkOut) continue;
      const hours = (new Date(checkOut.timestamp) - new Date(nameLogs[i].timestamp)) / 3600000;
      if (hours <= 0 || hours > 24) continue;
      const m = MONTHS[new Date(nameLogs[i].timestamp).getMonth()];
      months[m] = (months[m] || 0) + hours;
      total += hours;
    }

    if (!map[key]) {
      map[key] = { total, months };
    } else {
      map[key].total += total;
      MONTHS.forEach(m => { if (months[m]) map[key].months[m] = (map[key].months[m] || 0) + months[m]; });
    }
  }
  return map;
}

export async function fetchHours() {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `${URL}/rest/v1/kiosk_logs?type=eq.volunteer&timestamp=gte.${year}-01-01T00:00:00.000Z&timestamp=lt.${year + 1}-01-01T00:00:00.000Z&order=name.asc,timestamp.asc&select=timestamp,name,action`,
      { headers: hdr() }
    );
    if (!res.ok) return {};
    return buildHoursMap(await res.json());
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


