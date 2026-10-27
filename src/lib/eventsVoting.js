// Shared rules for Events Committee voting (page + dashboard card).
import { matchVolunteerAreas } from './db.js';

export const VOTE_CHOICES = ['Yes', 'No', 'Abstain'];
export const NOTES_CHOICE = 'Notes or Request Changes in Place of Vote';

export const VOTE_COLORS = {
  Yes:     { bg: '#e8f5e9', color: '#2e7d32' },
  No:      { bg: '#ffebee', color: '#c62828' },
  Abstain: { bg: '#f3f0ff', color: '#7c3aed' },
  [NOTES_CHOICE]: { bg: '#fff3e0', color: '#e65100' },
};

export const volName = (v) => `${v['First Name'] || ''} ${v['Last Name'] || ''}`.trim();

// Committee members = active volunteers on the Events team.
export function committeeMembers(volunteers) {
  return (volunteers || []).filter(v => matchVolunteerAreas(v.Team).includes('Events'));
}

// One listing can hold several parts, each voted on separately. An item with no parts is voted on as a whole
// (its single "unit" has id null).
export const partsOf = (item, parts) => (parts || []).filter(p => p.item_id === item.id).sort((a, b) => a.sort_order - b.sort_order);
export const unitsOf = (item, parts) => { const p = partsOf(item, parts); return p.length ? p : [{ id: null, title: item.title }]; };

export const itemVotes = (item, votes) => votes.filter(v => v.item_id === item.id);
export const unitVotes = (item, unit, votes) => itemVotes(item, votes).filter(v => (v.part_id || null) === unit.id);
export const voteOf = (item, unit, votes, voterId) => unitVotes(item, unit, votes).find(v => String(v.voter_id) === String(voterId));

// A member has voted once they have answered every part.
export function hasVotedAll(item, parts, votes, voterId) {
  return unitsOf(item, parts).every(u => !!voteOf(item, u, votes, voterId));
}
export const votedCount = (item, parts, votes, members) => members.filter(m => hasVotedAll(item, parts, votes, m.id)).length;

// Hidden until everyone has voted on everything, the due date arrives, or the vote is closed.
export function isRevealed(item, parts, votes, members) {
  if (item.status === 'Closed') return true;
  const allVoted = members.length > 0 && members.every(m => hasVotedAll(item, parts, votes, m.id));
  const pastDue = item.due_date && item.due_date <= new Date().toISOString().slice(0, 10);
  return allVoted || !!pastDue;
}

export function tally(item, unit, votes) {
  const iv = unitVotes(item, unit, votes);
  const count = (c) => iv.filter(v => v.choice === c).length;
  return { yes: count('Yes'), no: count('No'), abstain: count('Abstain'), notes: count(NOTES_CHOICE) };
}
