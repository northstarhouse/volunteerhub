import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { fetchEventOverviewData, fetchEventOverviewTab } from '../lib/db.js';
import { buildEventOverviews, eventKey } from '../lib/eventOverviews.js';

const PlanningNotes = lazy(() => import('./EventsCommittee.jsx'));
const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const dateLabel = date => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set';
const muted = { fontSize: 13, color: 'var(--muted)' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 14 };

function Stat({ label, value, note }) {
  return <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
    <div style={muted}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
    {note && <div style={muted}>{note}</div>}
  </div>;
}

function FinancialRows({ card }) {
  return <>
    <section className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Other Earnings</h3>
      {!card.earningsRows.length && <p style={muted}>No earnings logged yet.</p>}
      {card.earningsRows.map((row, i) => <div key={row.id ?? i} className="event-financial-row">
        <span>{row.earning_source || 'Earning'}{row.notes ? ` — ${row.notes}` : ''}</span>
        <strong style={{ color: '#2e7d32' }}>{money(row.amount)}</strong>
      </div>)}
    </section>
    <section className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Expenses &amp; Reimbursements</h3>
      {!card.expenseRows.length && <p style={muted}>No expenses logged yet.</p>}
      {card.expenseRows.map((row, i) => {
        const who = row.purchased_by || row.volunteer_name;
        const status = row.needs_reimbursement ? (row.volunteer_auth_user_id ? row.status || 'Submitted' : 'Pending') : null;
        return <div key={row.id ?? i} className="event-financial-row">
          <span>{row.description}{who ? ` — ${who}` : ''}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {status && <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: 10 }}>{status}</span>}
            <strong style={{ color: '#a45029' }}>{money(row.amount)}</strong>
          </span>
        </div>;
      })}
    </section>
  </>;
}

function EventDetail({ card, onBack }) {
  return <>
    <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>← All Events</button>
    <section className="card" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: "'Cardo','Georgia',serif" }}>{card.name}</h2>
        <div style={muted}>{dateLabel(card.date)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
          <Stat label="Ticket Sales" value={money(card.ticketRevenue)} note={`${card.ticketQty} sold${card.rsvpQty ? `, ${card.rsvpQty} RSVP` : ''}`} />
          <Stat label="Other Earnings" value={money(card.earnings)} />
          <Stat label="Expenses" value={money(card.costs)} />
          <Stat label="Net" value={money(card.ticketNet + card.net)} />
        </div>
      </div>
      {card.image_url && <img src={card.image_url} alt={`${card.name} flyer`} decoding="async" style={{ width: 260, maxWidth: '100%', maxHeight: 360, objectFit: 'contain', alignSelf: 'center', borderRadius: 8 }} />}
    </section>
    <section className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Marketing Checklist <span style={muted}>({card.checklist.filter(item => item.done).length}/{card.checklist.length} done)</span></h3>
      {!card.checklist.length && <p style={muted}>No marketing checklist items yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {card.checklist.map((item, i) => <li key={i} style={{ padding: '7px 0', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)' }}>
          <span aria-label={item.done ? 'Completed' : 'Not completed'} style={{ color: 'var(--gold)' }}>{item.done ? '✓' : '○'}</span>
          <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--muted)' : 'var(--text)' }}>{item.label}</span>
        </li>)}
      </ul>
    </section>
    <section className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Website Ticket Sales</h3>
      {!card.ticketQty && !card.rsvpQty ? <p style={muted}>No website ticket orders for this event yet.</p> :
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13 }}>
          <span><b>{card.ticketQty}</b> tickets sold</span>
          {card.rsvpQty > 0 && <span><b>{card.rsvpQty}</b> RSVPs</span>}
          <span>Gross <b>{money(card.ticketRevenue)}</b></span>
          <span>Fees <b>{money(card.ticketFees)}</b></span>
          <span>Net <b>{money(card.ticketNet)}</b></span>
        </div>}
    </section>
    <FinancialRows card={card} />
  </>;
}

function EventCards({ title, cards, onSelect }) {
  return <section style={{ marginBottom: 28 }}>
    <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)' }}>{title}</h2>
    {!cards.length ? <p style={muted}>No {title.toLowerCase()} yet.</p> : <div style={grid}>
      {cards.map(card => <button key={eventKey(card.name)} className="card" onClick={() => onSelect(eventKey(card.name))} style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', color: 'var(--text)' }}>
        <div style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg,#f0ebe2,#e4d9c6)' }}>
          {card.image_url && <img src={card.image_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{card.name}</div>
          <div style={{ ...muted, marginTop: 4 }}>{dateLabel(card.date)}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13 }}>
            <span style={{ color: '#2e7d32' }}>{money(card.earnings + card.ticketRevenue)}</span>
            <span style={{ color: '#a45029' }}>−{money(card.costs)}</span>
          </div>
        </div>
      </button>)}
    </div>}
  </section>;
}

function ExtraTab({ tab }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setRows(null); setError('');
    fetchEventOverviewTab(tab).then(data => { if (active) setRows(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [tab, attempt]);
  if (error) return <div role="alert">{error} <button className="btn-ghost" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>;
  if (!rows) return <p role="status" style={muted}>Loading…</p>;
  if (!rows.length) return <p style={muted}>{tab === 'feedback' ? 'No reviews or feedback yet.' : 'No saved plans yet.'}</p>;
  return <div style={{ display: 'grid', gap: 14 }}>{rows.map(row => tab === 'feedback' ?
    <article key={row.id} className="card">
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{row.event_name}</h3>
      <div style={muted}>{[row.source, row.name, row.role, row.date ? dateLabel(row.date) : ''].filter(Boolean).join(' · ')}</div>
      <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{row.feedback}</p>
    </article> : <article key={row.id} className="card">
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{row.name}</h3>
      {row.data?.title && row.data.title !== row.name && <p>{row.data.title}</p>}
      <p style={muted}>{[row.data?.dateLine, row.data?.timeLine].filter(Boolean).join(' · ')}</p>
      <a className="btn-ghost" href={`https://northstarhouse.github.io/Portal/#event-plan/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', textDecoration: 'none' }}>View Plan ↗</a>
    </article>)}</div>;
}

export default function EventOverviews() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    fetchEventOverviewData().then(rows => { if (active) setData(rows); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const { cards, financials } = useMemo(() => data ? buildEventOverviews(data) : { cards: [], financials: [] }, [data]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = cards.filter(c => c.date && new Date(`${c.date}T00:00:00`) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = cards.filter(c => !c.date || new Date(`${c.date}T00:00:00`) < today).sort((a, b) => a.date && b.date ? b.date.localeCompare(a.date) : a.date ? -1 : b.date ? 1 : 0);
  const card = cards.find(c => eventKey(c.name) === selected);
  const totals = financials.reduce((sum, g) => ({ earnings: sum.earnings + g.earnings, costs: sum.costs + g.costs }), { earnings: 0, costs: 0 });

  if (tab === 'planning') return <>
    <button className="btn-ghost" onClick={() => { setTab('overview'); setAttempt(n => n + 1); }} style={{ margin: 14 }}>← Event Overviews</button>
    <Suspense fallback={<p role="status" style={{ padding: 20 }}>Loading planning notes…</p>}><PlanningNotes /></Suspense>
  </>;

  return <div>
    <header style={{ padding: '22px 20px 16px', background: '#fff', borderBottom: '1px solid var(--border-light)' }}>
      <div className="label">Events Committee</div>
      <h1 style={{ margin: '4px 0 8px', fontSize: 22, color: 'var(--gold)', fontFamily: "'Cardo','Georgia',serif" }}>Event Overviews</h1>
      <div style={muted}>Event flyers, ticket sales, marketing checklists, and expenses.</div>
    </header>
    <div style={{ padding: '16px 20px 24px' }}>
      <nav aria-label="Event sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {[['overview', 'Events'], ['pnl', 'Profit & Loss'], ['feedback', 'Reviews & Feedback'], ['plans', 'Saved Plans'], ['planning', 'Planning Notes']].map(([key, label]) =>
          <button key={key} className={tab === key ? 'btn-gold' : 'btn-ghost'} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setSelected(null); }}>{label}</button>)}
        <button className="btn-ghost" disabled={loading} onClick={() => setAttempt(n => n + 1)}>Refresh</button>
      </nav>
      {tab === 'feedback' || tab === 'plans' ? <ExtraTab key={`${tab}-${attempt}`} tab={tab} /> : error ?
        <div className="card" role="alert">{error} <button className="btn-ghost" onClick={() => setAttempt(n => n + 1)}>Retry</button></div> : loading ?
          <p role="status" style={muted}>Loading event overviews…</p> : tab === 'overview' ? card ? <EventDetail card={card} onBack={() => setSelected(null)} /> : <>
            <EventCards title="Upcoming Events" cards={upcoming} onSelect={setSelected} />
            <EventCards title="Past Events" cards={past} onSelect={setSelected} />
          </> : <>
            <div style={grid}>
              <Stat label="Earnings" value={money(totals.earnings)} />
              <Stat label="Costs" value={money(totals.costs)} />
              <Stat label="Net" value={money(totals.earnings - totals.costs)} />
            </div>
            {!financials.length && <p style={muted}>No financial entries recorded yet.</p>}
            {financials.map(g => <details key={g.name} className="card" style={{ marginTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14 }}><strong>{g.name}</strong> · Earnings {money(g.earnings)} · Costs {money(g.costs)} · Net {money(g.net)}</summary>
              {g.date && <p style={muted}>{dateLabel(g.date)}</p>}
              <FinancialRows card={g} />
            </details>)}
          </>}
    </div>
  </div>;
}
