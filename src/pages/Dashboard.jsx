import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchAllActiveVolunteers, fetchOotNotices, fetchCalendarEvents, parseIcalDate } from '../lib/db.js';

function PageHeader({ name }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div style={{ padding: '22px 18px 10px', borderBottom: '0.5px solid var(--border-light)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 4 }}>{today}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--text)' }}>
        Hey, {name} 👋
      </div>
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
      const mo = parseInt(parts[1]) - 1;
      const dy = parseInt(parts[2]);
      let bday = new Date(today.getFullYear(), mo, dy);
      if (bday < today) bday = new Date(today.getFullYear() + 1, mo, dy);
      const days = Math.round((bday - today) / 86400000);
      return { ...v, _bday: bday, _days: days };
    })
    .filter(Boolean)
    .sort((a, b) => a._days - b._days)
    .slice(0, 5);

  function fmtDate(bday) {
    return bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        🎂 Upcoming Birthdays
      </div>
      {upcoming.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No birthdays in the next 30 days.</div>
      ) : (
        upcoming.map((v, i) => {
          const isToday = v._days === 0;
          const isSoon  = v._days <= 7;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < upcoming.length - 1 ? 10 : 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: isToday ? 'var(--gold)' : 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isToday ? '#fff' : 'var(--gold)', flexShrink: 0 }}>
                {(v['First Name'] || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v['First Name']} {v['Last Name']}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(v._bday)}</div>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 12,
                background: isToday ? '#fff3cd' : isSoon ? '#f0ebe2' : 'transparent',
                color: isToday ? '#8a6200' : isSoon ? 'var(--gold)' : 'var(--muted)',
              }}>
                {isToday ? '🎉 Today!' : v._days === 1 ? 'Tomorrow' : `${v._days} days`}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function OotCard({ notices }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const current  = notices.filter(n => new Date(n.start_date + 'T12:00:00') <= today && new Date(n.end_date + 'T12:00:00') >= today);
  const upcoming = notices.filter(n => new Date(n.start_date + 'T12:00:00') > today).slice(0, 4);

  function fmtRange(n) {
    const s = new Date(n.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(n.end_date   + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  }

  const all = [...current.map(n => ({ ...n, _active: true })), ...upcoming.map(n => ({ ...n, _active: false }))];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        ✈️ Out of Town
      </div>
      {all.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No one out of town right now.</div>
      ) : (
        all.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < all.length - 1 ? 10 : 0, background: n._active ? '#fffbf0' : 'transparent', border: n._active ? '0.5px solid #e8d9b0' : 'none', borderRadius: n._active ? 8 : 0, padding: n._active ? '8px 10px' : '2px 0' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
              {(n.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtRange(n)}{n._active ? ' ✈️' : ''}</div>
              {n.notes && <div style={{ fontSize: 11, color: '#bbb', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.notes}</div>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const GOLD = '#886c44';

const EVENT_TYPE = (title) => {
  const tl = title.toLowerCase();
  if (/docent/.test(tl))                         return { label: 'Docent Tour', color: '#2e7d32', bg: '#e8f5e9' };
  if (/estate|walk.?thr|sierra|\(j\)|tour/.test(tl)) return { label: 'Estate Tour', color: '#c2185b', bg: '#fce4ec' };
  if (/wedding/.test(tl))                         return { label: 'Wedding',    color: '#b71c1c', bg: '#ffebee' };
  if (/committee/.test(tl))                       return { label: 'Committee',  color: '#e65100', bg: '#fff3e0' };
  if (/meeting/.test(tl))                         return { label: 'Meeting',    color: '#8a6200', bg: '#fff9c4' };
  if (/creative|class/.test(tl))                  return { label: 'Creative',   color: '#00838f', bg: '#e0f7fa' };
  if (/event|party/.test(tl))                     return { label: 'Event',      color: '#1565c0', bg: '#e3f2fd' };
  return { label: 'Other', color: GOLD, bg: '#f0ebe2' };
};

function ThisWeekCard({ events }) {
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        This Week at North Star House
      </div>
      {events === null && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>}
      {events !== null && events.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No upcoming events in the next 2 weeks.</div>}
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
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < events.length - 1 ? 10 : 0, background: isToday ? '#fffbf0' : 'transparent', border: isToday ? '0.5px solid #e8d9b0' : 'none', borderRadius: isToday ? 8 : 0, padding: isToday ? '8px 10px' : '2px 0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: 'var(--text)' }}>{title}</span>
                {isToday && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Today</span>}
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

export default function Dashboard() {
  const { volunteer } = useVol();
  const [volunteers, setVolunteers] = useState([]);
  const [oot, setOot] = useState([]);
  const [calEvents, setCalEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAllActiveVolunteers(),
      fetchOotNotices(),
    ]).then(([vols, notices]) => {
      setVolunteers(Array.isArray(vols) ? vols : []);
      setOot(Array.isArray(notices) ? notices : []);
      setLoading(false);
    });

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 14 * 86400000);
    fetchCalendarEvents().then(events => {
      const filtered = events
        .filter(ev => {
          const s = parseIcalDate(ev['DTSTART']);
          return s && s >= now && s <= windowEnd;
        })
        .sort((a, b) => parseIcalDate(a['DTSTART']) - parseIcalDate(b['DTSTART']))
        .slice(0, 10);
      setCalEvents(filtered);
    }).catch(() => setCalEvents([]));
  }, []);

  return (
    <div>
      <PageHeader name={volunteer['First Name']} />
      <div style={{ padding: '14px 14px 0' }}>
        <ThisWeekCard events={calEvents} />
        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 30 }}>Loading…</div>
        ) : (
          <>
            <BirthdayCard volunteers={volunteers} />
            <OotCard notices={oot} />
          </>
        )}
      </div>
    </div>
  );
}
