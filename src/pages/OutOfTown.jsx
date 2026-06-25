import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchOotNotices, insertOotNotice } from '../lib/db.js';

const today = () => new Date().toISOString().slice(0, 10);

function Notice({ n, isActive }) {
  const s = new Date(n.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(n.end_date   + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      background: isActive ? '#fffbf0' : '#fff',
      border: `0.5px solid ${isActive ? '#e8d9b0' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '10px 12px',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
        {(n.name || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s} – {e}{isActive ? ' ✈️ Currently away' : ''}</div>
        {n.notes && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.notes}</div>}
      </div>
    </div>
  );
}

export default function OutOfTown() {
  const { volunteer } = useVol();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', start_date: today(), end_date: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchOotNotices().then(rows => {
      setNotices(Array.isArray(rows) ? rows : []);
      setLoading(false);
    });
  }, []);

  function openForm() {
    const fullName = `${volunteer['First Name'] || ''} ${volunteer['Last Name'] || ''}`.trim();
    setForm({ name: fullName, start_date: today(), end_date: '', notes: '' });
    setErr('');
    setSubmitted(false);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) { setErr('Name and dates are required.'); return; }
    if (form.end_date < form.start_date) { setErr('End date must be after start date.'); return; }
    setSaving(true); setErr('');
    const result = await insertOotNotice({ name: form.name, start_date: form.start_date, end_date: form.end_date, notes: form.notes || null });
    if (Array.isArray(result) && result[0]) {
      setNotices(prev => [...prev, result[0]].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setSubmitted(true);
      setShowForm(false);
    } else {
      setErr('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const nowStr = today();
  const current  = notices.filter(n => n.start_date <= nowStr && n.end_date >= nowStr);
  const upcoming = notices.filter(n => n.start_date > nowStr);
  const past     = notices.filter(n => n.end_date < nowStr);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Next 90 Days</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Out of Town</div>
        </div>
        <button onClick={openForm} className="btn-gold" style={{ fontSize: 12, padding: '7px 14px' }}>+ Post Mine</button>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {submitted && (
          <div style={{ background: '#e8f5e9', border: '0.5px solid #a5d6a7', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#2e7d32', marginBottom: 12 }}>
            ✓ Your OOT notice has been posted!
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Post Your Out-of-Town Notice</div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 10 }}>
                <div className="label">Your Name</div>
                <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Full name" />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label">Start Date</div>
                  <input className="input" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label">End Date</div>
                  <input className="input" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required min={form.start_date} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="label">Notes (optional)</div>
                <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. vacation, conference, family trip…" />
              </div>
              {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Posting…' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            {current.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Currently Away</div>
                {current.map((n, i) => <Notice key={i} n={n} isActive />)}
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: current.length > 0 ? 16 : 0, marginBottom: 8 }}>Coming Up</div>
                {upcoming.map((n, i) => <Notice key={i} n={n} isActive={false} />)}
              </>
            )}
            {current.length === 0 && upcoming.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13, fontStyle: 'italic' }}>
                No out-of-town notices in the next 90 days.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
