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

export const itemVotes = (item, votes) => votes.filter(v => v.item_id === item.id);

// Hidden until everyone has voted, the due date arrives, or the vote is closed.
export function isRevealed(item, votes, members) {
  if (item.status === 'Closed') return true;
  const iv = itemVotes(item, votes);
  const allVoted = members.length > 0 && members.every(m => iv.some(v => String(v.voter_id) === String(m.id)));
  const pastDue = item.due_date && item.due_date <= new Date().toISOString().slice(0, 10);
  return allVoted || !!pastDue;
}

export function tally(item, votes) {
  const iv = itemVotes(item, votes);
  const count = (c) => iv.filter(v => v.choice === c).length;
  return { yes: count('Yes'), no: count('No'), abstain: count('Abstain'), notes: count(NOTES_CHOICE) };
}
