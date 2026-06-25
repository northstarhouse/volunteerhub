import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchAllActiveVolunteers, fetchOotNotices } from '../lib/db.js';

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

export default function Dashboard() {
  const { volunteer } = useVol();
  const [volunteers, setVolunteers] = useState([]);
  const [oot, setOot] = useState([]);
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
  }, []);

  return (
    <div>
      <PageHeader name={volunteer['First Name']} />
      <div style={{ padding: '14px 14px 0' }}>
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
