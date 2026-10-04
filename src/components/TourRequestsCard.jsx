import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { updateTourRequestStatus, updateTourRequestNotes, addTourToCalendar, setTourRequestCalendarEventId } from '../lib/db.js';

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
        if (res.eventId) setTourRequestCalendarEventId(request.id, res.eventId).catch(() => {});
        onScheduled?.(res.eventId);
      } else {
        setResult({ ok: false, error: res.error || 'Failed to add to calendar.' });
      }
    } catch {
      setResult({ ok: false, error: 'Could not confirm the calendar update. Check the calendar before trying again.' });
    } finally {
      setSaving(false);
    }
  }

  // request.calendar_event_id is the persisted record of a past success
  // (survives a reload); result.ok is this session's own fresh success
  // (carries the htmlLink the persisted id alone doesn't).
  if (result?.ok || request.calendar_event_id) {
    return (
      <div style={{ fontSize: 12, color: '#2e7d32', marginTop: 8 }}>
        ✓ Added to Calendar{result?.htmlLink && <> — <a href={result.htmlLink} target="_blank" rel="noreferrer" style={{ color: '#2e7d32' }}>view</a></>}
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
  const { volunteer, session } = useVol();
  const [items, setItems] = useState(requests);
  const [savingId, setSavingId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [savingNotesId, setSavingNotesId] = useState(null);
  const [editingNotesId, setEditingNotesId] = useState(null);

  useEffect(() => {
    setItems(requests);
    const drafts = {};
    requests.forEach(r => { drafts[r.id] = r.internal_notes || ''; });
    setNotesDraft(drafts);
  }, [requests]);

  async function handleStatusChange(id, value) {
    setSavingId(id);
    const ok = await updateTourRequestStatus(id, value || null, volunteer, session?.user?.id);
    if (ok) setItems(prev => prev.map(r => (r.id === id ? { ...r, tour_status: value || null } : r)));
    setSavingId(null);
  }

  function startEditingNotes(id) {
    setNotesDraft(prev => ({ ...prev, [id]: items.find(r => r.id === id)?.internal_notes || '' }));
    setEditingNotesId(id);
  }

  function cancelEditingNotes(id) {
    setNotesDraft(prev => ({ ...prev, [id]: items.find(r => r.id === id)?.internal_notes || '' }));
    setEditingNotesId(null);
  }

  async function handleSaveNotes(id) {
    if (savingNotesId === id) return;
    setSavingNotesId(id);
    const value = notesDraft[id] || '';
    const ok = await updateTourRequestNotes(id, value || null, volunteer, session?.user?.id);
    if (ok) {
      setItems(prev => prev.map(r => (r.id === id ? { ...r, internal_notes: value || null } : r)));
      setEditingNotesId(null);
    }
    setSavingNotesId(null);
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
            <AddToCalendarRow request={r} onScheduled={eventId => {
              setItems(prev => prev.map(x => (x.id === r.id ? { ...x, calendar_event_id: eventId || x.calendar_event_id } : x)));
              if (!r.tour_status) handleStatusChange(r.id, 'Scheduled Tour');
            }} />
            <div style={{ marginTop: 8 }}>
              {editingNotesId === r.id ? (
                <>
                  <textarea
                    value={notesDraft[r.id] || ''}
                    onChange={e => setNotesDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Add Internal Notes Here"
                    rows={2}
                    autoFocus
                    style={{ ...inputSm, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={() => cancelEditingNotes(r.id)} disabled={savingNotesId === r.id}
                      className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(r.id)}
                      disabled={savingNotesId === r.id}
                      className="btn-gold"
                      style={{ fontSize: 11, padding: '4px 10px', opacity: savingNotesId === r.id ? 0.6 : 1 }}
                    >
                      {savingNotesId === r.id ? 'Saving…' : 'Save Note'}
                    </button>
                  </div>
                </>
              ) : r.internal_notes ? (
                <div style={{ background: 'var(--light)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{r.internal_notes}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button type="button" onClick={() => startEditingNotes(r.id)} className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }}>
                      Edit Note
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => startEditingNotes(r.id)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>
                  + Add Note
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
