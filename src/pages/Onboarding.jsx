import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useVol } from '../App.jsx';
import { fetchMyOnboardingPacket, saveOnboardingPacket } from '../lib/db.js';
import { PACKET_SECTIONS, missingRequired } from '../lib/onboarding-spec.js';
const PdfFillDrawer = lazy(() => import('../components/PdfFillDrawer.jsx'));

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '6px 2px', border: 'none', borderBottom: '1.5px solid #8a7e6b', borderRadius: 0, fontSize: 16, background: 'transparent', outline: 'none', color: '#2c2418' };
const LABEL = { fontSize: 11, fontWeight: 700, color: '#886c44', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 2 };
const FULL = { gridColumn: '1 / -1' };

// Mounts its child only once it scrolls close to the screen, so six PDFs do not all load at once.
function LazyMount({ height, children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ height, display: 'flex', flexDirection: 'column', border: '1px solid #cfc6b4', background: '#fff' }}>
    {on ? <Suspense fallback={<div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>Opening form…</div>}>{children}</Suspense> : <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>Scroll down to load this form…</div>}
  </div>;
}

function Field({ f, value, onChange, onOpen, done, skipped, onSkip, packetId, onFormSaved }) {
  if (f.type === 'pending') {
    return (
      <div style={{ ...FULL, margin: '14px 0 6px', padding: '12px 14px', background: '#ecebe7', border: '1px dashed #bdb7a9', borderRadius: 4, color: '#8a8578' }}>
        <div style={{ fontSize: 13 }}>{f.label}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>Signed by your supervisor after you submit.</div>
      </div>
    );
  }
  if (f.type === 'form') {
    return (
      <div style={{ ...FULL, margin: '14px 0 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
          <div style={{ fontSize: 12, color: done || skipped ? '#15803d' : 'var(--muted)' }}>{skipped ? 'Marked as already turned in.' : done ? '\u2713 Saved. You can keep editing and save again.' : 'Fill in the form below, then click Save my answers.'}</div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text)', margin: '0 0 8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!skipped} onChange={e => onSkip(f.k, e.target.checked)} style={{ width: 17, height: 17 }} />
          <span>I already turned this in</span>
        </label>
        {!skipped && (
          <LazyMount height="78vh">
            <PdfFillDrawer url={f.link} packetId={packetId} docKey={f.k} prefill={f.prefill} onSaved={() => onFormSaved(f.k)} />
          </LazyMount>
        )}
      </div>
    );
  }
  const lbl = <div style={LABEL}>{f.label}{f.req ? ' *' : ''}</div>;
  if (f.type === 'check') {
    return (
      <label style={{ ...FULL, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text)', margin: '10px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
        <span>{f.label}</span>
      </label>
    );
  }
  if (f.type === 'initials') {
    return (
      <div style={{ ...FULL, display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', fontSize: 14, color: 'var(--text)' }}>
          {f.label}
          {f.link && <> {'·'} <a href={f.link} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }} onClick={e => { if (f.link.includes('/onboarding/')) { e.preventDefault(); onOpen({ url: f.link, title: f.label }); } }}>Read document</a></>}
        </div>
        <input value={value || ''} maxLength={4} placeholder="Initials" onChange={e => onChange(e.target.value.toUpperCase())} style={{ ...inputStyle, width: 90, textAlign: 'center', fontWeight: 600 }} />
      </div>
    );
  }
  return (
    <div style={{ margin: '12px 0 6px', ...(f.type === 'sig' || f.k === 'ec_medical' ? FULL : {}) }}>
      {lbl}
      {f.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">Choose</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={f.type === 'date' ? 'date' : f.type === 'tel' ? 'tel' : 'text'} value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, ...(f.type === 'sig' ? { fontFamily: "'Great Vibes', 'Brush Script MT', cursive", fontSize: 34, lineHeight: 1.2, padding: '2px 4px' } : {}) }} />
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
  const [doc, setDoc] = useState(null);
  const [wide, setWide] = useState(window.innerWidth >= 1000);
  const timer = useRef(null);
  useEffect(() => { const k = e => { if (e.key === 'Escape') setDoc(d => (d && d.fill ? d : null)); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  useEffect(() => { const fn = () => setWide(window.innerWidth >= 1000); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

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
    <div style={{ padding: '16px 20px 40px', maxWidth: 820, margin: '0 auto' }}>
      <button onClick={() => setView('dashboard')} className="btn-ghost" style={{ marginBottom: 12 }}>{'←'} Dashboard</button>
      {children}
      {doc && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: wide ? (doc.fill ? 'min(820px, 68vw)' : 'min(620px, 55vw)') : '100%', background: '#fff', borderLeft: '1px solid var(--border, #e0d8cc)', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(60,45,20,0.22)', animation: 'nshSlideIn .22s ease-out' }}>
          <style>{'@keyframes nshSlideIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}'}</style>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border, #e0d8cc)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
            <button className="btn-ghost" onClick={() => setDoc(null)}>Close</button>
          </div>
          {doc.fill ? (
            <Suspense fallback={<div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>Opening form…</div>}>
              <PdfFillDrawer key={doc.key} url={doc.url} packetId={packet.id} docKey={doc.key} onSaved={() => change('doc_' + doc.key, new Date().toISOString())} />
            </Suspense>
          ) : (
            <iframe key={doc.url} src={doc.url} title={doc.title} style={{ flex: 1, border: 'none', width: '100%' }} />
          )}
        </div>
      )}
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

  const sent = packet.sent_at ? new Date(packet.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  return shell(<>
    <div style={{ background: '#fff', border: '1px solid #d9d0bf', boxShadow: '0 2px 14px rgba(60,45,20,0.10)', padding: 'clamp(16px, 4vw, 40px)' }}>
      <img src="/onboarding/letterhead.jpg" alt="North Star Historic Conservancy" style={{ display: 'block', width: '100%', height: 'auto', marginBottom: 18 }} />
      <div style={{ textAlign: 'center', borderTop: '2px solid #886c44', borderBottom: '1px solid #886c44', padding: '12px 0', marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontFamily: "'Cardo', Georgia, serif", fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#2c2418' }}>Staff Onboarding Packet</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#6b5f4c', marginBottom: 6 }}>
        <div><span style={LABEL}>Employee </span><b style={{ color: '#2c2418', fontSize: 15 }}>{packet.person_name}</b></div>
        <div><span style={LABEL}>Issued </span>{sent}</div>
      </div>
      <div style={{ fontSize: 12, color: '#8a7e6b', marginBottom: 10 }}>Your progress saves as you go. Fields marked * are required.</div>
      {PACKET_SECTIONS.map((s, n) => (
        <div key={s.id} style={{ marginTop: 26 }}>
          {s.group && (n === 0 || PACKET_SECTIONS[n - 1].group !== s.group) && (
            <div style={{ margin: '34px 0 20px', padding: '14px 16px', background: '#f7f2e8', borderTop: '2px solid #886c44', borderBottom: '1px solid #886c44', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cardo', Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#2c2418' }}>{s.group}</div>
              <div style={{ fontSize: 13, color: '#6b5f4c', marginTop: 4 }}>Other materials. Open each one to read it, then initial to confirm.</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '1.5px solid #886c44', paddingBottom: 5 }}>
            <span style={{ fontFamily: "'Cardo', Georgia, serif", fontSize: 18, fontWeight: 700, color: '#886c44' }}>{n + 1}.</span>
            <span style={{ fontFamily: "'Cardo', Georgia, serif", fontSize: 17, fontWeight: 700, color: '#2c2418', textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.title}</span>
          </div>
          <div style={{ fontSize: 13, color: '#6b5f4c', fontStyle: 'italic', margin: '8px 0 4px' }}>{s.intro}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: 26 }}>
            {s.fields.map(f => <Field key={f.k} f={f} value={data[f.k]} onChange={v => change(f.k, v)} onOpen={setDoc} done={!!data['doc_' + f.k]} skipped={!!data['skip_' + f.k]} onSkip={(k, v) => change('skip_' + k, v)} packetId={packet.id} onFormSaved={k => change('doc_' + k, new Date().toISOString())} />)}
          </div>
        </div>
      ))}
    </div>
    {missing.length > 0 && (
      <div className="card" style={{ marginTop: 14, borderLeft: '4px solid #c0392b', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Still needed:</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>{missing.map(m => <li key={m}>{m}</li>)}</ul>
      </div>
    )}
    {msg && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
    <button className="btn-gold" disabled={saving} onClick={submit} style={{ width: '100%', padding: '12px 0', fontSize: 15, marginTop: 14 }}>{saving ? 'Submitting…' : 'Submit Packet'}</button>
  </>);
}
