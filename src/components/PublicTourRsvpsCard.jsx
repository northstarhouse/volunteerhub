import { useState, useEffect } from 'react';
import { fetchUpcomingPublicTourRsvps } from '../lib/db.js';

function fmtTourDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Who has RSVP'd for the upcoming public docent tours (2nd & 4th Thursday,
// 1-3 PM), from the public site's "View upcoming tour dates" pop-up. One list
// per tour date; past dates drop off automatically.
export default function PublicTourRsvpsCard() {
  const [rows, setRows] = useState(null);

  useEffect(() => { fetchUpcomingPublicTourRsvps().then(setRows); }, []);

  const byDate = new Map();
  (rows || []).forEach(r => {
    const date = r.answers?.pt_tour_date;
    if (!date) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(r);
  });
  const dates = [...byDate.keys()].sort();

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
        Public Tour RSVPs
      </div>
      {rows === null ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : dates.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No RSVPs for upcoming public tours yet.</div>
      ) : dates.map((date, i) => {
        const list = byDate.get(date);
        const total = list.reduce((n, r) => n + (Number(r.answers?.pt_count) || 0), 0);
        return (
          <div key={date} style={{ marginTop: i ? 16 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingBottom: 6, borderBottom: '0.5px solid var(--border-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmtTourDate(date)} · 1–3 PM</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{total} {total === 1 ? 'person' : 'people'}</div>
            </div>
            {list.map(r => {
              const a = r.answers || {};
              return (
                <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12, padding: '6px 0', borderBottom: '0.5px solid var(--border-light)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 500 }}>{a.pt_name || 'Someone'}</div>
                    {a.pt_email
                      ? <div><a href={`mailto:${a.pt_email}`} style={{ color: 'var(--gold)', wordBreak: 'break-all' }}>{a.pt_email}</a></div>
                      : <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No email given</div>}
                    {a.pt_notes && (
                      <div style={{ marginTop: 4, color: 'var(--text)', whiteSpace: 'pre-wrap', background: 'var(--bg)', borderLeft: '2px solid var(--gold)', padding: '4px 8px', borderRadius: 4 }}>
                        {a.pt_notes}
                      </div>
                    )}
                  </div>
                  <div style={{ color: 'var(--muted)', flexShrink: 0 }}>{a.pt_count || 1} {Number(a.pt_count) === 1 ? 'person' : 'people'}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
