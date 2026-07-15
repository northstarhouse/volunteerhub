import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import {
  OPERATIONAL_AREAS,
  fetchInHouseEvents,
  fetchMyReimbursements,
  insertReimbursement,
  updateReimbursement,
  deleteReimbursement,
  uploadReceiptFiles,
  parseReceipts,
} from '../lib/db.js';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLE = {
  'Draft':                    { bg: '#f0ebe2', fg: '#888' },
  'Submitted':                { bg: '#e6f0fb', fg: '#1d4ed8' },
  'Pending Review':           { bg: '#fdf3e0', fg: '#92600c' },
  'More Information Needed':  { bg: '#fde8e0', fg: '#c2410c' },
  'Approved':                 { bg: '#e3f6ec', fg: '#15803d' },
  'Paid':                     { bg: '#e3f6ec', fg: '#15803d' },
  'Denied':                   { bg: '#fbe4e4', fg: '#c0392b' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Submitted'];
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{status}</span>;
}

const emptyForm = {
  description: '',
  amount: '',
  date: today(),
  areaType: 'Operational Area',
  operationalArea: OPERATIONAL_AREAS[0],
  eventName: '',
  notes: '',
};

function ReimbursementForm({ vol, session, events, editing, onDone, onCancel }) {
  const [form, setForm] = useState(() => editing ? {
    description: editing.description || '',
    amount: editing.amount != null ? String(editing.amount) : '',
    date: editing.date || today(),
    areaType: editing.event_name ? 'Event' : 'Operational Area',
    operationalArea: editing.event_name ? OPERATIONAL_AREAS[0] : (editing.area || OPERATIONAL_AREAS[0]),
    eventName: editing.event_name || '',
    notes: editing.notes || '',
  } : emptyForm);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const canSubmit = form.description.trim()
    && Number(form.amount) > 0
    && form.date
    && (form.areaType === 'Operational Area' ? form.operationalArea : form.eventName);

  function buildPayload(status) {
    const fullName = `${vol['First Name'] || ''} ${vol['Last Name'] || ''}`.trim();
    return {
      area: form.areaType === 'Event' ? 'Events' : form.operationalArea,
      event_name: form.areaType === 'Event' ? form.eventName : null,
      type: 'Purchase',
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      date: form.date,
      notes: form.notes.trim() || null,
      volunteer_name: fullName,
      volunteer_auth_user_id: session.user.id,
      volunteer_id: vol.id,
      needs_reimbursement: status !== 'Draft',
      status,
      submitted_at: status === 'Draft' ? null : new Date().toISOString(),
    };
  }

  async function handleSave(status) {
    if (status !== 'Draft' && !canSubmit) return;
    setSaving(true); setErr('');
    try {
      let row = editing;
      const payload = buildPayload(status);

      if (editing) {
        const res = await updateReimbursement(editing.id, payload);
        if (res.error) throw new Error(res.error);
        row = res.row || { ...editing, ...payload };
      } else {
        const res = await insertReimbursement(payload);
        if (res.error) throw new Error(res.error);
        row = res.row;
      }

      if (files.length && row) {
        const receiptVal = await uploadReceiptFiles(files, vol.id);
        const res2 = await updateReimbursement(row.id, { receipt_url: receiptVal });
        if (!res2.error && res2.row) row = res2.row;
      }

      setSaving(false);
      onDone(row);
    } catch (e) {
      setErr(e.message || 'Failed to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        {editing ? 'Edit Reimbursement Request' : 'New Reimbursement Request'}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="label">Expense Description</div>
        <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What was the purchase or expense for?" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="label">Amount</div>
          <input className="input" type="number" step="0.01" min="0" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">Date of Purchase</div>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="label">Budget Area</div>
        <select className="input" style={{ appearance: 'auto' }} value={form.areaType}
          onChange={e => setForm(f => ({ ...f, areaType: e.target.value }))}>
          <option value="Operational Area">Operational Area</option>
          <option value="Event">Events</option>
        </select>
      </div>

      {form.areaType === 'Operational Area' ? (
        <div style={{ marginBottom: 10 }}>
          <div className="label">Operational Area</div>
          <select className="input" style={{ appearance: 'auto' }} value={form.operationalArea}
            onChange={e => setForm(f => ({ ...f, operationalArea: e.target.value }))}>
            {OPERATIONAL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <div className="label">Event</div>
          <select className="input" style={{ appearance: 'auto' }} value={form.eventName}
            onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))}>
            <option value="">Select an event…</option>
            {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}{ev.date ? ` — ${ev.date}` : ''}</option>)}
          </select>
          {events.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>No events found. You can still describe it in Additional Notes.</div>}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div className="label">Receipts</div>
        <input className="input" type="file" accept="image/*,application/pdf" multiple
          onChange={e => setFiles(Array.from(e.target.files || []))} style={{ padding: 7 }} />
        {editing?.receipt_url && files.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {parseReceipts(editing.receipt_url).length} receipt(s) already attached. Choosing new files will add more.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="label">Additional Notes (optional)</div>
        <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any extra context for reviewers" style={{ resize: 'vertical' }} />
      </div>

      {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => handleSave('Draft')} disabled={saving || !form.description.trim()}>
          {saving ? 'Saving…' : 'Save as Draft'}
        </button>
        <button type="button" className="btn-gold" style={{ flex: 2 }} onClick={() => handleSave('Submitted')} disabled={saving || !canSubmit}>
          {saving ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}

function ReimbursementRow({ item, onEdit, onWithdraw }) {
  const receipts = parseReceipts(item.receipt_url);
  const canEdit = item.status === 'Draft' || item.status === 'More Information Needed';

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{item.description || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {item.event_name || item.area} · {item.date}
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
          ${(parseFloat(item.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <StatusBadge status={item.status} />
        {receipts.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {item.notes && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>"{item.notes}"</div>
      )}

      {item.status === 'More Information Needed' && item.reviewer_notes && (
        <div style={{ fontSize: 12, color: '#c2410c', background: '#fde8e0', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
          <strong>Reviewer:</strong> {item.reviewer_notes}
        </div>
      )}
      {item.status === 'Denied' && item.reviewer_notes && (
        <div style={{ fontSize: 12, color: '#c0392b', background: '#fbe4e4', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
          <strong>Reason:</strong> {item.reviewer_notes}
        </div>
      )}

      {(canEdit || receipts.length > 0) && (
        <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
          {receipts.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--gold)' }}>View receipt{receipts.length > 1 ? ` ${i + 1}` : ''}</a>
          ))}
          {canEdit && <button onClick={() => onEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', padding: 0 }}>Edit</button>}
          {item.status === 'Draft' && <button onClick={() => onWithdraw(item)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, cursor: 'pointer', padding: 0 }}>Delete Draft</button>}
        </div>
      )}
    </div>
  );
}

export default function Reimbursements() {
  const { volunteer, session } = useVol();
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  function load() {
    setLoading(true);
    fetchMyReimbursements(session.user.id).then(rows => {
      setItems(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetchInHouseEvents().then(setEvents);
  }, []);

  function handleDone(row) {
    setShowForm(false);
    setEditing(null);
    load();
  }

  function handleEdit(item) {
    setEditing(item);
    setShowForm(true);
  }

  async function handleWithdraw(item) {
    if (!confirm('Delete this draft request?')) return;
    await deleteReimbursement(item.id);
    load();
  }

  const totalPending = items
    .filter(i => ['Submitted', 'Pending Review', 'More Information Needed', 'Approved'].includes(i.status))
    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div>
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Expenses</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Reimbursements</div>
        </div>
        {!showForm && (
          <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}>+ New Request</button>
        )}
      </div>

      <div style={{ padding: '14px 14px 24px' }}>
        {showForm && (
          <ReimbursementForm
            vol={volunteer}
            session={session}
            events={events}
            editing={editing}
            onDone={handleDone}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        {!loading && totalPending > 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending across your submitted requests
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
        ) : items.length === 0 && !showForm ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No reimbursement requests yet.
          </div>
        ) : (
          items.map(item => (
            <ReimbursementRow key={item.id} item={item} onEdit={handleEdit} onWithdraw={handleWithdraw} />
          ))
        )}
      </div>
    </div>
  );
}
