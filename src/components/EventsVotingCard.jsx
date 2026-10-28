import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchAllActiveVolunteers, fetchVoteItems, fetchVotes, fetchVoteParts } from '../lib/db.js';
import { committeeMembers, isRevealed, hasVotedAll } from '../lib/eventsVoting.js';

// Dashboard card for Events Committee members: votes waiting, and which ones still need your vote.
export default function EventsVotingCard({ flush = false }) {
  const { volunteer, setView } = useVol();
  const [state, setState] = useState(null);

  useEffect(() => {
    Promise.all([fetchVoteItems(), fetchVotes(), fetchVoteParts(), fetchAllActiveVolunteers()])
      .then(([items, votes, parts, vols]) => {
        const m = committeeMembers(Array.isArray(vols) ? vols : []);
        const members = m.some(v => String(v.id) === String(volunteer.id)) ? m : [...m, volunteer];
        const open = items.filter(i => !isRevealed(i, parts, votes, members));
        setState({ open, votes, parts });
      })
      .catch(() => setState({ open: [], votes: [], parts: [] }));
  }, []);

  const me = String(volunteer.id);
  const needs = state ? state.open.filter(i => !hasVotedAll(i, state.parts, state.votes, me)) : [];

  return (
    <div className="card" style={{ marginTop: flush ? 0 : 14, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gold)', padding: '9px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 17, fontFamily: "'Cardo','Georgia',serif", fontWeight: 700, color: '#fff' }}>Committee Voting</span></div>
        {state && needs.length > 0 && <span style={{ background: '#fff3e0', color: '#e65100', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 4 }}>{needs.length} need{needs.length === 1 ? 's' : ''} your vote</span>}
      </div>
      <div style={{ padding: '14px 18px 18px' }}>
      {!state ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>
      ) : state.open.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>No open votes right now.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #e6d9bf' }}>
          {state.open.slice(0, 3).map(i => {
            const voted = hasVotedAll(i, state.parts, state.votes, me);
            return (
              <div key={i.id} onClick={() => setView('events-committee-voting')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '11px 4px', borderBottom: '1px solid #e6d9bf' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{i.title}</span>
                {voted ? <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Voted</span> : <span style={{ fontSize: 12, color: '#e65100', fontWeight: 600 }}>Vote</span>}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => setView('events-committee-voting')} className="btn-ghost" style={{ width: '100%', marginTop: 12 }}>Open Committee Voting</button>
      </div>
    </div>
  );
}
