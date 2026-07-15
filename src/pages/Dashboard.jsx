import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import {
  fetchAllActiveVolunteers, fetchOotNotices, fetchCalendarEvents, parseIcalDate, photoUrl,
  matchVolunteerAreas, AREA_DEFAULTS, currentQuarterStr, fetchOpBudget, fetchOpQuarterGoals,
  fetchHours, getVolunteerHours, MONTHS, getZodiacSign,
} from '../lib/db.js';

const GOLD = '#886c44';

function PageHeader({ name }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid var(--border-light)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 4 }}>{today}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--text)' }}>
        Hey, {name}
      </div>
    </div>
  );
}

const EVENT_TYPE = (title) => {
  const tl = title.toLowerCase();
  if (/docent/.test(tl))                             return { label: 'Docent Tour', color: '#2e7d32', bg: '#e8f5e9' };
  if (/estate|walk.?thr|sierra|tour/.test(tl))        return { label: 'Estate Tour', color: '#c2185b', bg: '#fce4ec' };
  if (/wedding/.test(tl))                             return { label: 'Wedding',     color: '#b71c1c', bg: '#ffebee' };
  if (/committee/.test(tl))                           return { label: 'Committee',   color: '#e65100', bg: '#fff3e0' };
  if (/meeting/.test(tl))                             return { label: 'Meeting',     color: '#8a6200', bg: '#fff9c4' };
  if (/creative|class/.test(tl))                      return { label: 'Creative',    color: '#00838f', bg: '#e0f7fa' };
  if (/event|party|\(j\)|\(s\)/.test(tl))             return { label: 'Event',       color: '#1565c0', bg: '#e3f2fd' };
  return { label: 'Other', color: GOLD, bg: '#f0ebe2' };
};

function ThisWeekCard({ events }) {
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="card" style={{ height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        This Week at North Star House
      </div>
      {events === null && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>}
      {events !== null && events.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No upcoming events in the next 2 weeks.</div>
      )}
      {events !== null && events.map((ev, i) => {
        const start = parseIcalDate(ev['DTSTART']);
        const isAllDay = ev['DTSTART'] && ev['DTSTART'].replace(/[^0-9TZ]/g, '').length === 8;
        const dayStr = start ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
        const isToday = dayStr === todayStr;
        const end = ev['DTEND'] ? parseIcalDate(ev['DTEND']) : null;
        const fmt = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const timeStr = isAllDay ? 'All day' : (end && end > start) ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
        const title = (ev['SUMMARY'] || 'Untitled').replace(/\\,/g, ',').replace(/\\n/g, ' ');
        const { label, color, bg } = EVENT_TYPE(title);
        return (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            marginBottom: i < events.length - 1 ? 10 : 0,
            background: isToday ? '#fffbf0' : 'transparent',
            border: isToday ? '0.5px solid #e8d9b0' : 'none',
            borderRadius: isToday ? 8 : 0,
            padding: isToday ? '8px 10px' : '2px 0',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: 'var(--text)' }}>{title}</span>
                {isToday && <span style={{ fontSize: 10, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8 }}>Today</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{dayStr}{timeStr !== 'All day' ? ` · ${timeStr}` : ''}</div>
            </div>
            <span style={{ fontSize: 11, background: bg, color, borderRadius: 20, fontWeight: 500, flexShrink: 0, padding: '2px 10px', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
      {events !== null && events.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--border-light)', fontSize: 11, color: 'var(--muted)' }}>Synced from Google Calendar</div>
      )}
    </div>
  );
}

function Avatar({ v, size = 36 }) {
  const initials = `${(v['First Name'] || '')[0] || ''}${(v['Last Name'] || '')[0] || ''}`.toUpperCase();
  const url = photoUrl(v['Picture URL']);
  return url ? (
    <img src={url} alt={initials} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
      {initials || '?'}
    </div>
  );
}

function HoursBar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 5, background: 'var(--light)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: GOLD, borderRadius: 3 }} />
    </div>
  );
}

function HoursSnapshotCard({ data }) {
  const monthsWithHours = data ? MONTHS.map(m => ({ m, h: data.months[m] || 0 })).filter(x => x.h > 0) : [];
  const maxMonth = monthsWithHours.length > 0 ? Math.max(...monthsWithHours.map(x => x.h)) : 0;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
          {new Date().getFullYear()} Hours
        </div>
        {data === null ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: GOLD, lineHeight: 1 }}>
              {data.total % 1 === 0 ? data.total : data.total.toFixed(1)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>hours volunteered so far</div>
          </>
        )}
      </div>

      {monthsWithHours.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--border-light)' }}>
          {MONTHS.map(m => {
            const h = data.months[m] || 0;
            if (h === 0) return null;
            return (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, fontSize: 10.5, color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>{m}</div>
                <HoursBar value={h} max={maxMonth} />
                <div style={{ width: 30, fontSize: 11.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
                  {h % 1 === 0 ? h : h.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BirthdayCard({ volunteers }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = volunteers
    .filter(v => v['Birthday'])
    .map(v => {
      const parts = v['Birthday'].split('-');
      if (parts.length < 3) return null;
      const mo = parseInt(parts[1]) - 1, dy = parseInt(parts[2]);
      let bday = new Date(today.getFullYear(), mo, dy);
      if (bday < today) bday = new Date(today.getFullYear() + 1, mo, dy);
      return { ...v, _bday: bday, _days: Math.round((bday - today) / 86400000), _zodiac: getZodiacSign(mo + 1, dy) };
    })
    .filter(Boolean)
    .filter(v => v._days <= 30)
    .sort((a, b) => a._days - b._days)
    .slice(0, 6);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Upcoming Birthdays
      </div>
      {upcoming.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No birthdays in the next 30 days.</div>
      ) : upcoming.map((v, i) => {
        const isToday = v._days === 0;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: i < upcoming.length - 1 ? 10 : 0,
            background: isToday ? '#fffbf0' : 'transparent',
            border: isToday ? '0.5px solid #e8d9b0' : 'none',
            borderRadius: isToday ? 8 : 0,
            padding: isToday ? '8px 10px' : '2px 0',
          }}>
            <Avatar v={v} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v['First Name']} {v['Last Name']}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {v._bday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{isToday ? ' 🎂' : ''}
                {v._zodiac && <span style={{ fontStyle: 'italic', opacity: 0.65 }}> · <span style={{ color: GOLD }}>{v._zodiac.symbol}</span> {v._zodiac.name}</span>}
              </div>
            </div>
            {!isToday && <span style={{ fontSize: 10, fontWeight: 600, color: v._days <= 7 ? GOLD : 'var(--muted)', flexShrink: 0 }}>
              {v._days === 1 ? 'Tomorrow' : `${v._days}d`}
            </span>}
          </div>
        );
      })}
    </div>
  );
}

function OotCard({ notices }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const current  = notices.filter(n => new Date(n.start_date + 'T12:00:00') <= today && new Date(n.end_date + 'T12:00:00') >= today);
  const upcoming = notices.filter(n => new Date(n.start_date + 'T12:00:00') > today).slice(0, 4);
  const all = [...current.map(n => ({ ...n, _active: true })), ...upcoming.map(n => ({ ...n, _active: false }))];

  function fmtRange(n) {
    const s = new Date(n.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(n.end_date   + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  }

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.48 2 2 0 0 1 3.58 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l1.12-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Out of Town
      </div>
      {all.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No one out of town right now.</div>
      ) : all.map((n, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: i < all.length - 1 ? 10 : 0,
          background: n._active ? '#fffbf0' : 'transparent',
          border: n._active ? '0.5px solid #e8d9b0' : 'none',
          borderRadius: n._active ? 8 : 0,
          padding: n._active ? '8px 10px' : '2px 0',
        }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
            {(n.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{fmtRange(n)}{n._active ? ' ✈️' : ''}</div>
            {n.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const GOAL_STATUS_COLORS = {
  'On Track': { bg: '#e8f5e9', color: '#2e7d32' },
  'At Risk':  { bg: '#fff8e1', color: '#8a6200' },
  'Behind':   { bg: '#ffebee', color: '#b71c1c' },
  'Off Track': { bg: '#ffebee', color: '#b71c1c' },
};

function MyAreaCard({ area, onOpen }) {
  const [budget, setBudget] = useState(null);
  const [goals, setGoals]   = useState(null);

  useEffect(() => {
    Promise.all([
      fetchOpBudget(area),
      fetchOpQuarterGoals(area, currentQuarterStr(), new Date().getFullYear()),
    ]).then(([budgetRows, goalRow]) => {
      setBudget(Array.isArray(budgetRows) ? budgetRows : []);
      setGoals(goalRow);
    });
  }, [area]);

  const spent = (budget || []).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const allocation = AREA_DEFAULTS[area]?.budget ?? null;
  const pct = allocation ? Math.min(100, Math.round((spent / allocation) * 100)) : 0;
  const goalList = goals ? [goals.goal_1, goals.goal_2, goals.goal_3].filter(Boolean) : [];
  const goalStatuses = goals ? [goals.goal_1_status, goals.goal_2_status, goals.goal_3_status] : [];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8 }}>My Area · {area}</div>
        <button onClick={onOpen} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View Full Area →</button>
      </div>

      {allocation != null && (
        <div style={{ marginBottom: goalList.length ? 12 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Budget</span>
            <span>{'$' + spent.toLocaleString()} / {'$' + allocation.toLocaleString()}</span>
          </div>
          <div style={{ height: 6, background: '#f0ebe2', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: GOLD, borderRadius: 4 }} />
          </div>
        </div>
      )}

      {goalList.length > 0 && (
        <div>
          {goalList.map((g, i) => {
            const s = GOAL_STATUS_COLORS[goalStatuses[i]] || { bg: '#f0ebe2', color: GOLD };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: i < goalList.length - 1 ? 6 : 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{g}</div>
                {goalStatuses[i] && <span style={{ fontSize: 9, fontWeight: 600, background: s.bg, color: s.color, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>{goalStatuses[i]}</span>}
              </div>
            );
          })}
        </div>
      )}

      {goalList.length === 0 && allocation == null && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No goals set for this quarter yet.</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { volunteer, openArea } = useVol();
  const [volunteers, setVolunteers] = useState([]);
  const [oot, setOot]               = useState([]);
  const [calEvents, setCalEvents]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [hoursData, setHoursData]   = useState(null);

  useEffect(() => {
    Promise.all([fetchAllActiveVolunteers(), fetchOotNotices()]).then(([vols, notices]) => {
      setVolunteers(Array.isArray(vols) ? vols : []);
      setOot(Array.isArray(notices) ? notices : []);
      setLoading(false);
    });

    fetchHours().then(map => {
      const data = getVolunteerHours(map, volunteer['First Name'], volunteer['Last Name']);
      setHoursData(data || { total: 0, months: {} });
    }).catch(() => setHoursData({ total: 0, months: {} }));

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 14 * 86400000);
    fetchCalendarEvents()
      .then(events => {
        const filtered = events
          .filter(ev => { const s = parseIcalDate(ev['DTSTART']); return s && s >= now && s <= windowEnd; })
          .sort((a, b) => parseIcalDate(a['DTSTART']) - parseIcalDate(b['DTSTART']))
          .slice(0, 12);
        setCalEvents(filtered);
      })
      .catch(() => setCalEvents([]));
  }, []);

  const myAreas = matchVolunteerAreas(volunteer.Team);

  return (
    <div>
      <PageHeader name={volunteer['First Name']} />
      <div style={{ padding: '16px 20px 24px' }}>
        {/* Two-column on desktop, stacked on mobile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0,1fr)',
          gap: 16,
          alignItems: 'start',
        }}
          className="dashboard-grid"
        >
          {/* Left: Hours snapshot + My Area cards */}
          <div>
            <HoursSnapshotCard data={hoursData} />
            {myAreas.map(area => (
              <MyAreaCard key={area} area={area} onOpen={() => openArea(area)} />
            ))}
          </div>

          {/* Right: Calendar, Birthdays, OOT stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ThisWeekCard events={calEvents} />
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Loading…</div>
            ) : (
              <>
                <BirthdayCard volunteers={volunteers} />
                <OotCard notices={oot} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
