// Data helpers — raw fetch against Portal Supabase tables
// (existing tables use anon key + permissive policies, same as Portal)

import { supabase } from '../supabase.js';

const URL  = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VOL  = encodeURIComponent('2026 Volunteers');

async function hdr(extra = {}) {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: KEY,
    Authorization: `Bearer ${data.session?.access_token || KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

async function get(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: await hdr() });
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: await hdr(),
    body: JSON.stringify(body),
  });
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: await hdr(),
    body: JSON.stringify(body),
  });
  return r.json();
}

async function del(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: await hdr(),
  });
  return r.ok;
}

// ── Zodiac ───────────────────────────────────────────────────────────────────

// Trailing ︎ forces text (monochrome) presentation instead of colored
// emoji glyphs, so the CSS text color actually applies.
const ZODIAC_SIGNS = [
  { name: 'Capricorn',  symbol: '♑︎', from: [12, 22], to: [1, 19] },
  { name: 'Aquarius',   symbol: '♒︎', from: [1, 20],  to: [2, 18] },
  { name: 'Pisces',     symbol: '♓︎', from: [2, 19],  to: [3, 20] },
  { name: 'Aries',      symbol: '♈︎', from: [3, 21],  to: [4, 19] },
  { name: 'Taurus',     symbol: '♉︎', from: [4, 20],  to: [5, 20] },
  { name: 'Gemini',     symbol: '♊︎', from: [5, 21],  to: [6, 20] },
  { name: 'Cancer',     symbol: '♋︎', from: [6, 21],  to: [7, 22] },
  { name: 'Leo',        symbol: '♌︎', from: [7, 23],  to: [8, 22] },
  { name: 'Virgo',      symbol: '♍︎', from: [8, 23],  to: [9, 22] },
  { name: 'Libra',      symbol: '♎︎', from: [9, 23],  to: [10, 22] },
  { name: 'Scorpio',    symbol: '♏︎', from: [10, 23], to: [11, 21] },
  { name: 'Sagittarius',symbol: '♐︎', from: [11, 22], to: [12, 21] },
];

// month is 1-12
export function getZodiacSign(month, day) {
  if (!month || !day) return null;
  return ZODIAC_SIGNS.find(({ from, to }) => {
    const [fm, fd] = from, [tm, td] = to;
    if (fm === tm) return month === fm && day >= fd && day <= td;
    if (fm > tm) return (month === fm && day >= fd) || (month === tm && day <= td);
    return (month === fm && day >= fd) || (month > fm && month < tm) || (month === tm && day <= td);
  }) || null;
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

export const DUTY_LABELS = {
  construction:      'Construction',
  board:              'Board Member',
  landscape:          'Grounds',
  docents:            'Docent',
  interiors:          'Interiors',
  events:             'Events Team',
  volunteerExchange:  'Volunteer Exchange',
  other:              'Other',
};

function buildLocalIso(dateStr, timeStr) {
  const value = new Date(`${dateStr}T${timeStr}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export async function insertManualHours(name, duty, { date, useSpecificTimes, startTime, endTime, hours }) {
  let checkInIso, checkOutIso;

  if (useSpecificTimes) {
    checkInIso = buildLocalIso(date, startTime);
    checkOutIso = buildLocalIso(date, endTime);
    if (!checkInIso || !checkOutIso || new Date(checkOutIso) <= new Date(checkInIso)) {
      return { error: 'Invalid start/end time.' };
    }
  } else {
    const enteredHours = Number(hours);
    if (!Number.isFinite(enteredHours) || enteredHours <= 0 || enteredHours > 12) {
      return { error: 'Hours must be between 0 and 12.' };
    }
    checkInIso = buildLocalIso(date, '09:00');
    if (!checkInIso) return { error: 'Invalid date.' };
    checkOutIso = new Date(new Date(checkInIso).getTime() + enteredHours * 3600000).toISOString();
  }

  const rows = [
    { timestamp: checkInIso,  name, type: 'volunteer', duty, action: 'check-in',  source: 'manual-hours' },
    { timestamp: checkOutIso, name, type: 'volunteer', duty, action: 'check-out', source: 'manual-hours' },
  ];

  const res = await fetch(`${URL}/rest/v1/kiosk_logs`, {
    method: 'POST',
    headers: await hdr({ Prefer: 'return=minimal' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) return { error: 'Failed to save. Please try again.' };
  return { success: true };
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

// ── Operational Areas ─────────────────────────────────────────────────────────

export const OPERATIONAL_AREAS = ['Construction', 'Grounds', 'Interiors', 'Docents', 'Fundraising', 'Events', 'Marketing', 'Venue'];

export const AREA_DEFAULTS = {
  'Construction': { lead: 'Rick Panos',      budget: 12000, pic: '' },
  'Grounds':      { lead: 'Paula Campbell',  budget: 14000, pic: '' },
  'Interiors':    { lead: 'Bec Freeman',     budget: 2500,  pic: '' },
  'Docents':      { lead: 'Rich Hill',       budget: 1000,  pic: '' },
  'Fundraising':  { lead: 'Kaelen Jennings', budget: null,  pic: '' },
  'Events':       { lead: 'Barb Kusha',      budget: 7500,  pic: '' },
  'Marketing':    { lead: 'Haley Wright',    budget: 1000,  pic: '' },
  'Venue':        { lead: 'Staff',           budget: null,  pic: '' },
};

const AREA_ALIASES = {
  'Events':  ['events team', 'event support', 'events'],
  'Docents': ['docent', 'docents'],
  'Venue':   ['venue'],
};

export function matchVolunteerAreas(team) {
  if (!team) return [];
  const tags = team.split(/[,|]/).map(t => t.trim().toLowerCase()).filter(Boolean);
  return OPERATIONAL_AREAS.filter(area => {
    const aliases = AREA_ALIASES[area] || [area.toLowerCase()];
    return tags.some(t => aliases.indexOf(t) !== -1);
  });
}

export function currentQuarterStr() {
  const m = new Date().getMonth();
  return m <= 2 ? 'Q1' : m <= 5 ? 'Q2' : m <= 8 ? 'Q3' : 'Q4';
}

export async function fetchOperationalAreaInfo(area) {
  const rows = await get(`Operational%20Areas?area=eq.${encodeURIComponent(area)}&select=*`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function fetchOpBudget(area) {
  const rows = await get(`Op%20Budget?area=eq.${encodeURIComponent(area)}&select=*&order=date.desc,id.desc`);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchOpEarnings(area) {
  const rows = await get(`Op%20Earnings?area=eq.${encodeURIComponent(area)}&select=*&order=date.desc,id.desc`);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchOpResources(area) {
  const rows = await get(`Op%20Resources?area=eq.${encodeURIComponent(area)}&select=*&order=created_at.asc`);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchOpQuarterGoals(area, quarter, year) {
  const rows = await get(`Op%20Quarter%20Goals?area=eq.${encodeURIComponent(area)}&quarter=eq.${encodeURIComponent(quarter)}&year=eq.${year}&select=*`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function fetchOpQuarterlyUpdate(area, quarter, year) {
  const rows = await get(`Op%20Quarterly%20Updates?area=eq.${encodeURIComponent(area)}&quarter=eq.${encodeURIComponent(quarter)}&year=eq.${year}&select=*&order=date_submitted.desc&limit=1`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
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

// ── Reimbursements (shared "Op Budget" table — same one Portal's Financials
//    view manages) ───────────────────────────────────────────────────────────

export const REIMBURSEMENT_STATUSES = [
  'Draft', 'Submitted', 'Pending Review', 'More Information Needed', 'Approved', 'Paid', 'Denied',
];

// Same source Portal's own "Event Expenses"/"Event Earnings" forms suggest
// from: distinct event names already used in Op Budget/Op Earnings for the
// Events area (not the separate, no-longer-used "In-House Events" table).
export async function fetchEventNames() {
  const [budgetRows, earningsRows] = await Promise.all([
    get(`Op%20Budget?area=eq.Events&select=event_name`),
    get(`Op%20Earnings?area=eq.Events&select=event`),
  ]);
  const names = new Set();
  (Array.isArray(budgetRows) ? budgetRows : []).forEach(r => { if (r.event_name) names.add(r.event_name.trim()); });
  (Array.isArray(earningsRows) ? earningsRows : []).forEach(r => { if (r.event) names.add(r.event.trim()); });
  return Array.from(names).filter(Boolean).sort();
}

export async function fetchMyReimbursements(authUserId) {
  const rows = await get(`Op%20Budget?volunteer_auth_user_id=eq.${authUserId}&select=*&order=created_at.desc`);
  return Array.isArray(rows) ? rows : [];
}

export async function insertReimbursement(payload) {
  const rows = await post('Op%20Budget', payload);
  if (rows && rows.code) return { error: rows.message || rows.code };
  return { success: true, row: Array.isArray(rows) ? rows[0] : null };
}

export async function updateReimbursement(id, payload) {
  const rows = await patch(`Op%20Budget?id=eq.${id}`, payload);
  if (rows && rows.code) return { error: rows.message || rows.code };
  return { success: true, row: Array.isArray(rows) ? rows[0] : null };
}

export async function deleteReimbursement(id) {
  const ok = await del(`Op%20Budget?id=eq.${id}`);
  return { success: ok };
}

export function parseReceipts(receiptUrl) {
  if (!receiptUrl) return [];
  try {
    const p = JSON.parse(receiptUrl);
    if (Array.isArray(p)) return p;
  } catch { /* not JSON, single URL */ }
  return [receiptUrl];
}

export async function uploadReceiptFile(file, volunteerId) {
  const ext = (file.name.split('.').pop() || 'bin');
  const filename = `vh-${volunteerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const headers = await hdr({ 'Content-Type': file.type || 'application/octet-stream' });
  delete headers.Prefer;
  const res = await fetch(`${URL}/storage/v1/object/receipts/${filename}`, {
    method: 'POST',
    headers,
    body: file,
  });
  if (!res.ok) throw new Error('Receipt upload failed');
  return `${URL}/storage/v1/object/public/receipts/${filename}`;
}

export async function uploadReceiptFiles(files, volunteerId) {
  const urls = await Promise.all(files.map(f => uploadReceiptFile(f, volunteerId)));
  return urls.length === 1 ? urls[0] : JSON.stringify(urls);
}

// ── Activity log (surfaced in Portal's "Recent Activity" on the home page) ────

export async function logActivity({ vol, authUserId, action, description }) {
  const volunteerName = vol ? `${vol['First Name'] || ''} ${vol['Last Name'] || ''}`.trim() : null;
  return post('activity_log', {
    volunteer_name: volunteerName,
    volunteer_id: vol?.id ?? null,
    auth_user_id: authUserId,
    action,
    description,
  });
}

// ── Events Committee Planning Notes ────────────────────────────────────────

export async function fetchCommitteeEvents() {
  const rows = await get('events_committee?select=*&order=date.asc.nullslast');
  return Array.isArray(rows) ? rows : [];
}

export async function insertCommitteeEvent(payload) {
  const rows = await post('events_committee', payload);
  if (rows && rows.code) return { error: rows.message || rows.code };
  return { success: true, row: Array.isArray(rows) ? rows[0] : null };
}

export async function updateCommitteeEvent(id, payload) {
  const rows = await patch(`events_committee?id=eq.${id}`, payload);
  if (rows && rows.code) return { error: rows.message || rows.code };
  return { success: true, row: Array.isArray(rows) ? rows[0] : null };
}

export async function deleteCommitteeEvent(id) {
  const ok = await del(`events_committee?id=eq.${id}`);
  return { success: ok };
}


