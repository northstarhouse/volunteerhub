import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

// Private, ongoing to-do list. Only shown on the media@ account's dashboard; the table's
// row-level security (supabase-media-checklist.sql) also restricts it to that account.
export default function MediaChecklistCard() {
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [due, setDue] = useState('');
  const fmt = (d) => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const todayYmd = new Date().toLocaleDateString('en-CA');
  const [showDone, setShowDone] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('media_checklist').select('*').order('created_at', { ascending: true });
    if (error) { setErr('Could not load your checklist.'); setItems([]); return; }
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setErr('');
    const { data, error } = await supabase.from('media_checklist').insert({ text: t, due_date: due || null }).select().single();
    if (error) { setErr('Could not add that. Try again.'); return; }
    setItems(prev => [...(prev || []), data]);
    setText(''); setDue('');
  }

  async function toggle(it) {
    const done = !it.done;
    const patch = { done, done_at: done ? new Date().toISOString() : null };
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, ...patch } : x));
    const { error } = await supabase.from('media_checklist').update(patch).eq('id', it.id);
    if (error) { setErr('Could not save that change.'); load(); }
  }

  async function remove(it) {
    setItems(prev => prev.filter(x => x.id !== it.id));
    const { error } = await supabase.from('media_checklist').delete().eq('id', it.id);
    if (error) { setErr('Could not delete that.'); load(); }
  }

  const open = (items || []).filter(i => !i.done).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const done = (items || []).filter(i => i.done).sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>My Checklist</span>
        {items && <span style={{ color: 'var(--muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{open.length} to do</span>}
      </div>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Add something to do…" style={{ flex: '1 1 180px' }} />
        <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} title="Due date (optional)" style={{ flex: '0 0 auto', width: 'auto' }} />
        <button type="submit" className="btn-gold" style={{ flexShrink: 0 }}>Add</button>
      </form>
      {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 8 }}>{err}</div>}
      {items === null && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>}
      {items !== null && open.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Nothing on your list. Nice.</div>}
      {open.map(it => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderTop: '0.5px solid var(--border-light)' }}>
          <input type="checkbox" checked={false} onChange={() => toggle(it)} style={{ marginTop: 3, accentColor: '#886c44', cursor: 'pointer' }} />
          <div style={{ flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>
            {it.text}
            {it.due_date && <div style={{ fontSize: 11.5, marginTop: 2, color: it.due_date < todayYmd ? '#c0392b' : 'var(--muted)', fontWeight: it.due_date < todayYmd ? 600 : 400 }}>{it.due_date < todayYmd ? 'Overdue · ' : 'Due '}{fmt(it.due_date)}</div>}
          </div>
          <button onClick={() => remove(it)} title="Delete" style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      ))}
      {done.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowDone(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showDone && done.map(it => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderTop: '0.5px solid var(--border-light)' }}>
              <input type="checkbox" checked onChange={() => toggle(it)} style={{ marginTop: 3, accentColor: '#886c44', cursor: 'pointer' }} />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--muted)', wordBreak: 'break-word' }}>
                <span style={{ textDecoration: 'line-through' }}>{it.text}</span>
                <div style={{ fontSize: 11.5, marginTop: 2 }}>Finished {fmt(it.done_at)}{it.due_date ? ' · was due ' + fmt(it.due_date) : ''}</div>
              </div>
              <button onClick={() => remove(it)} title="Delete" style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
