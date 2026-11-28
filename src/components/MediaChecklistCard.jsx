import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

// Private, ongoing to-do list. Only shown on the media@ account's dashboard; the table's
// row-level security (supabase-media-checklist.sql) also restricts it to that account.
// Marketing tasks are added automatically by generate_marketing_tasks() (supabase-marketing-autotasks.sql):
// event countdowns, the monthly posting items (synced with the Portal's Monthly Posting Schedule) and
// quarterly area posts with each area's current goals. Hand-typed items still work as before.
const SOURCES = { event: 'Event', monthly: 'Monthly', quarterly: 'Quarterly' };
const STATUS_COLOR = { Complete: '#5a7a4a', 'On Track': '#886c44', Behind: '#c0392b', 'At Risk': '#c0392b' };

function ymdPlus(ymd, days) {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}

export default function MediaChecklistCard() {
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [due, setDue] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [showLater, setShowLater] = useState(false);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const fmt = (d) => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const fmtShort = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const todayYmd = new Date().toLocaleDateString('en-CA');
  const weekEnd = ymdPlus(todayYmd, 7);
  const laterStart = ymdPlus(todayYmd, 30);

  async function load() {
    const { data, error } = await supabase.from('media_checklist').select('*').order('created_at', { ascending: true });
    if (error) { setErr('Could not load your checklist.'); setItems([]); return; }
    setItems((data || []).filter(i => !i.archived_at));
  }
  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true); setErr('');
    const { error } = await supabase.rpc('generate_marketing_tasks');
    if (error) setErr('Could not refresh the marketing tasks.');
    await load();
    setRefreshing(false);
  }

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

  // Automatic tasks are dismissed (archived) rather than deleted, so the daily run does not add them back.
  async function remove(it) {
    setItems(prev => prev.filter(x => x.id !== it.id));
    const { error } = it.source
      ? await supabase.from('media_checklist').update({ archived_at: new Date().toISOString() }).eq('id', it.id)
      : await supabase.from('media_checklist').delete().eq('id', it.id);
    if (error) { setErr('Could not remove that.'); load(); }
  }

  const all = items || [];
  const shown = all.filter(i => filter === 'all' || (filter === 'mine' ? !i.source : i.source === filter));
  const open = shown.filter(i => !i.done).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const done = shown.filter(i => i.done).sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  const groups = [
    ['Overdue', open.filter(i => i.due_date && i.due_date < todayYmd)],
    ['This week', open.filter(i => i.due_date && i.due_date >= todayYmd && i.due_date <= weekEnd)],
    ['Coming up', open.filter(i => !i.due_date || (i.due_date > weekEnd && i.due_date < laterStart))],
  ];
  const later = open.filter(i => i.due_date && i.due_date >= laterStart);
  const openCount = all.filter(i => !i.done).length;

  const tag = (label, color) => (
    <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: color || 'var(--gold)', border: '0.5px solid currentColor', borderRadius: 4, padding: '1px 5px', marginRight: 6, whiteSpace: 'nowrap' }}>{label}</span>
  );

  function Goals({ d }) {
    if (!d) return null;
    return (
      <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--cream, #faf8f4)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text)' }}>
        {d.stale && <div style={{ color: '#c0392b', fontWeight: 600, marginBottom: 6 }}>{d.goals_quarter ? 'Last updated ' + d.goals_quarter : 'No goals on file yet'}. Check in before posting.</div>}
        {!d.stale && d.goals_quarter && <div style={{ color: 'var(--muted)', marginBottom: 6 }}>{d.goals_quarter} goals</div>}
        {d.primary_focus && <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 600 }}>Focus: </span>{d.primary_focus}</div>}
        {(d.goals || []).filter(g => g && g.text).map((g, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div>{i + 1}. {g.text}{g.status && <span style={{ marginLeft: 6, fontWeight: 600, color: STATUS_COLOR[g.status] || 'var(--muted)' }}>{g.status}</span>}</div>
            {g.summary && <div style={{ color: 'var(--muted)', marginTop: 2 }}>{g.summary}</div>}
          </div>
        ))}
        {(d.extra_goals || []).length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Also working on</div>
            {d.extra_goals.map((x, i) => <div key={i} style={{ color: 'var(--muted)' }}>• {x}</div>)}
          </div>
        )}
        {d.successes && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Wins they reported</div>
            <div style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{d.successes}</div>
          </div>
        )}
      </div>
    );
  }

  function Row({ it }) {
    const d = it.details || {};
    const overdue = it.due_date && it.due_date < todayYmd;
    const expandable = it.source === 'quarterly';
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: '0.5px solid var(--border-light)' }}>
        <input type="checkbox" checked={false} onChange={() => toggle(it)} style={{ marginTop: 3, accentColor: '#886c44', cursor: 'pointer' }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>
          <div onClick={expandable ? () => setOpenId(openId === it.id ? null : it.id) : undefined} style={{ cursor: expandable ? 'pointer' : 'default' }}>
            {it.text}
            {expandable && <span style={{ color: 'var(--gold)', fontSize: 12, marginLeft: 6 }}>{openId === it.id ? 'Hide goals' : 'See goals'}</span>}
          </div>
          {it.source === 'event' && d.event_title && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.event_title} · {fmtShort(d.event_date)}</div>}
          <div style={{ fontSize: 11.5, marginTop: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 }}>
            {it.source && tag(SOURCES[it.source] || it.source)}
            {it.catch_up && tag('Catch up', '#a06a2c')}
            {expandable && d.stale && tag('Goals ' + (d.goals_quarter || 'missing'), '#c0392b')}
            {it.due_date && <span style={{ color: overdue ? '#c0392b' : 'var(--muted)', fontWeight: overdue ? 600 : 400 }}>{overdue ? 'Overdue · ' : 'Due '}{fmt(it.due_date)}</span>}
          </div>
          {expandable && openId === it.id && <Goals d={d} />}
        </div>
        <button onClick={() => remove(it)} title={it.source ? 'Dismiss' : 'Delete'} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
    );
  }

  const chips = [['all', 'All'], ['event', 'Event'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['mine', 'Mine']];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span>My Checklist</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
          {items && <span style={{ color: 'var(--muted)' }}>{openCount} to do</span>}
          <button onClick={refresh} disabled={refreshing} style={{ background: 'none', border: '0.5px solid var(--border-light)', borderRadius: 6, padding: '3px 8px', fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer' }}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', border: '0.5px solid ' + (filter === k ? '#886c44' : 'var(--border-light)'), background: filter === k ? '#886c44' : 'transparent', color: filter === k ? '#fff' : 'var(--muted)' }}>{label}</button>
        ))}
      </div>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Add something to do…" style={{ flex: '1 1 180px' }} />
        <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} title="Due date (optional)" style={{ flex: '0 0 auto', width: 'auto' }} />
        <button type="submit" className="btn-gold" style={{ flexShrink: 0 }}>Add</button>
      </form>
      {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 8 }}>{err}</div>}
      {items === null && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>}
      {items !== null && open.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Nothing on your list. Nice.</div>}
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <div key={label} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: label === 'Overdue' ? '#c0392b' : 'var(--muted)', margin: '8px 0 2px' }}>{label} · {list.length}</div>
          {list.map(it => <Row key={it.id} it={it} />)}
        </div>
      ))}
      {later.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setShowLater(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            {showLater ? 'Hide' : 'Show'} later ({later.length})
          </button>
          {showLater && later.map(it => <Row key={it.id} it={it} />)}
        </div>
      )}
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
              <button onClick={() => remove(it)} title={it.source ? 'Dismiss' : 'Delete'} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
