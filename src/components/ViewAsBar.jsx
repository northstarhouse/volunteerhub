// Staff-only: preview the Hub the way each committee sees it. Only the team tags change; the signed-in
// person (votes, hours, profile saves) stays the same.
export const VIEW_AS_OPTIONS = [
  { label: 'My own view', team: '' },
  { label: 'Events Committee', team: 'Events Team' },
  { label: 'Construction', team: 'Construction' },
  { label: 'Grounds', team: 'Grounds' },
  { label: 'Interiors', team: 'Interiors' },
  { label: 'Docents', team: 'Docent' },
  { label: 'Fundraising', team: 'Fundraising' },
  { label: 'Marketing', team: 'Marketing' },
  { label: 'Venue', team: 'Venue' },
  { label: 'Board Member', team: 'Board Member' },
  { label: 'Team Lead', team: 'Team Lead' },
  { label: 'General volunteer (no team)', team: 'General' },
];

export default function ViewAsBar({ viewAs, setViewAs }) {
  const active = !!viewAs;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: active ? '#fff7e6' : '#f6f3ee', borderBottom: '0.5px solid var(--border)', fontSize: 12, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, color: 'var(--gold)', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 11 }}>Staff</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555' }}>
        View the Hub as
        <select value={viewAs} onChange={e => setViewAs(e.target.value)} style={{ padding: '4px 8px', border: '0.5px solid var(--border)', borderRadius: 4, fontSize: 12, background: '#fff' }}>
          {VIEW_AS_OPTIONS.map(o => <option key={o.label} value={o.team}>{o.label}</option>)}
        </select>
      </label>
      {active && <span style={{ color: '#b45309' }}>Previewing. Your own votes and profile are unchanged.</span>}
    </div>
  );
}
