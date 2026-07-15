import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import {
  matchVolunteerAreas, AREA_DEFAULTS, currentQuarterStr, photoUrl,
  fetchOperationalAreaInfo, fetchOpBudget, fetchOpEarnings, fetchOpResources,
  fetchOpQuarterGoals, fetchOpQuarterlyUpdate, fetchAllActiveVolunteers,
} from '../lib/db.js';

const GOLD = '#886c44';

const STATUS_COLORS = {
  'On Track': { bg: '#e8f5e9', color: '#2e7d32' },
  'At Risk':  { bg: '#fff8e1', color: '#8a6200' },
  'Behind':   { bg: '#ffebee', color: '#b71c1c' },
  'Off Track': { bg: '#ffebee', color: '#b71c1c' },
};
const statusStyle = (s) => STATUS_COLORS[s] || { bg: '#f0ebe2', color: GOLD };

function fmt(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function Avatar({ v, size = 34 }) {
  const initials = `${(v['First Name'] || '')[0] || ''}${(v['Last Name'] || '')[0] || ''}`.toUpperCase();
  const url = photoUrl(v['Picture URL']);
  return url ? (
    <img src={url} alt={initials} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
      {initials || '?'}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function BudgetCard({ area, budget }) {
  const spent = budget.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const allocation = AREA_DEFAULTS[area]?.budget ?? null;
  const pct = allocation ? Math.min(100, Math.round((spent / allocation) * 100)) : 0;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <SectionLabel>Budget</SectionLabel>
      <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{fmt(spent)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/ {allocation != null ? fmt(allocation) : '—'}</span></div>
      {allocation != null && (
        <div style={{ height: 6, background: '#f0ebe2', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: GOLD, borderRadius: 4 }} />
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{budget.length} {budget.length === 1 ? 'entry' : 'entries'} this year</div>
    </div>
  );
}

function EarningsCard({ earnings }) {
  const total = earnings.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <SectionLabel>Earnings</SectionLabel>
      <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{fmt(total)}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{earnings.length} {earnings.length === 1 ? 'entry' : 'entries'}</div>
    </div>
  );
}

function GoalsCard({ quarter, goals }) {
  const rows = goals ? [
    [goals.goal_1, goals.goal_1_status, goals.goal_1_summary],
    [goals.goal_2, goals.goal_2_status, goals.goal_2_summary],
    [goals.goal_3, goals.goal_3_status, goals.goal_3_summary],
  ].filter(([g]) => g) : [];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <SectionLabel>{quarter} Goals</SectionLabel>
      {!goals || rows.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No goals set for this quarter yet.</div>
      ) : (
        <>
          {goals.primary_focus && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', fontWeight: 600 }}>Primary Focus</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>{goals.primary_focus}</div>
            </div>
          )}
          {rows.map(([goal, status, summary], i) => {
            const s = statusStyle(status);
            return (
              <div key={i} style={{ marginBottom: i < rows.length - 1 ? 10 : 0, paddingBottom: i < rows.length - 1 ? 10 : 0, borderBottom: i < rows.length - 1 ? '0.5px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{goal}</div>
                  {status && <span style={{ fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap', flexShrink: 0 }}>{status}</span>}
                </div>
                {summary && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{summary}</div>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ReflectionCard({ update }) {
  if (!update) return null;
  const wentWell = update.what_went_well || update.successes;
  if (!wentWell && !update.challenges) return null;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <SectionLabel>Latest Reflection</SectionLabel>
      {wentWell && (
        <div style={{ marginBottom: update.challenges ? 10 : 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', fontWeight: 600 }}>What Went Well</div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 3 }}>{wentWell}</div>
        </div>
      )}
      {update.challenges && (
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', fontWeight: 600 }}>Challenges</div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 3 }}>{Array.isArray(update.challenges) ? update.challenges.join(', ') : update.challenges}</div>
        </div>
      )}
    </div>
  );
}

function ResourcesCard({ resources }) {
  if (resources.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <SectionLabel>Resources</SectionLabel>
      {resources.map((r, i) => (
        <div key={r.id ?? i} style={{ marginBottom: i < resources.length - 1 ? 8 : 0 }}>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: GOLD, textDecoration: 'none' }}>{r.title || r.url}</a>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{r.title}</span>
          )}
          {r.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.description}</div>}
        </div>
      ))}
    </div>
  );
}

function RosterCard({ area, roster }) {
  return (
    <div className="card">
      <SectionLabel>{area} Team ({roster.length})</SectionLabel>
      {roster.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No one else tagged to this area yet.</div>
      ) : roster.map((v, i) => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < roster.length - 1 ? 10 : 0 }}>
          <Avatar v={v} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v['First Name']} {v['Last Name']}</div>
        </div>
      ))}
    </div>
  );
}

function AreaDetail({ area, showBack, onBack }) {
  const [areaInfo, setAreaInfo]     = useState(null);
  const [budget, setBudget]         = useState([]);
  const [earnings, setEarnings]     = useState([]);
  const [resources, setResources]   = useState([]);
  const [goals, setGoals]           = useState(null);
  const [update, setUpdate]         = useState(null);
  const [roster, setRoster]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const quarter = currentQuarterStr();
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchOperationalAreaInfo(area),
      fetchOpBudget(area),
      area === 'Events' ? fetchOpEarnings(area) : Promise.resolve([]),
      fetchOpResources(area),
      fetchOpQuarterGoals(area, quarter, year),
      fetchOpQuarterlyUpdate(area, quarter, year),
      fetchAllActiveVolunteers(),
    ]).then(([info, budgetRows, earningsRows, resourceRows, goalRows, updateRow, vols]) => {
      if (cancelled) return;
      setAreaInfo(info);
      setBudget(budgetRows);
      setEarnings(earningsRows);
      setResources(resourceRows);
      setGoals(goalRows);
      setUpdate(updateRow);
      setRoster((Array.isArray(vols) ? vols : []).filter(v => matchVolunteerAreas(v.Team).includes(area)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [area]);

  const defaults = AREA_DEFAULTS[area] || {};
  const lead = area === 'Venue' ? 'Staff' : (areaInfo?.lead || defaults.lead || '');

  return (
    <div style={{ padding: '16px 20px 24px' }}>
      {showBack && (
        <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 14, fontSize: 12, padding: '6px 12px' }}>← My Areas</button>
      )}
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        {defaults.pic ? (
          <img src={photoUrl(defaults.pic)} alt={lead} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: GOLD }}>
            {lead ? lead[0] : '?'}
          </div>
        )}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--text)' }}>{area}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Led by {lead || 'TBD'}</div>
        </div>
      </div>

      {area === 'Events' && (
        <a href={`${import.meta.env.BASE_URL}events-committee.html`} target="_blank" rel="noreferrer"
          className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 14 }}>
          Events Committee Planning Notes
        </a>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Loading…</div>
      ) : (
        <>
          <BudgetCard area={area} budget={budget} />
          {area === 'Events' && <EarningsCard earnings={earnings} />}
          <GoalsCard quarter={quarter} goals={goals} />
          <ReflectionCard update={update} />
          <ResourcesCard resources={resources} />
          <RosterCard area={area} roster={roster} />
        </>
      )}
    </div>
  );
}

export default function OperationalAreas() {
  const { volunteer, currentArea, setCurrentArea } = useVol();
  const myAreas = matchVolunteerAreas(volunteer.Team);
  const selected = myAreas.includes(currentArea) ? currentArea : (myAreas.length === 1 ? myAreas[0] : null);

  useEffect(() => {
    if (!currentArea && myAreas.length === 1) setCurrentArea(myAreas[0]);
  }, [currentArea]);

  if (myAreas.length === 0) {
    return (
      <div style={{ padding: '16px 20px 24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>You're not currently tagged to an operational area. Contact your coordinator if that seems wrong.</div>
        </div>
      </div>
    );
  }

  if (selected) {
    return <AreaDetail area={selected} showBack={myAreas.length > 1} onBack={() => setCurrentArea(null)} />;
  }

  return (
    <div style={{ padding: '16px 20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>My Operational Areas</div>
      {myAreas.map(area => (
        <button
          key={area}
          onClick={() => setCurrentArea(area)}
          className="card"
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer', border: '0.5px solid var(--border-light)' }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{area}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Led by {AREA_DEFAULTS[area]?.lead || 'TBD'}</div>
        </button>
      ))}
    </div>
  );
}
