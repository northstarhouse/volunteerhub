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
    <div className="card" style={{ marginTop: flush ? 0 : 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 38, height: 38, borderRadius: 12, background: '#f0ece5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2a2a2a' }}><svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8.5l1.5 1.5 3-3"/><path d="M8.5 15h7"/><path d="M8.5 18h4"/></svg></span><span style={{ fontSize: 22, fontFamily: "'Cardo','Georgia',serif", fontWeight: 700, color: 'var(--gold)', textShadow: '1px 2px 0px rgba(136,108,68,0.2)' }}>Committee Voting</span></div>
        {state && needs.length > 0 && <span style={{ background: '#fff3e0', color: '#e65100', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 4 }}>{needs.length} need{needs.length === 1 ? 's' : ''} your vote</span>}
      </div>
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
                {voted ? <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontStyle: 'italic', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Voted</span> : <span style={{ fontSize: 12, color: '#e65100', fontWeight: 600 }}>Vote</span>}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => setView('events-committee-voting')} className="btn-ghost" style={{ width: '100%', marginTop: 12 }}>Open Committee Voting</button>
    </div>
  );
}
