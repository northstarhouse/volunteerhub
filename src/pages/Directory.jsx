import { useState, useEffect, useMemo } from 'react';
import { fetchAllActiveVolunteers, photoUrl } from '../lib/db.js';

const TEAM_COLORS = {
  'Staff':             { bg: '#f3f3f3', color: '#555' },
  'Board Member':      { bg: '#fce4ec', color: '#880e4f' },
  'Grounds':           { bg: '#e8f5e9', color: '#2e7d32' },
  'Construction':      { bg: '#fff3e0', color: '#e65100' },
  'Events Team':       { bg: '#e3f2fd', color: '#1565c0' },
  'Event Support':     { bg: '#e8eaf6', color: '#3949ab' },
  'Interiors':         { bg: '#f3e5f5', color: '#6a1b9a' },
  'Fundraising':       { bg: '#fff8e1', color: '#8a6200' },
  'Docent':            { bg: '#fbe9e7', color: '#8d3d2b' },
  'Marketing':         { bg: '#fce4ec', color: '#c2185b' },
  'Volunteer Exchange':{ bg: '#e8f4fd', color: '#0d6eab' },
  'Venue':             { bg: '#ede7f6', color: '#4527a0' },
  'Garden':            { bg: '#e8f5e9', color: '#2e7d32' },
};

function getTeamColor(t) {
  return TEAM_COLORS[t] || { bg: 'var(--light)', color: 'var(--gold)' };
}

function VolCard({ vol, expanded, onClick }) {
  const initials = `${(vol['First Name'] || '')[0] || ''}${(vol['Last Name'] || '')[0] || ''}`.toUpperCase();
  const teams = (vol['Team'] || '').split('|').map(t => t.trim()).filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        boxShadow: expanded ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {vol['Picture URL'] ? (
          <img src={photoUrl(vol['Picture URL'])} alt={initials} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
            {initials || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vol['First Name']} {vol['Last Name']}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {teams.slice(0, 2).map(t => {
              const c = getTeamColor(t);
              return <span key={t} className="badge" style={{ background: c.bg, color: c.color, fontSize: 10 }}>{t}</span>;
            })}
          </div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--border-light)' }}>
          {vol['Email'] && (
            <div style={{ marginBottom: 8 }}>
              <div className="label">Email</div>
              <a href={`mailto:${vol['Email']}`} style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>{vol['Email']}</a>
            </div>
          )}
          {vol['Phone Number'] && (
            <div style={{ marginBottom: 8 }}>
              <div className="label">Phone</div>
              <a href={`tel:${vol['Phone Number']}`} style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>{vol['Phone Number']}</a>
            </div>
          )}
          {vol['What they want to see at NSH'] && (
            <div style={{ marginBottom: 8 }}>
              <div className="label">About</div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{vol['What they want to see at NSH']}</div>
            </div>
          )}
          {vol['Allergies'] && (
            <div style={{ marginBottom: 8 }}>
              <div className="label" style={{ color: '#c0392b' }}>⚠ Allergies</div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{vol['Allergies']}</div>
            </div>
          )}
          {!vol['Email'] && !vol['Phone Number'] && (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No contact info on file.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Directory() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [expanded, setExpanded]     = useState(null);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    fetchAllActiveVolunteers().then(vols => {
      setVolunteers(Array.isArray(vols) ? vols : []);
      setLoading(false);
    });
  }, []);

  const allTeams = useMemo(() => {
    const set = new Set();
    volunteers.forEach(v => {
      (v['Team'] || '').split('|').map(t => t.trim()).filter(Boolean).forEach(t => set.add(t));
    });
    return ['All', ...Array.from(set).sort()];
  }, [volunteers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return volunteers.filter(v => {
      const matchSearch = !q
        || `${v['First Name']} ${v['Last Name']}`.toLowerCase().includes(q)
        || (v['Email'] || '').toLowerCase().includes(q);
      const matchTeam = teamFilter === 'All'
        || (v['Team'] || '').split('|').map(t => t.trim()).includes(teamFilter);
      return matchSearch && matchTeam;
    });
  }, [volunteers, search, teamFilter]);

  function copyEmails() {
    const emails = filtered.map(v => v['Email']).filter(Boolean).join(', ');
    if (!emails) return;
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>
          {volunteers.length > 0 ? `${volunteers.length} Active Volunteers` : 'Directory'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Volunteer Directory</div>
      </div>

      <div style={{ padding: '12px 14px 0' }}>
        {/* Search */}
        <input
          className="input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpanded(null); }}
          style={{ marginBottom: 10 }}
        />

        {/* Team filter pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' }}>
          {allTeams.map(t => {
            const active = teamFilter === t;
            const c = t === 'All' ? { bg: 'var(--gold)', color: '#fff' } : getTeamColor(t);
            return (
              <button
                key={t}
                onClick={() => { setTeamFilter(t); setExpanded(null); }}
                style={{
                  flexShrink: 0,
                  background: active ? c.bg : '#fff',
                  color: active ? c.color : 'var(--muted)',
                  border: `0.5px solid ${active ? 'transparent' : 'var(--border)'}`,
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Copy emails bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{filtered.length} {filtered.length === 1 ? 'person' : 'people'}</div>
          <button
            onClick={copyEmails}
            disabled={!filtered.some(v => v['Email'])}
            style={{
              fontSize: 11,
              background: copied ? '#e8f5e9' : 'var(--light)',
              color: copied ? '#2e7d32' : 'var(--gold)',
              border: `0.5px solid ${copied ? '#a5d6a7' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '5px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : `Copy ${teamFilter === 'All' ? 'All' : teamFilter} Emails`}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>No results found.</div>
        ) : (
          filtered.map(vol => (
            <VolCard
              key={vol.id}
              vol={vol}
              expanded={expanded === vol.id}
              onClick={() => setExpanded(p => p === vol.id ? null : vol.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
