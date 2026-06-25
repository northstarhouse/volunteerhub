import { useState } from 'react';
import { useVol } from '../App.jsx';
import { supabase } from '../supabase.js';
import { updateVolunteer, photoUrl } from '../lib/db.js';

const EDITABLE = ['Phone Number', 'Email', 'Address', 'What they want to see at NSH'];
const LABELS = {
  'Phone Number': 'Phone',
  'Email': 'Email',
  'Address': 'Address',
  'What they want to see at NSH': 'About / Bio',
};

function Avatar({ vol }) {
  const initials = `${(vol['First Name'] || '')[0] || ''}${(vol['Last Name'] || '')[0] || ''}`.toUpperCase();
  return vol['Picture URL'] ? (
    <img src={photoUrl(vol['Picture URL'])} alt={initials} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
  ) : (
    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--light)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>
      {initials || '?'}
    </div>
  );
}

function TeamBadge({ team }) {
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
  if (!team) return null;
  const teams = team.split('|').map(t => t.trim()).filter(Boolean);
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {teams.map(t => {
        const colors = TEAM_COLORS[t] || { bg: 'var(--light)', color: 'var(--gold)' };
        return (
          <span key={t} className="badge" style={{ background: colors.bg, color: colors.color }}>
            {t}
          </span>
        );
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
        <button onClick={() => setOpen(true)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 14px', flexShrink: 0 }}>
          Change
        </button>
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
            <button type="submit" className="btn-gold" disabled={busy} style={{ flex: 2 }}>
              {busy ? 'Saving…' : 'Save Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
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
    EDITABLE.forEach(k => { f[k] = volunteer[k] || ''; });
    setForm(f);
    setEditing(true);
    setSaved(false);
    setErr('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    const patch = {};
    EDITABLE.forEach(k => { patch[k] = form[k] || null; });
    const updated = await updateVolunteer(volunteer.id, patch);
    if (updated && !updated.code) {
      setVolunteer({ ...volunteer, ...patch, ...updated });
      setEditing(false);
      setSaved(true);
    } else {
      setErr('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const vol = volunteer;
  const anniversary = vol['Volunteer Anniversary']
    ? new Date(vol['Volunteer Anniversary'] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const birthday = vol['Birthday']
    ? (() => {
        const parts = vol['Birthday'].split('-');
        return parts.length >= 3
          ? new Date(vol['Birthday'] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
          : vol['Birthday'];
      })()
    : null;

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
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Edit Contact Info</div>
              {EDITABLE.map(k => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div className="label">{LABELS[k]}</div>
                  {k === 'What they want to see at NSH' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={form[k]}
                      onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                      placeholder="Tell others about yourself, your interests, what you enjoy at NSH…"
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      className="input"
                      type={k === 'Email' ? 'email' : 'text'}
                      value={form[k]}
                      onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
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

            {vol['What they want to see at NSH'] && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 6 }}>About / Bio</div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{vol['What they want to see at NSH']}</div>
                <button onClick={startEdit} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--gold)', cursor: 'pointer', marginTop: 8, padding: 0 }}>Edit</button>
              </div>
            )}

            {!vol['What they want to see at NSH'] && (
              <div className="card" style={{ marginBottom: 14, cursor: 'pointer' }} onClick={startEdit}>
                <div className="label" style={{ marginBottom: 4 }}>About / Bio</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Add a short bio so your teammates know you better. <span style={{ color: 'var(--gold)' }}>Add now →</span></div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 12 }}>Details</div>
              <InfoRow label="Birthday"   value={birthday} />
              <InfoRow label="Anniversary" value={anniversary} />
              <InfoRow label="Emergency Contact" value={vol['Emergency Contact']} />
              {!birthday && !anniversary && !vol['Emergency Contact'] && (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Details are managed by coordinators.</div>
              )}
            </div>
          </>
        )}

        {/* Change Password */}
        <ChangePassword />

        {/* Sign out */}
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: '8px 0' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
