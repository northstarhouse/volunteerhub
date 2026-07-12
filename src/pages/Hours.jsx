import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchHours, getVolunteerHours, insertManualHours, MONTHS, DUTY_LABELS } from '../lib/db.js';

function Bar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 6, background: 'var(--light)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function AddMissedHoursCard({ vol, onSaved }) {
  const fullName = `${vol['First Name'] || ''} ${vol['Last Name'] || ''}`.trim();
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ duty: 'other', date: today(), useSpecificTimes: false, hours: '', startTime: '', endTime: '' });
  const [saving, setSaving]       = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr]             = useState('');

  function openForm() {
    setForm({ duty: 'other', date: today(), useSpecificTimes: false, hours: '', startTime: '', endTime: '' });
    setErr('');
    setSubmitted(false);
    setShowForm(true);
  }

  const canSubmit = form.date && (form.useSpecificTimes
    ? form.startTime && form.endTime && form.endTime > form.startTime
    : Number(form.hours) > 0 && Number(form.hours) <= 12);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setErr('');
    const result = await insertManualHours(fullName, DUTY_LABELS[form.duty] || DUTY_LABELS.other, form);
    if (result.success) {
      setShowForm(false);
      setSubmitted(true);
      onSaved?.();
    } else {
      setErr(result.error || 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm || submitted ? 12 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Missed Hours</div>
        {!showForm && <button onClick={openForm} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Add Missed Hours</button>}
      </div>

      {submitted && !showForm && (
        <div style={{ fontSize: 12, color: '#2e7d32' }}>✓ Your hours have been added.</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div className="label">Area</div>
            <select className="input" value={form.duty} onChange={e => setForm(p => ({ ...p, duty: e.target.value }))} style={{ appearance: 'auto' }}>
              {Object.keys(DUTY_LABELS).map(k => <option key={k} value={k}>{DUTY_LABELS[k]}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="label">Date</div>
            <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="label">Entry Type</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setForm(p => ({ ...p, useSpecificTimes: false }))}
                className={form.useSpecificTimes ? 'btn-ghost' : 'btn-gold'} style={{ flex: 1, fontSize: 12, padding: '7px 0' }}>
                Date + Hours
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, useSpecificTimes: true }))}
                className={form.useSpecificTimes ? 'btn-gold' : 'btn-ghost'} style={{ flex: 1, fontSize: 12, padding: '7px 0' }}>
                Date + Time
              </button>
            </div>
          </div>

          {form.useSpecificTimes ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="label">Start Time</div>
                <input className="input" type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">End Time</div>
                <input className="input" type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div className="label">Total Hours</div>
              <input className="input" type="number" min="0.5" max="12" step="0.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} placeholder="Example: 3.5" required />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>When using Date + Hours, check-in is set to 9:00 AM on that date.</div>
            </div>
          )}

          {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" disabled={saving || !canSubmit} style={{ flex: 2 }}>{saving ? 'Saving…' : 'Add Hours'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Hours() {
  const { volunteer } = useVol();
  const [hoursMap, setHoursMap] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  function loadHours() {
    fetchHours().then(map => {
      setHoursMap(map);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }

  useEffect(() => { loadHours(); }, []);

  const data = hoursMap && !loading
    ? getVolunteerHours(hoursMap, volunteer['First Name'], volunteer['Last Name'])
    : null;

  const monthsWithHours = data
    ? MONTHS.map(m => ({ m, h: data.months[m] || 0 })).filter(x => x.h > 0)
    : [];
  const maxMonth = monthsWithHours.length > 0 ? Math.max(...monthsWithHours.map(x => x.h)) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>
          {new Date().getFullYear()} Log
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>My Hours</div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Loading hours…</div>
        )}

        {error && (
          <div className="card">
            <div style={{ fontSize: 13, color: '#c0392b', textAlign: 'center' }}>
              Couldn't load hours right now. Please try again later.
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Total */}
            <div className="card" style={{ marginBottom: 14, textAlign: 'center' }}>
              {data ? (
                <>
                  <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)', lineHeight: 1 }}>
                    {data.total % 1 === 0 ? data.total : data.total.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>hours volunteered in {new Date().getFullYear()}</div>
                  {data.total > 0 && (
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                      That's roughly {Math.round(data.total / 8)} full days of impact. Thank you!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--border)', lineHeight: 1 }}>—</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>No hours logged yet for {new Date().getFullYear()}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                    Hours are tracked at the kiosk. Check in at your next shift!
                  </div>
                </>
              )}
            </div>

            {/* Monthly breakdown */}
            {monthsWithHours.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Monthly Breakdown</div>
                {MONTHS.map(m => {
                  const h = data?.months[m] || 0;
                  if (h === 0) return null;
                  return (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 28, fontSize: 11, color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>{m}</div>
                      <Bar value={h} max={maxMonth} />
                      <div style={{ width: 34, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
                        {h % 1 === 0 ? h : h.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data && monthsWithHours.length === 0 && (
              <div className="card">
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No monthly detail available.</div>
              </div>
            )}

            <AddMissedHoursCard vol={volunteer} onSaved={loadHours} />
          </>
        )}
      </div>
    </div>
  );
}
