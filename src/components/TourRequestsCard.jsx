import { useState, useEffect } from 'react';
import { updateTourRequestStatus, addTourToCalendar } from '../lib/db.js';

const GOLD = '#886c44';

const TOUR_STATUS_OPTIONS = ['Scheduled Tour', 'Contact Made', 'Dates Not Workable'];
const STATUS_COLORS = {
  'Scheduled Tour':      { bg: '#e8f5e9', color: '#2e7d32' },
  'Contact Made':        { bg: '#fff8e1', color: '#8a6200' },
  'Dates Not Workable':  { bg: '#ffebee', color: '#b71c1c' },
};

function fmtWhen(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return iso; }
}

const inputSm = { fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)', background: '#fff', color: 'var(--text)' };

function AddToCalendarRow({ request, onScheduled }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok: true, htmlLink } | { ok: false, error }

  const a = request.answers || {};
  const name = `${a.dt_first || ''} ${a.dt_last || ''}`.trim() || 'Someone';

  async function handleConfirm() {
    if (saving || !date || !time) return;
    setSaving(true);
    setResult(null);
    const description = [
      a.dt_email ? `Email: ${a.dt_email}` : null,
      a.dt_phone ? `Phone: ${a.dt_phone}` : null,
      a.dt_count ? `Participants: ${a.dt_count}` : null,
      a.dt_notes ? `Notes: ${a.dt_notes}` : null,
    ].filter(Boolean).join('\n');
    try {
      const res = await addTourToCalendar({
        summary: `Docent Tour with ${name}`,
        description,
        date,
        startTime: time,
        durationMin: 60,
      });
      if (res.ok) {
        setResult({ ok: true, htmlLink: res.htmlLink });
        setOpen(false);
        onScheduled?.();
      } else {
        setResult({ ok: false, error: res.error || 'Failed to add to calendar.' });
      }
    } catch {
      setResult({ ok: false, error: 'Could not confirm the calendar update. Check the calendar before trying again.' });
    } finally {
      setSaving(false);
    }
  }

  if (result?.ok) {
    return (
      <div style={{ fontSize: 12, color: '#2e7d32', marginTop: 8 }}>
        ✓ Added to calendar{result.htmlLink && <> — <a href={result.htmlLink} target="_blank" rel="noreferrer" style={{ color: '#2e7d32' }}>view</a></>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>
          + Add Scheduled Docent Tour to Calendar
        </button>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <input type="date" aria-label="Tour date" disabled={saving} value={date} onChange={e => setDate(e.target.value)} style={inputSm} />
          <input type="time" aria-label="Tour time" disabled={saving} value={time} onChange={e => setTime(e.target.value)} style={inputSm} />
          <button type="button" onClick={handleConfirm} disabled={saving || !date || !time} className="btn-gold" style={{ fontSize: 11, padding: '5px 12px', opacity: (saving || !date || !time) ? 0.6 : 1 }}>
            {saving ? 'Adding…' : 'Confirm'}
          </button>
          <button type="button" disabled={saving} onClick={() => { setOpen(false); setResult(null); }} className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>Cancel</button>
        </div>
      )}
      {result?.ok === false && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{result.error}</div>}
    </div>
  );
}

// Docents don't have Portal access, so this (shown on both their main
// Dashboard and their Docents area page) is the only place they can see --
// and now act on -- tour requests coming in from the public site's Docent
// Tour Form. Reads/writes nsh_form_responses directly (same table Portal's
// notification trigger inserts into), so it's always current.
export default function TourRequestsCard({ requests }) {
  const [items, setItems] = useState(requests);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => { setItems(requests); }, [requests]);

  async function handleStatusChange(id, value) {
    setSavingId(id);
    const ok = await updateTourRequestStatus(id, value || null);
    if (ok) setItems(prev => prev.map(r => (r.id === id ? { ...r, tour_status: value || null } : r)));
    setSavingId(null);
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
        Recent Tour Requests
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No tour requests yet.</div>
      ) : items.map((r, i) => {
        const a = r.answers || {};
        const name = `${a.dt_first || ''} ${a.dt_last || ''}`.trim() || 'Someone';
        const statusStyle = r.tour_status ? (STATUS_COLORS[r.tour_status] || { bg: '#f0ebe2', color: GOLD }) : null;
        return (
          <div key={r.id} style={{ marginBottom: i < items.length - 1 ? 14 : 0, paddingBottom: i < items.length - 1 ? 14 : 0, borderBottom: i < items.length - 1 ? '0.5px solid var(--border-light)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{fmtWhen(r.created_at)}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {a.dt_email && <div>{a.dt_email}</div>}
              {a.dt_phone && <div>{a.dt_phone}</div>}
              {a.dt_dates && <div>Preferred dates: {a.dt_dates}</div>}
              {a.dt_count && <div>Participants: {a.dt_count}</div>}
              {a.dt_notes && <div style={{ marginTop: 4, color: 'var(--text)' }}>{a.dt_notes}</div>}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={r.tour_status || ''}
                disabled={savingId === r.id}
                onChange={e => handleStatusChange(r.id, e.target.value)}
                style={{
                  fontSize: 12, fontWeight: statusStyle ? 600 : 400, padding: '5px 8px', borderRadius: 6,
                  border: statusStyle ? '1px solid transparent' : '0.5px solid var(--border)',
                  background: statusStyle ? statusStyle.bg : '#fff',
                  color: statusStyle ? statusStyle.color : 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <option value="">Set status…</option>
                {TOUR_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {savingId === r.id && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Saving…</span>}
            </div>
            <AddToCalendarRow request={r} onScheduled={() => { if (!r.tour_status) handleStatusChange(r.id, 'Scheduled Tour'); }} />
          </div>
        );
      })}
    </div>
  );
}
