import { useState, useEffect, useMemo } from 'react';
import { useVol } from '../App.jsx';
import {
  fetchAllActiveVolunteers, fetchVoteItems, fetchVotes, fetchVoteParts, createVoteItem, createVoteParts,
  closeVoteItem, deleteVoteItem, castVotes, sendVoteNotification,
} from '../lib/db.js';
import {
  VOTE_CHOICES, NOTES_CHOICE, VOTE_COLORS, volName, committeeMembers, partsOf, unitsOf, itemVotes,
  unitVotes, voteOf, hasVotedAll, votedCount, isRevealed, tally,
} from '../lib/eventsVoting.js';

const HUB_URL = 'https://volunteerhub.northstarhouse.org/';
const gold = 'var(--gold)';

const fmtDate = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtStamp = (ts) => (ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const byNewest = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
const linkify = (text) => String(text || '').split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
  /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: gold }}>{p}</a> : p);

const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid var(--border)', borderRadius: 3, fontSize: 13, marginTop: 4, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
const lbl = { fontSize: 12, color: '#666', fontWeight: 500 };
const emptyTopic = { title: '', description: '', attachment_url: '', due_date: '', meeting_date: '', allow_notes_vote: false, parts: [] };

function Pill({ choice }) {
  const c = VOTE_COLORS[choice] || { bg: '#f5f5f5', color: '#888' };
  return <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{choice === NOTES_CHOICE ? 'Notes / Changes' : choice}</span>;
}

export default function EventsVoting() {
  const { volunteer, setView } = useVol();
  const [items, setItems] = useState([]);
  const [votes, setVotes] = useState([]);
  const [parts, setParts] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({}); // { [unitKey]: { choice, note } }, unitKey = part id or 'whole'
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [busyId, setBusyId] = useState(null);
  const [notifyItem, setNotifyItem] = useState(null);
  const [notifyResult, setNotifyResult] = useState(null);

  const myTeams = (volunteer.Team || '').split('|').map(t => t.trim());
  const isLeader = myTeams.includes('Team Lead') || myTeams.includes('Board Member');
  const me = String(volunteer.id);
  const key = (u) => u.id || 'whole';

  async function load() {
    const [its, vts, pts, vols] = await Promise.all([fetchVoteItems(), fetchVotes(), fetchVoteParts(), fetchAllActiveVolunteers()]);
    setItems(its); setVotes(vts); setParts(pts); setVolunteers(Array.isArray(vols) ? vols : []);
    setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  // The signed-in volunteer always counts as a member of the page they can see.
  const members = useMemo(() => {
    const m = committeeMembers(volunteers);
    return m.some(v => String(v.id) === me) ? m : [...m, volunteer];
  }, [volunteers, volunteer, me]);

  const selected = items.find(i => i.id === selectedId) || null;
  const revealed = (item) => isRevealed(item, parts, votes, members);
  const iMine = (item) => hasVotedAll(item, parts, votes, me);
  const openItems = items.filter(i => !revealed(i)).sort(byNewest);
  const closedItems = items.filter(i => revealed(i)).sort(byNewest);

  function openItem(item) {
    const f = {};
    unitsOf(item, parts).forEach(u => { const mv = voteOf(item, u, votes, me); f[key(u)] = { choice: mv ? mv.choice : '', note: mv ? (mv.note || '') : '' }; });
    setSelectedId(item.id);
    setForm(f);
  }

  const setUnit = (u, patch) => setForm(f => ({ ...f, [key(u)]: { ...(f[key(u)] || { choice: '', note: '' }), ...patch } }));
  const unitReady = (u) => { const f = form[key(u)]; return f && f.choice && (f.choice !== NOTES_CHOICE || f.note.trim()); };

  async function submitVote() {
    if (!selected || saving) return;
    const units = unitsOf(selected, parts);
    if (!units.every(unitReady)) return;
    setSaving(true);
    try {
      const inMeeting = selected.meeting_date && new Date(selected.meeting_date + 'T12:00:00').toDateString() === new Date().toDateString();
      await castVotes({
        itemId: selected.id, voterId: volunteer.id, voter: volName(volunteer),
        entries: units.map(u => {
          const existing = voteOf(selected, u, votes, me);
          const f = form[key(u)];
          return { partId: u.id, choice: f.choice, note: f.note.trim(), existingId: existing && existing.id, changedInMeeting: inMeeting ? true : !!(existing && existing.changed_in_meeting) };
        }),
      });
      setVotes(await fetchVotes());
    } catch (e) { alert('Could not save your vote: ' + e.message); }
    setSaving(false);
  }

  async function submitTopic(e) {
    e.preventDefault();
    if (!topicForm.title.trim() || saving) return;
    const cleanParts = topicForm.parts.map(p => ({ title: p.title.trim(), description: p.description.trim() })).filter(p => p.title);
    setSaving(true);
    try {
      const item = await createVoteItem({
        title: topicForm.title.trim(), description: topicForm.description.trim() || null,
        attachment_url: topicForm.attachment_url.trim() || null, submitted_by: volName(volunteer),
        due_date: topicForm.due_date || null, meeting_date: topicForm.meeting_date || null,
        allow_notes_vote: topicForm.allow_notes_vote, status: 'Open',
      });
      try { await createVoteParts(item.id, cleanParts); }
      catch (err) { await deleteVoteItem(item.id); throw err; }
      setShowAdd(false);
      setTopicForm(emptyTopic);
      await load();
    } catch (err) { alert('Could not create the vote: ' + err.message); }
    setSaving(false);
  }

  async function doClose(item) {
    setBusyId(item.id);
    try { await closeVoteItem(item.id); setItems(prev => prev.map(i => (i.id === item.id ? { ...i, status: 'Closed' } : i))); }
    catch (e) { alert('Could not close the vote: ' + e.message); }
    setBusyId(null);
  }

  async function doDelete(item) {
    if (!window.confirm(`Delete "${item.title}"? This also removes any votes already cast on it. This cannot be undone.`)) return;
    setBusyId(item.id);
    const ok = await deleteVoteItem(item.id);
    if (ok) { setItems(prev => prev.filter(i => i.id !== item.id)); setVotes(prev => prev.filter(v => v.item_id !== item.id)); setParts(prev => prev.filter(p => p.item_id !== item.id)); if (selectedId === item.id) setSelectedId(null); }
    else alert('Could not delete. Please try again.');
    setBusyId(null);
  }

  async function doNotify(item) {
    setNotifyItem(null);
    const withEmail = members.filter(m => m.Email);
    const missing = members.filter(m => !m.Email).map(volName);
    if (!withEmail.length) { setNotifyResult({ ok: false, text: 'No committee member emails on file.' }); return; }
    setNotifyResult({ ok: true, text: 'Sending…' });
    const ok = await sendVoteNotification({ to: withEmail.map(m => m.Email), title: item.title, link: HUB_URL });
    const bits = [ok ? `Sent to ${withEmail.length} committee member${withEmail.length > 1 ? 's' : ''}.` : 'Failed to send.'];
    if (missing.length) bits.push('No email on file for: ' + missing.join(', ') + '.');
    setNotifyResult({ ok, text: bits.join(' ') });
  }

  const latestOpen = openItems[0];
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;

  const card = { background: '#fff', border: '1px solid #e6d9bf', borderRadius: 10, padding: '16px 20px', cursor: 'pointer' };
  const btnOutline = { background: '#fff', color: '#555', border: '0.5px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' };
  const setPart = (i, patch) => setTopicForm(f => ({ ...f, parts: f.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  return (
    <div>
      <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid var(--border-light)', background: '#fff' }}>
        <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none', color: gold, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>← Dashboard</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: gold }}>Committee Voting</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''} · Events Committee</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {isLeader && <button onClick={() => setShowAdmin(true)} style={btnOutline}>Admin</button>}
            {isLeader && (
              <div style={{ position: 'relative' }}>
                <button disabled={!latestOpen} onClick={() => latestOpen && setNotifyItem(latestOpen)} style={{ ...btnOutline, color: gold, border: '1px solid var(--gold)', fontWeight: 600, opacity: latestOpen ? 1 : 0.5 }}>Send Notification</button>
                {notifyItem && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 20, background: '#fff', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.14)', padding: 14, width: 260 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Email {members.filter(m => m.Email).length} committee member{members.filter(m => m.Email).length !== 1 ? 's' : ''}?</div>
                    <div style={{ fontSize: 11, color: '#777', marginBottom: 10 }}>"{notifyItem.title}"</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-gold" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={() => doNotify(notifyItem)}>Send</button>
                      <button className="btn-ghost" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={() => setNotifyItem(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button className="btn-gold" onClick={() => setShowAdd(true)}>+ New Vote</button>
          </div>
        </div>
        {notifyResult && <div style={{ fontSize: 12, marginTop: 8, color: notifyResult.ok ? '#2e6b4f' : '#a04545' }}>{notifyResult.text}</div>}
      </div>

      <div style={{ padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && <div style={{ color: '#777', fontSize: 13, textAlign: 'center', padding: 40 }}>No votes yet. Use "+ New Vote" to start one.</div>}
        {[...openItems, ...closedItems].map((item, idx) => {
          const isOpen = !revealed(item);
          const pts = partsOf(item, parts);
          return (
            <div key={item.id}>
              {idx === openItems.length && openItems.length > 0 && closedItems.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 14px' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Closed</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                </div>
              )}
              <div onClick={() => openItem(item)} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2a2a2a', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>
                      {item.submitted_by ? `Submitted by ${item.submitted_by} on ${fmtStamp(item.created_at)}` : `Submitted ${fmtStamp(item.created_at)}`}
                      {pts.length ? ` · ${pts.length} items to vote on` : ''}
                      {item.due_date ? ` · Due ${fmtDate(item.due_date)}` : ''}
                      {item.meeting_date ? ` · Meeting ${fmtDate(item.meeting_date)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#777' }}>{votedCount(item, parts, votes, members)}/{members.length} voted</span>
                    {isOpen && !iMine(item) && <span style={{ background: '#fff3e0', color: '#e65100', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 4 }}>Needs your vote</span>}
                    {isOpen && iMine(item) && <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontStyle: 'italic', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Voted</span>}
                    {!isOpen && <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 4 }}>Closed</span>}
                  </div>
                </div>
                {!isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                    {unitsOf(item, parts).map(u => {
                      const t = tally(item, u, votes);
                      return (
                        <div key={key(u)} style={{ display: 'flex', gap: 14, fontSize: 12, flexWrap: 'wrap' }}>
                          {pts.length > 0 && <span style={{ color: '#555', fontWeight: 500, minWidth: 140 }}>{u.title}</span>}
                          <span style={{ color: '#2e7d32', fontWeight: 600 }}>{t.yes} Yes</span>
                          <span style={{ color: '#c62828', fontWeight: 600 }}>{t.no} No</span>
                          <span style={{ color: '#7c3aed', fontWeight: 600 }}>{t.abstain} Abstain</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1010 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px, 100vw)', background: '#fff', zIndex: 1011, boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', overflowY: 'auto' }}>
            <div style={{ padding: '16px 22px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Back</button>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#bbb', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#2a2a2a', marginBottom: 6 }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: '#777', marginBottom: 18 }}>
                Submitted {fmtStamp(selected.created_at)}{selected.submitted_by ? ` · by ${selected.submitted_by}` : ''}
                {selected.due_date ? ` · Due ${fmtDate(selected.due_date)}` : ''}{selected.meeting_date ? ` · Meeting ${fmtDate(selected.meeting_date)}` : ''}
              </div>
              {selected.description && <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16, padding: '12px 14px', background: '#faf8f5', borderRadius: 8, whiteSpace: 'pre-wrap' }}>{linkify(selected.description)}</div>}
              {selected.attachment_url && (
                <div style={{ marginBottom: 18 }}>
                  <a href={selected.attachment_url} target="_blank" rel="noreferrer" style={{ color: gold, fontWeight: 600, fontSize: 13 }}>→ Open attached material</a>
                </div>
              )}

              {revealed(selected) ? (
                <Results item={selected} parts={parts} votes={votes} members={members} />
              ) : (
                <>
                  <div style={{ background: '#faf8f5', border: '0.5px solid #e8e0d5', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{iMine(selected) ? 'Change your vote' : 'Cast your vote'}</div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>Voting as {volName(volunteer)}</div>
                    {unitsOf(selected, parts).map((u, idx, all) => {
                      const f = form[key(u)] || { choice: '', note: '' };
                      return (
                        <div key={key(u)} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: idx < all.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          {u.id && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#2a2a2a' }}>{idx + 1}. {u.title}</div>
                              {u.description && <div style={{ fontSize: 12, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap' }}>{linkify(u.description)}</div>}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            {VOTE_CHOICES.concat(selected.allow_notes_vote ? [NOTES_CHOICE] : []).map(opt => {
                              const c = VOTE_COLORS[opt]; const active = f.choice === opt;
                              return (
                                <button key={opt} type="button" onClick={() => setUnit(u, { choice: opt })}
                                  style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? c.color : 'var(--border)'}`, background: active ? c.bg : '#fff', color: active ? c.color : '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  {opt === NOTES_CHOICE ? 'Add Notes or Request Changes in Place of Vote' : opt}
                                </button>
                              );
                            })}
                          </div>
                          <textarea value={f.note} onChange={e => setUnit(u, { note: e.target.value })} rows={2} placeholder={f.choice === NOTES_CHOICE ? 'Your notes or requested changes (required)' : 'Add a note (optional)'} style={{ ...inp, marginTop: 0, resize: 'vertical' }} />
                        </div>
                      );
                    })}
                    <button className="btn-gold" onClick={submitVote} disabled={saving || !unitsOf(selected, parts).every(unitReady)}>
                      {saving ? 'Saving…' : iMine(selected) ? 'Update Vote' : 'Submit Vote'}
                    </button>
                    {partsOf(selected, parts).length > 1 && !unitsOf(selected, parts).every(unitReady) && <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>Choose an answer for every item above to submit.</div>}
                  </div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#888', fontWeight: 600, marginBottom: 10 }}>
                    Vote Status · {votedCount(selected, parts, votes, members)}/{members.length} submitted
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {members.map(m => {
                      const done = hasVotedAll(selected, parts, votes, m.id);
                      return (
                        <div key={m.id} style={{ background: '#fafafa', borderRadius: 6, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{volName(m)}</span>
                          {done ? <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Voted</span> : <span style={{ fontSize: 12, color: '#bbb' }}>No vote yet</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020, padding: 20 }}>
          <form onSubmit={submitTopic} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New Committee Vote</div>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#bbb' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Title *</label><input value={topicForm.title} onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} style={inp} autoFocus /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Description</label><textarea value={topicForm.description} onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} /></div>

            <div style={{ marginBottom: 14, background: '#faf8f5', border: '0.5px solid #e8e0d5', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Items to vote on (optional)</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Add separate items under this one title and members vote on each. Leave empty for a single yes/no on the whole listing.</div>
              {topicForm.parts.map((p, i) => (
                <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input value={p.title} onChange={e => setPart(i, { title: e.target.value })} placeholder={`Item ${i + 1} title`} style={{ ...inp, marginTop: 0 }} />
                    <input value={p.description} onChange={e => setPart(i, { description: e.target.value })} placeholder="Details (optional)" style={{ ...inp, marginTop: 4, fontSize: 12 }} />
                  </div>
                  <button type="button" onClick={() => setTopicForm(f => ({ ...f, parts: f.parts.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', padding: '4px 6px' }} aria-label="Remove item">×</button>
                </div>
              ))}
              <button type="button" className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setTopicForm(f => ({ ...f, parts: [...f.parts, { title: '', description: '' }] }))}>+ Add an item to vote on</button>
            </div>

            <div style={{ marginBottom: 14 }}><label style={lbl}>Link to materials (Drive, document, etc.)</label><input value={topicForm.attachment_url} onChange={e => setTopicForm(f => ({ ...f, attachment_url: e.target.value }))} placeholder="https://" style={inp} /></div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label style={lbl}>Vote due</label><input type="date" value={topicForm.due_date} onChange={e => setTopicForm(f => ({ ...f, due_date: e.target.value }))} style={inp} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Meeting date</label><input type="date" value={topicForm.meeting_date} onChange={e => setTopicForm(f => ({ ...f, meeting_date: e.target.value }))} style={inp} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18 }}>
              <input type="checkbox" checked={topicForm.allow_notes_vote} onChange={e => setTopicForm(f => ({ ...f, allow_notes_vote: e.target.checked }))} />
              Allow "Notes or Request Changes in Place of Vote"
            </label>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 14 }}>Votes stay hidden until everyone has voted or the due date arrives.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-gold" disabled={saving || !topicForm.title.trim()}>{saving ? 'Saving…' : 'Open Vote'}</button>
            </div>
          </form>
        </div>
      )}

      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Vote Admin</div>
              <button onClick={() => setShowAdmin(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#bbb' }}>×</button>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.length === 0 && <div style={{ color: '#bbb', textAlign: 'center', padding: 30 }}>No votes.</div>}
              {[...openItems, ...closedItems].map(item => {
                const isOpen = !revealed(item);
                const units = unitsOf(item, parts);
                return (
                  <div key={item.id} style={{ background: '#faf8f5', border: '0.5px solid #e8e0d5', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{item.title} {!isOpen && <span style={{ fontSize: 11, color: '#2e7d32' }}>(Closed)</span>}</div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{votedCount(item, parts, votes, members)}/{members.length} voted</div>
                      {units.map(u => {
                        const t = tally(item, u, votes);
                        const won = t.yes > t.no && t.yes > 0;
                        return (
                          <div key={key(u)} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                              {u.id && <span style={{ fontWeight: 600 }}>{u.title}</span>}
                              <span style={{ color: '#2e7d32', fontWeight: 600 }}>{t.yes} Yes</span><span style={{ color: '#c62828', fontWeight: 600 }}>{t.no} No</span>
                              <span style={{ color: '#7c3aed', fontWeight: 600 }}>{t.abstain + t.notes} Abstain/Notes</span>
                              {won && <span style={{ fontSize: 10, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 20 }}>Majority Yes</span>}
                            </div>
                            {members.map(m => {
                              const mv = voteOf(item, u, votes, m.id);
                              return (
                                <div key={m.id} style={{ fontSize: 12, marginTop: 3 }}>
                                  <span style={{ display: 'inline-block', width: 130, fontWeight: 500 }}>{volName(m)}</span>
                                  {mv ? <Pill choice={mv.choice} /> : <span style={{ color: '#bbb' }}>No vote</span>}
                                  {mv && mv.note && <div style={{ color: '#777', fontStyle: 'italic', marginLeft: 130 }}>{mv.note}</div>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {item.status !== 'Closed' && <button disabled={busyId === item.id} onClick={() => doClose(item)} style={{ ...btnOutline, fontWeight: 600 }}>{busyId === item.id ? '…' : 'Close Vote'}</button>}
                      <button disabled={busyId === item.id} onClick={() => doDelete(item)} style={{ ...btnOutline, color: '#c0392b', border: '0.5px solid #f0c9c2', fontWeight: 600 }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Results({ item, parts, votes, members }) {
  const units = unitsOf(item, parts);
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#888', fontWeight: 600, marginBottom: 12 }}>Results</div>
      {units.map((u, idx) => {
        const t = tally(item, u, votes);
        const boxes = [
          { label: 'Yes', n: t.yes, bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32' },
          { label: 'No', n: t.no, bg: '#ffebee', border: '#ef9a9a', color: '#c62828' },
          { label: 'Abstain / Notes', n: t.abstain + t.notes, bg: '#f3f0ff', border: '#c4b5fd', color: '#7c3aed' },
        ];
        return (
          <div key={u.id || 'whole'} style={{ marginBottom: 26 }}>
            {u.id && <div style={{ fontSize: 15, fontWeight: 600, color: '#2a2a2a', marginBottom: 10 }}>{idx + 1}. {u.title}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {boxes.map(b => (
                <div key={b.label} style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: 4, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: b.color, lineHeight: 1 }}>{b.n}</div>
                  <div style={{ fontSize: 12, color: b.color, fontWeight: 600, marginTop: 4, opacity: 0.8 }}>{b.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(m => {
                const mv = voteOf(item, u, votes, m.id);
                return (
                  <div key={m.id} style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 2, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500 }}>{volName(m)}</span><span style={{ color: '#999' }}>—</span>
                      {mv ? <Pill choice={mv.choice} /> : <span style={{ color: '#777', fontSize: 12 }}>No vote</span>}
                      {mv && mv.changed_in_meeting && <span style={{ fontSize: 11, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>Changed in meeting</span>}
                    </div>
                    {mv && mv.note && <div style={{ fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic' }}>{mv.note}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
