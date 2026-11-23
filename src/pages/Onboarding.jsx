import { useState, useEffect, useRef } from 'react';
import { useVol } from '../App.jsx';
import { fetchMyOnboardingPacket, saveOnboardingPacket } from '../lib/db.js';
import { PACKET_SECTIONS, missingRequired } from '../lib/onboarding-spec.js';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid var(--border, #e0d8cc)', borderRadius: 8, fontSize: 15, background: '#fff' };

function Field({ f, value, onChange }) {
  const lbl = <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{f.label}{f.req ? ' *' : ''}</div>;
  if (f.type === 'check') {
    return (
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text)', margin: '10px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
        <span>{f.label}</span>
      </label>
    );
  }
  if (f.type === 'initials') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', fontSize: 14, color: 'var(--text)' }}>
          {f.label}
          {f.link && <> {'·'} <a href={f.link} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Read document</a></>}
        </div>
        <input value={value || ''} maxLength={4} placeholder="Initials" onChange={e => onChange(e.target.value.toUpperCase())} style={{ ...inputStyle, width: 90, textAlign: 'center', fontWeight: 600 }} />
      </div>
    );
  }
  return (
    <div style={{ margin: '10px 0' }}>
      {lbl}
      {f.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">Choose</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={f.type === 'date' ? 'date' : f.type === 'tel' ? 'tel' : 'text'} value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, ...(f.type === 'sig' ? { fontFamily: "'Cardo', Georgia, serif", fontStyle: 'italic', fontSize: 18 } : {}) }} />
      )}
    </div>
  );
}

export default function Onboarding() {
  const { session, setView } = useVol();
  const email = session?.user?.email;
  const [packet, setPacket] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [missing, setMissing] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    fetchMyOnboardingPacket(email).then(p => { setPacket(p); setData((p && p.data) || {}); setLoading(false); }).catch(() => setLoading(false));
  }, [email]);

  const change = (k, v) => {
    setData(d => {
      const next = { ...d, [k]: v };
      clearTimeout(timer.current);
      if (packet && packet.status === 'sent') timer.current = setTimeout(() => { saveOnboardingPacket(packet.id, next, false).catch(() => {}); }, 900);
      return next;
    });
  };

  const submit = async () => {
    const m = missingRequired(data);
    setMissing(m);
    if (m.length) { setMsg(''); return; }
    setSaving(true); setMsg('');
    clearTimeout(timer.current);
    const saved = await saveOnboardingPacket(packet.id, data, true).catch(() => null);
    setSaving(false);
    if (saved) { setPacket(saved); window.scrollTo(0, 0); } else setMsg('Something went wrong saving your packet. Please try again.');
  };

  const shell = (children) => (
    <div style={{ padding: '16px 20px 40px', maxWidth: 720, margin: '0 auto' }}>
      <button onClick={() => setView('dashboard')} className="btn-ghost" style={{ marginBottom: 12 }}>{'←'} Dashboard</button>
      {children}
    </div>
  );

  if (loading) return shell(<div style={{ color: 'var(--muted)' }}>Loading{'…'}</div>);
  if (!packet) return shell(<div className="card">There is no onboarding packet waiting for you.</div>);
  if (packet.status === 'submitted') return shell(
    <div className="card">
      <div style={{ fontSize: 20, fontFamily: "'Cardo', Georgia, serif", fontWeight: 700, color: 'var(--text)' }}>Thank you</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Your onboarding packet was submitted. HR has been notified and will be in touch if anything else is needed.</div>
    </div>
  );

  return shell(<>
    <div style={{ fontSize: 24, fontFamily: "'Cardo', Georgia, serif", fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Onboarding Packet</div>
    <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Your progress saves as you go. Fields marked * are required.</div>
    {PACKET_SECTIONS.map(s => (
      <div key={s.id} className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{s.intro}</div>
        {s.fields.map(f => <Field key={f.k} f={f} value={data[f.k]} onChange={v => change(f.k, v)} />)}
      </div>
    ))}
    {missing.length > 0 && (
      <div className="card" style={{ borderLeft: '4px solid #c0392b', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Still needed:</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>{missing.map(m => <li key={m}>{m}</li>)}</ul>
      </div>
    )}
    {msg && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
    <button className="btn-gold" disabled={saving} onClick={submit} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>{saving ? 'Submitting…' : 'Submit Packet'}</button>
  </>);
}
