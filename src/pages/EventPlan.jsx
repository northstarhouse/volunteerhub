// Events Committee > 2027 Event Plan: the committee's confirmed list of events for the year (from the "2027 Events List"
// vote). Each event has a highlighted "Committee decisions" note, kept current after each meeting, and is finalized into a
// real Events Committee event once its date, start and end times, pricing and budget are filled in.
import { useState, useEffect } from 'react';
import { fetchEventPlan, updateEventPlanRow, insertCommitteeEvent, syncOverviewCardsFromCommittee, syncInHouseEvent, updateCommitteeEvent, logActivity } from '../lib/db.js';

const PLAN_YEAR = 2027;
const REQUIRED = [
  ['date', 'Date'], ['start_time', 'Start time'], ['end_time', 'End time'], ['pricing', 'Pricing'], ['budget', 'Budget'],
];
const fmtDay = (iso) => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
const fmtStamp = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const fmtTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const volName = (v) => v ? `${v['First Name'] || ''} ${v['Last Name'] || ''}`.trim() : '';

export default function EventPlan({ session, volunteer, onFinalized }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null); // id of the row being edited
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [collapsed, setCollapsed] = useState(true); // a dropdown: closed until clicked

  useEffect(() => { fetchEventPlan(PLAN_YEAR).then(setRows).catch(() => setRows([])); }, []);

  const missing = (r) => REQUIRED.filter(([k]) => !String(r[k] || '').trim()).map(([, label]) => label);

  function edit(r) {
    if (open === r.id) { setOpen(null); return; }
    setOpen(r.id); setErr('');
    setDraft({ date: r.date || '', start_time: r.start_time || '', end_time: r.end_time || '', pricing: r.pricing || '', budget: r.budget || '', decisions: r.decisions || '' });
  }

  async function save(r) {
    setBusy(r.id); setErr('');
    const body = { date: draft.date || null, start_time: draft.start_time || null, end_time: draft.end_time || null, pricing: draft.pricing.trim() || null, budget: draft.budget.trim() || null, updated_at: new Date().toISOString() };
    if ((draft.decisions || '').trim() !== (r.decisions || '').trim()) {
      body.decisions = draft.decisions.trim() || null;
      body.decisions_updated_at = new Date().toISOString();
      body.decisions_updated_by = volName(volunteer) || null;
    }
    const res = await updateEventPlanRow(r.id, body);
    setBusy('');
    if (!res) { setErr('Could not save. Please try again.'); return; }
    setRows(prev => prev.map(x => x.id === r.id ? res : x));
    setOpen(null);
  }

  async function finalize(r) {
    if (missing(r).length) return;
    if (!window.confirm(`Finalize "${r.name}" as a ${PLAN_YEAR} event? It will be added to the Events Committee events.`)) return;
    setBusy(r.id); setErr('');
    const name = /\b20\d\d\b/.test(r.name) ? r.name : `${r.name} ${PLAN_YEAR}`;
    const ins = await insertCommitteeEvent({
      name, date: r.date, start_time: r.start_time, end_time: r.end_time, pricing: r.pricing, status: 'planning',
      description: [r.budget ? `Budget: ${r.budget}` : '', r.decisions ? `Committee decisions: ${r.decisions}` : ''].filter(Boolean).join('\n\n'),
      checklist: [], vendors: [], timeline: [], after_notes: {}, created_by: session?.user?.id || null,
    });
    if (ins.error || !ins.row) {
      setBusy('');
      setErr(/duplicate|unique/i.test(ins.error || '') ? `An event named "${name}" already exists.` : `Could not finalize: ${ins.error || 'unknown error'}`);
      return;
    }
    const upd = await updateEventPlanRow(r.id, { finalized_event_id: ins.row.id, finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    setBusy('');
    if (upd) setRows(prev => prev.map(x => x.id === r.id ? upd : x));
    syncOverviewCardsFromCommittee([ins.row]).catch(() => {});
    syncInHouseEvent({ name: ins.row.name, date: ins.row.date }).then(ih => { if (ih?.id) updateCommitteeEvent(ins.row.id, { in_house_event_id: ih.id }); }).catch(() => {});
    logActivity({ vol: volunteer, authUserId: session?.user?.id, action: 'committee_event_added', description: `${PLAN_YEAR} Event Plan: finalized ${ins.row.name}` }).catch(() => {});
    if (onFinalized) onFinalized(ins.row);
  }

  const done = (rows || []).filter(r => r.finalized_event_id).length;
  const lab = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 };
  return (
    <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <button type="button" onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>{PLAN_YEAR} Event Plan</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rows ? `${done} of ${rows.length} finalized` : ''} {collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div style={{ borderTop: '0.5px solid var(--border-light)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 16px 4px' }}>The committee's confirmed events for {PLAN_YEAR}. Once an event has a date, start and end times, pricing and a budget, finalize it to add it to the events below.</div>
          {err && <div style={{ color: '#b3261e', fontSize: 12, padding: '4px 16px' }}>{err}</div>}
          {rows === null ? <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>Loading…</div> : rows.map((r, i) => {
            const need = missing(r);
            const finalized = !!r.finalized_event_id;
            return (
              <div key={r.id} style={{ padding: '12px 16px', borderTop: i ? '0.5px solid var(--border-light)' : 'none', opacity: finalized ? 0.75 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {[r.date ? fmtDay(r.date) : '', r.start_time ? `${fmtTime(r.start_time)}${r.end_time ? '–' + fmtTime(r.end_time) : ''}` : '', r.pricing ? `Pricing: ${r.pricing}` : '', r.budget ? `Budget: ${r.budget}` : ''].filter(Boolean).join(' · ') || 'No details yet'}
                    </div>
                  </div>
                  {finalized
                    ? <span style={{ fontSize: 11, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', borderRadius: 10, padding: '3px 10px' }}>✓ Finalized {fmtStamp(r.finalized_at)}</span>
                    : need.length
                      ? <span title={'Still needed: ' + need.join(', ')} style={{ fontSize: 11, fontWeight: 600, background: '#fff8e1', color: '#8a6200', borderRadius: 10, padding: '3px 10px' }}>Needs {need.join(', ').toLowerCase()}</span>
                      : <button type="button" className="btn-gold" disabled={busy === r.id} onClick={() => finalize(r)} style={{ fontSize: 12, padding: '6px 14px' }}>{busy === r.id ? 'Finalizing…' : 'Finalize event'}</button>}
                  {!finalized && <button type="button" className="btn-ghost" onClick={() => edit(r)} style={{ fontSize: 12, padding: '5px 12px' }}>{open === r.id ? 'Close' : 'Edit'}</button>}
                </div>

                {/* Committee decisions: the highlighted note */}
                {open !== r.id && (
                  <div style={{ marginTop: 8, background: '#fff8e1', borderLeft: '3px solid #e0a800', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8a6200', marginBottom: 3 }}>
                      Committee decisions{r.decisions_updated_at ? ` · as of ${fmtStamp(r.decisions_updated_at)}${r.decisions_updated_by ? ' (' + r.decisions_updated_by + ')' : ''}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: r.decisions ? '#3a332a' : '#b49a5a', whiteSpace: 'pre-wrap', fontStyle: r.decisions ? 'normal' : 'italic' }}>{r.decisions || 'No decisions recorded yet.'}</div>
                  </div>
                )}

                {open === r.id && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ ...lab, color: '#8a6200' }}>Committee decisions
                      <textarea className="input" rows={4} value={draft.decisions} onChange={e => setDraft({ ...draft, decisions: e.target.value })} placeholder="What the committee decided (format, lead, budget direction, open questions…)" style={{ background: '#fffbea', border: '1px solid #e8d48a', resize: 'vertical', fontFamily: 'inherit' }} />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                      <label style={lab}>Date<input className="input" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
                      <label style={lab}>Start time<input className="input" type="time" step="900" value={draft.start_time} onChange={e => setDraft({ ...draft, start_time: e.target.value })} /></label>
                      <label style={lab}>End time<input className="input" type="time" step="900" value={draft.end_time} onChange={e => setDraft({ ...draft, end_time: e.target.value })} /></label>
                      <label style={lab}>Pricing<input className="input" value={draft.pricing} onChange={e => setDraft({ ...draft, pricing: e.target.value })} placeholder="e.g. $25 / $15 members" /></label>
                      <label style={lab}>Budget<input className="input" value={draft.budget} onChange={e => setDraft({ ...draft, budget: e.target.value })} placeholder="e.g. $1,500" /></label>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn-gold" disabled={busy === r.id} onClick={() => save(r)} style={{ fontSize: 12, padding: '7px 16px' }}>{busy === r.id ? 'Saving…' : 'Save'}</button>
                      <button type="button" className="btn-ghost" onClick={() => setOpen(null)} style={{ fontSize: 12, padding: '7px 14px' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
