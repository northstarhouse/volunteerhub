import { useState } from 'react';
import { useVol } from '../App.jsx';
import { supabase } from '../supabase.js';
import { updateVolunteer, photoUrl, insertOotNotice, logActivity, getZodiacSign } from '../lib/db.js';

const TEAM_COLORS = {
  'Staff':        { bg: '#f3f3f3', color: '#555' },
  'Board Member': { bg: '#fce4ec', color: '#880e4f' },
  'Grounds':      { bg: '#e8f5e9', color: '#2e7d32' },
  'Construction': { bg: '#fff3e0', color: '#e65100' },
  'Events Team':  { bg: '#e3f2fd', color: '#1565c0' },
  'Interiors':    { bg: '#f3e5f5', color: '#6a1b9a' },
  'Fundraising':  { bg: '#fff8e1', color: '#8a6200' },
  'Docent':       { bg: '#fbe9e7', color: '#8d3d2b' },
  'Marketing':    { bg: '#fce4ec', color: '#c2185b' },
};

function Avatar({ vol }) {
  const initials = `${(vol['First Name'] || '')[0] || ''}${(vol['Last Name'] || '')[0] || ''}`.toUpperCase();
  const url = photoUrl(vol['Picture URL']);
  return url ? (
    <img src={url} alt={initials} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
  ) : (
    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--light)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>
      {initials || '?'}
    </div>
  );
}

function TeamBadge({ team }) {
  if (!team) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {team.split('|').map(t => t.trim()).filter(Boolean).map(t => {
        const colors = TEAM_COLORS[t] || { bg: 'var(--light)', color: 'var(--gold)' };
        return <span key={t} className="badge" style={{ background: colors.bg, color: colors.color }}>{t}</span>;
      })}
    </div>
  );
}

function ViewRow({ label, value, onEdit, note, labelColor, shaded, last, preferred }) {
  return (
    <div style={{
      marginBottom: last ? 0 : 12,
      marginLeft: shaded ? -12 : 0,
      marginRight: shaded ? -12 : 0,
      background: shaded ? '#fafafa' : 'transparent',
      border: shaded ? '0.5px solid var(--border-light)' : 'none',
      borderRadius: shaded ? 8 : 0,
      padding: shaded ? '10px 12px' : 0,
    }}>
      <div className="label" style={{ marginBottom: 3, color: labelColor || 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {preferred && <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--gold)', fontSize: 10, background: '#f0ebe2', padding: '1px 7px', borderRadius: 10 }}>preferred</span>}
        {note && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)', fontSize: 10 }}> — {note}</span>}
      </div>
      {value ? (
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{value}</div>
      ) : (
        <button onClick={onEdit} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--gold)', cursor: 'pointer', fontStyle: 'italic' }}>
          Tap Edit to add →
        </button>
      )}
    </div>
  );
}

const MONTH_OPTS = [
  ['01','January'],['02','February'],['03','March'],['04','April'],
  ['05','May'],['06','June'],['07','July'],['08','August'],
  ['09','September'],['10','October'],['11','November'],['12','December'],
];

function DateSelector({ label, name, form, onChange, yearOptional = false, noDay = false }) {
  const raw = form[name] || '';
  const parts = raw.split('-');
  const hasAll = parts.length === 3;
  const yr = hasAll ? (parts[0] === '0001' ? '' : parts[0]) : '';
  const mn = hasAll ? parts[1] : '';
  const dy = hasAll ? String(parseInt(parts[2]) || '') : '';

  function notify(month, day, year) {
    if (!month) { onChange(name, null); return; }
    if (!year && !yearOptional) { onChange(name, null); return; }
    const y = String(year || '0001').padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const d = noDay ? '01' : (day ? String(day).padStart(2, '0') : null);
    if (!noDay && !d) { onChange(name, null); return; }
    onChange(name, `${y}-${m}-${d}`);
  }

  const daysInMonth = mn ? new Date(2000, parseInt(mn), 0).getDate() : 31;
  const sel = { className: 'input', style: { padding: '9px 8px' } };
  const currentYear = new Date().getFullYear();

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="label" style={{ marginBottom: 4 }}>
        {label}
        {yearOptional && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)', fontSize: 11 }}> — year optional</span>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select {...sel} style={{ ...sel.style, flex: 3 }} value={mn} onChange={e => notify(e.target.value, dy, yr)}>
          <option value="">Month</option>
          {MONTH_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {!noDay && (
          <select {...sel} style={{ ...sel.style, flex: 2 }} value={dy} onChange={e => notify(mn, e.target.value, yr)}>
            <option value="">Day</option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        <select {...sel} style={{ ...sel.style, flex: 2 }} value={yr} onChange={e => notify(mn, dy, e.target.value)}>
          <option value="">{yearOptional ? 'Year' : 'Year *'}</option>
          {Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PreferredContact({ form, onChange }) {
  const val = form['Preferred Contact'] || '';
  const hasPhone = val === 'phone' || val === 'both';
  const hasEmail = val === 'email' || val === 'both';

  function toggle(method) {
    const phoneOn = method === 'phone' ? !hasPhone : hasPhone;
    const emailOn = method === 'email' ? !hasEmail : hasEmail;
    const next = phoneOn && emailOn ? 'both' : phoneOn ? 'phone' : emailOn ? 'email' : '';
    onChange('Preferred Contact', next || null);
  }

  return (
    <div style={{ marginBottom: 12, background: 'var(--light)', borderRadius: 8, padding: '10px 12px' }}>
      <div className="label" style={{ marginBottom: 8 }}>Preferred Contact Method</div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[['phone', 'Phone'], ['email', 'Email']].map(([method, lbl]) => {
          const checked = method === 'phone' ? hasPhone : hasEmail;
          return (
            <label key={method} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(method)}
                style={{ width: 15, height: 15, accentColor: 'var(--gold)', cursor: 'pointer' }} />
              <span style={{ color: checked ? 'var(--gold)' : 'var(--text)', fontWeight: checked ? 600 : 400 }}>{lbl}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, name, form, onChange, type = 'text', placeholder = '', yearOptional = false, noDay = false }) {
  if (type === 'preferred') return <PreferredContact form={form} onChange={onChange} />;
  if (type === 'date') return <DateSelector label={label} name={name} form={form} onChange={onChange} yearOptional={yearOptional} noDay={noDay} />;
  const value = form[name] ?? '';
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="label">{label}</div>
      {type === 'textarea' ? (
        <textarea className="input" rows={3} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} style={{ resize: 'vertical' }} />
      ) : (
        <input className="input" type={type} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function ChangePassword() {
  const [open, setOpen]       = useState(false);
  const [pw, setPw]           = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [done, setDone]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pw !== confirm) { setErr('Passwords do not match.'); return; }
    if (pw.length < 6)  { setErr('Must be at least 6 characters.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErr(error.message); setBusy(false); return; }
    setDone(true); setBusy(false);
    setTimeout(() => { setOpen(false); setDone(false); setPw(''); setConfirm(''); }, 1800);
  }

  if (!open) {
    return (
      <div className="card" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Password</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Change your login password</div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 14px', flexShrink: 0 }}>Change</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Change Password</div>
      {done ? (
        <div style={{ fontSize: 13, color: '#2e7d32', textAlign: 'center', padding: '8px 0' }}>✓ Password updated!</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div className="label">New Password</div>
            <input className="input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Confirm New Password</div>
            <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" required />
          </div>
          {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setOpen(false); setPw(''); setConfirm(''); setErr(''); }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" disabled={busy} style={{ flex: 2 }}>{busy ? 'Saving…' : 'Save Password'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

const EDITABLE_FIELDS = [
  { name: 'Phone Number',                   label: 'Phone',                                  type: 'tel' },
  { name: 'Email',                           label: 'Email',                                  type: 'email' },
  { name: 'Preferred Contact',              label: 'Preferred Contact',                      type: 'preferred' },
  { name: 'Address',                         label: 'Address',                                type: 'text' },
  { name: 'Birthday',              label: 'Birthday',        type: 'date', yearOptional: true },
  { name: 'Volunteer Anniversary', label: 'North Star House Anniversary', type: 'date', yearOptional: false, noDay: true },
  { name: 'Emergency Contact',               label: 'Emergency Contact',                      type: 'text', placeholder: 'Name & phone number' },
  { name: 'Favorite Quote',                 label: 'Favorite Quote',                         type: 'textarea', placeholder: 'A quote that inspires you…' },
  { name: 'What they want to see at NSH',   label: 'What You Want to See at North Star House', type: 'textarea', placeholder: 'Tell others about yourself and what you enjoy at North Star House…' },
  { name: 'NSH Future Vision',              label: 'What you envision for the future of North Star House', type: 'textarea', placeholder: 'Share your hopes and ideas for North Star House…' },
  { name: 'Allergies',                      label: 'Allergies',                              type: 'textarea', placeholder: 'Food, environmental, or medical allergies others should know about…' },
  { name: 'Special Considerations',         label: 'Special Considerations',                 type: 'textarea', placeholder: 'Sensitive info only visible to you and coordinators…' },
];

function fmtAnniversary(iso) {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length < 2) return iso;
  return new Date(`${parts[0]}-${parts[1]}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function fmtBirthday(iso) {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
function birthdayZodiac(iso) {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length < 3) return null;
  return getZodiacSign(parseInt(parts[1]), parseInt(parts[2]));
}

const today = () => new Date().toISOString().slice(0, 10);

function OutOfTownCard({ vol }) {
  const fullName = `${vol['First Name'] || ''} ${vol['Last Name'] || ''}`.trim();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ start_date: today(), end_date: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [submitted, setSubmitted] = useState(false);

  function openForm() {
    setForm({ start_date: today(), end_date: '', notes: '' });
    setErr('');
    setSubmitted(false);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) { setErr('Both dates are required.'); return; }
    if (form.end_date < form.start_date) { setErr('End date must be after start date.'); return; }
    setSaving(true); setErr('');
    const result = await insertOotNotice({ name: fullName, start_date: form.start_date, end_date: form.end_date, notes: form.notes || null });
    if (Array.isArray(result) && result[0]) {
      setShowForm(false);
      setSubmitted(true);
    } else {
      setErr('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm || submitted ? 12 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Out of Town</div>
        {!showForm && <button onClick={openForm} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Submit Out of Town Notice</button>}
      </div>

      {submitted && !showForm && (
        <div style={{ fontSize: 12, color: '#2e7d32' }}>✓ Your out-of-town notice has been submitted.</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit}>
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
            <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 2 }}>{saving ? 'Submitting…' : 'Submit'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

const FEEDBACK_CATEGORIES = [
  'General Feedback',
  'Suggestion or Idea',
  'Question',
  'Shout-Out / Recognition',
  'Issue or Concern',
];

function FeedbackCard({ vol, session }) {
  const [showForm, setShowForm]   = useState(false);
  const [category, setCategory]   = useState('');
  const [message, setMessage]     = useState('');
  const [anon, setAnon]           = useState(false);
  const [busy, setBusy]           = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr]             = useState('');

  function openForm() {
    setCategory('');
    setMessage('');
    setAnon(false);
    setErr('');
    setSubmitted(false);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) { setErr('Please write a message before submitting.'); return; }
    setBusy(true); setErr('');

    const name = anon ? null : `${vol['First Name'] || ''} ${vol['Last Name'] || ''}`.trim();
    const { error } = await supabase.from('vol_feedback').insert({
      auth_user_id:   session.user.id,
      volunteer_name: name,
      category:       category || null,
      message:        message.trim(),
      anonymous:      anon,
    });

    if (error) {
      setErr('Failed to send. Please try again.');
      setBusy(false);
      return;
    }

    setShowForm(false);
    setSubmitted(true);
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm || submitted ? 12 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Feedback</div>
        {!showForm && <button onClick={openForm} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Submit Feedback</button>}
      </div>

      {submitted && !showForm && (
        <div style={{ fontSize: 12, color: '#2e7d32' }}>✓ Your feedback has been sent. Thank you!</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div className="label">Category</div>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ appearance: 'auto' }}>
              <option value="">Select a category (optional)</option>
              {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="label">Message *</div>
            <textarea className="input" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Share your feedback, ideas, questions, or shout-outs…" required style={{ resize: 'vertical' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
            <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Submit anonymously</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Your name won't be attached to this feedback.</div>
            </div>
          </label>

          {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" disabled={busy || !message.trim()} style={{ flex: 2 }}>{busy ? 'Sending…' : 'Send Feedback'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Profile() {
  const { volunteer, setVolunteer, signOut, session } = useVol();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [err, setErr]         = useState('');

  function startEdit() {
    const f = {};
    EDITABLE_FIELDS.forEach(({ name }) => { f[name] = volunteer[name] || ''; });
    setForm(f);
    setEditing(true);
    setSaved(false);
    setErr('');
  }

  function handleChange(name, value) {
    setForm(p => ({ ...p, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    const patch = {};
    EDITABLE_FIELDS.forEach(({ name }) => { patch[name] = form[name] || null; });
    const updated = await updateVolunteer(volunteer.id, patch);
    if (updated && !updated.code) {
      setVolunteer({ ...volunteer, ...patch });
      setEditing(false);
      setSaved(true);
      const fullName = `${volunteer['First Name'] || ''} ${volunteer['Last Name'] || ''}`.trim();
      logActivity({
        vol: volunteer,
        authUserId: session.user.id,
        action: 'profile_updated',
        description: `${fullName || 'A volunteer'} updated their profile`,
      });
    } else {
      setErr(updated?.message || 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const vol = volunteer;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 16px', borderBottom: '0.5px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 12 }}>My Profile</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Avatar vol={vol} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", lineHeight: 1.2 }}>
              {vol['First Name']} {vol['Last Name']}
            </div>
            <TeamBadge team={vol['Team']} />
            {vol['Status'] && (
              <span style={{ fontSize: 11, color: vol['Status'] === 'Active' ? '#2e7d32' : 'var(--muted)', background: vol['Status'] === 'Active' ? '#e8f5e9' : 'var(--light)', padding: '2px 8px', borderRadius: 10, marginTop: 6, display: 'inline-block' }}>
                {vol['Status']}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        {saved && !editing && (
          <div style={{ background: '#e8f5e9', border: '0.5px solid #a5d6a7', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#2e7d32', marginBottom: 14 }}>
            ✓ Profile updated successfully.
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSave}>
            {/* Contact */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Contact Info</div>
              {EDITABLE_FIELDS.filter(f => ['Phone Number','Email','Preferred Contact','Address'].includes(f.name)).map(f => (
                <Field key={f.name} {...f} form={form} onChange={handleChange} />
              ))}
            </div>

            {/* Personal */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Personal Info</div>
              {EDITABLE_FIELDS.filter(f => ['Birthday','Volunteer Anniversary','Emergency Contact'].includes(f.name)).map(f => (
                <Field key={f.name} {...f} form={form} onChange={handleChange} />
              ))}
            </div>

            {/* About */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>About</div>
              {EDITABLE_FIELDS.filter(f => ['What they want to see at NSH','Favorite Quote','NSH Future Vision','Allergies','Special Considerations'].includes(f.name)).map(f => (
                <div key={f.name}>
                  {f.name === 'Allergies' && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontStyle: 'italic' }}>Visible to all volunteers in the directory.</div>
                  )}
                  {f.name === 'Special Considerations' && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontStyle: 'italic' }}>🔒 Private — only visible to you and coordinators.</div>
                  )}
                  <Field {...f} form={form} onChange={handleChange} />
                </div>
              ))}
            </div>

            {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <>
            {/* Contact Info */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Contact Info</div>
                <button onClick={startEdit} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
              </div>
              <ViewRow label="Phone"   value={vol['Phone Number']} onEdit={startEdit} preferred={vol['Preferred Contact'] === 'phone' || vol['Preferred Contact'] === 'both'} />
              <ViewRow label="Email"   value={vol['Email']}        onEdit={startEdit} preferred={vol['Preferred Contact'] === 'email' || vol['Preferred Contact'] === 'both'} />
              <ViewRow label="Address" value={vol['Address']}      onEdit={startEdit} />
            </div>

            {/* Personal Info */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Personal Info</div>
                <button onClick={startEdit} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
              </div>
              <ViewRow label="Birthday" value={fmtBirthday(vol['Birthday']) && (
                <>{fmtBirthday(vol['Birthday'])}{birthdayZodiac(vol['Birthday']) && <span style={{ color: 'var(--muted)', fontStyle: 'italic', opacity: 0.65 }}> · <span style={{ color: 'var(--gold)' }}>{birthdayZodiac(vol['Birthday']).symbol}</span> {birthdayZodiac(vol['Birthday']).name}</span>}</>
              )} onEdit={startEdit} />
              <ViewRow label="North Star House Anniversary"   value={fmtAnniversary(vol['Volunteer Anniversary'])}  onEdit={startEdit} />
              <ViewRow label="Emergency Contact" value={vol['Emergency Contact']}                       onEdit={startEdit} last />
            </div>

            {/* About */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>About</div>
                <button onClick={startEdit} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
              </div>
              <ViewRow label="Favorite Quote"        value={vol['Favorite Quote']}               onEdit={startEdit} />
              <ViewRow label="What You Want to See at North Star House" value={vol['What they want to see at NSH']} onEdit={startEdit} />
              <ViewRow label="What you envision for the future of North Star House" value={vol['NSH Future Vision']} onEdit={startEdit} />
              <ViewRow label="⚠ Allergies"           value={vol['Allergies']}                    onEdit={startEdit} note="visible to others in directory" labelColor="#c0392b" />
              <ViewRow label="🔒 Special Considerations" value={vol['Special Considerations']}   onEdit={startEdit} note="only visible to you & coordinators" shaded last />
            </div>

            <OutOfTownCard vol={vol} />
            <FeedbackCard vol={vol} session={session} />
          </>
        )}

        <ChangePassword />

        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: '8px 0' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
