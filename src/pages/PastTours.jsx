import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchPastTourRequests, fetchPastPublicTourRsvps, setTourRequestArchived } from '../lib/db.js';
import { STATUS_COLORS, fmtWhen } from '../components/TourRequestsCard.jsx';

const GOLD = '#886c44';

function fmtTourDate(ymd, opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const sectionLabel = { fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 };

// Where tour requests go once they're done: archived by a docent from the
// Recent Tour Requests card, or moved here automatically the day after their
// scheduled tour date. Also keeps the RSVP lists of public tours already held
// (the dashboard's Public Tour RSVPs card only shows upcoming dates).
export default function PastTours() {
  const { volunteer, session, setView } = useVol();
  const [requests, setRequests] = useState(null);
  const [rsvps, setRsvps] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    fetchPastTourRequests().then(setRequests);
    fetchPastPublicTourRsvps().then(setRsvps);
  }, []);

  async function handleRestore(id) {
    if (restoringId) return;
    setRestoringId(id);
    const ok = await setTourRequestArchived(id, false, volunteer, session?.user?.id);
    if (ok !== false) setRequests(prev => prev.filter(r => r.id !== id));
    setRestoringId(null);
  }

  const today = todayYmd();
  const byDate = new Map();
  (rsvps || []).forEach(r => {
    const date = r.answers?.pt_tour_date;
    if (!date) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(r);
  });
  const dates = [...byDate.keys()].sort().reverse();

  return (
    <div>
      <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid var(--border-light)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Past Tours</div>
        <button type="button" onClick={() => setView('dashboard')} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>← Back</button>
      </div>
      <div style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="dashboard-grid">
        <div className="card">
          <div style={sectionLabel}>Tour Requests</div>
          {requests === null ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
          ) : requests.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No past tour requests yet.</div>
          ) : requests.map((r, i) => {
            const a = r.answers || {};
            const name = `${a.dt_first || ''} ${a.dt_last || ''}`.trim() || 'Someone';
            const statusStyle = r.tour_status ? (STATUS_COLORS[r.tour_status] || { bg: '#f0ebe2', color: GOLD }) : null;
            const toured = r.tour_date && r.tour_date < today;
            const last = i === requests.length - 1;
            return (
              <div key={r.id} style={{ marginBottom: last ? 0 : 14, paddingBottom: last ? 0 : 14, borderBottom: last ? 'none' : '0.5px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Requested {fmtWhen(r.created_at)}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {r.tour_date && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#f0ebe2', color: GOLD }}>
                      {toured ? 'Toured' : 'Tour'} {fmtTourDate(r.tour_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {statusStyle && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: statusStyle.bg, color: statusStyle.color }}>
                      {r.tour_status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  {a.dt_email && <div>{a.dt_email}</div>}
                  {a.dt_phone && <div>{a.dt_phone}</div>}
                  {a.dt_dates && <div>Preferred dates: {a.dt_dates}</div>}
                  {a.dt_count && <div>Participants: {a.dt_count}</div>}
                  {a.dt_notes && <div style={{ marginTop: 4, color: 'var(--text)' }}>{a.dt_notes}</div>}
                </div>
                {r.internal_notes && (
                  <div style={{ marginTop: 8, background: 'var(--light)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {r.internal_notes}
                  </div>
                )}
                {/* Only a hand-archived request can go back -- one whose tour
                    date has passed would just land here again. */}
                {r.archived_at && !toured && (
                  <button type="button" onClick={() => handleRestore(r.id)} disabled={restoringId === r.id}
                    className="btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                    {restoringId === r.id ? 'Restoring…' : 'Restore to Recent Tour Requests'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={sectionLabel}>Public Tours</div>
          {rsvps === null ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
          ) : dates.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No past public tours with RSVPs yet.</div>
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
                        {a.pt_email && <div><a href={`mailto:${a.pt_email}`} style={{ color: 'var(--gold)', wordBreak: 'break-all' }}>{a.pt_email}</a></div>}
                        {a.pt_notes && <div style={{ marginTop: 4, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{a.pt_notes}</div>}
                      </div>
                      <div style={{ color: 'var(--muted)', flexShrink: 0 }}>{a.pt_count || 1} {Number(a.pt_count) === 1 ? 'person' : 'people'}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
