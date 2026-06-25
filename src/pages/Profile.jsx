import { useState } from 'react';
import { useVol } from '../App.jsx';
import { supabase } from '../supabase.js';
import { updateVolunteer, photoUrl } from '../lib/db.js';

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

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="label">{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{value}</div>
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

function Field({ label, name, form, onChange, type = 'text', placeholder = '', yearOptional = false }) {
  if (type === 'date') return <DateSelector label={label} name={name} form={form} onChange={onChange} yearOptional={yearOptional} />;
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
  { name: 'Address',                         label: 'Address',                                type: 'text' },
  { name: 'Birthday',              label: 'Birthday',        type: 'date', yearOptional: true },
  { name: 'Volunteer Anniversary', label: 'NSH Anniversary', type: 'date', yearOptional: false, noDay: true },
  { name: 'Emergency Contact',               label: 'Emergency Contact',                      type: 'text', placeholder: 'Name & phone number' },
  { name: 'What they want to see at NSH',   label: 'About / Bio',                            type: 'textarea', placeholder: 'Tell others about yourself and what you enjoy at NSH…' },
  { name: 'NSH Future Vision',              label: 'What I Want for the Future of NSH',      type: 'textarea', placeholder: 'Share your hopes and ideas for NSH…' },
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

export default function Profile() {
  const { volunteer, setVolunteer, signOut } = useVol();
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
              {EDITABLE_FIELDS.filter(f => ['Phone Number','Email','Address'].includes(f.name)).map(f => (
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
              {EDITABLE_FIELDS.filter(f => ['What they want to see at NSH','NSH Future Vision','Allergies','Special Considerations'].includes(f.name)).map(f => (
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
              <InfoRow label="Phone"   value={vol['Phone Number']} />
              <InfoRow label="Email"   value={vol['Email']} />
              <InfoRow label="Address" value={vol['Address']} />
              {!vol['Phone Number'] && !vol['Email'] && !vol['Address'] && (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No contact info yet. Tap Edit to add yours.</div>
              )}
            </div>

            {/* Personal Info */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Personal Info</div>
                <button onClick={startEdit} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
              </div>
              <InfoRow label="Birthday"         value={fmtBirthday(vol['Birthday'])} />
              <InfoRow label="NSH Anniversary"  value={fmtAnniversary(vol['Volunteer Anniversary'])} />
              <InfoRow label="Emergency Contact" value={vol['Emergency Contact']} />
              {!vol['Birthday'] && !vol['Volunteer Anniversary'] && !vol['Emergency Contact'] && (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Tap Edit to fill in your personal info.</div>
              )}
            </div>

            {/* About */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>About</div>
                <button onClick={startEdit} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
              </div>
              {vol['What they want to see at NSH'] ? (
                <div style={{ marginBottom: 12 }}>
                  <div className="label" style={{ marginBottom: 4 }}>About / Bio</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{vol['What they want to see at NSH']}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>
                  Add a short bio so teammates know you better. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={startEdit}>Add now →</span>
                </div>
              )}
              {vol['NSH Future Vision'] && (
                <div style={{ marginBottom: 10 }}>
                  <div className="label" style={{ marginBottom: 4 }}>Future of NSH</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{vol['NSH Future Vision']}</div>
                </div>
              )}
              {vol['Allergies'] && (
                <div style={{ marginBottom: 10 }}>
                  <div className="label" style={{ marginBottom: 4, color: '#c0392b' }}>⚠ Allergies <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— visible to others</span></div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{vol['Allergies']}</div>
                </div>
              )}
              {vol['Special Considerations'] && (
                <div style={{ background: '#fafafa', border: '0.5px solid var(--border-light)', borderRadius: 8, padding: '10px 12px' }}>
                  <div className="label" style={{ marginBottom: 4 }}>🔒 Special Considerations <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— only visible to you & coordinators</span></div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{vol['Special Considerations']}</div>
                </div>
              )}
            </div>
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
