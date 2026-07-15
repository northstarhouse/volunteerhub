import { useState, useEffect } from 'react';
import { fetchEventNames } from '../lib/db.js';

const cryptoId = () => Math.random().toString(36).slice(2, 10);
const nextDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set';
const fmtDateShort = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';

function emptyEvent(name) {
  return {
    id: cryptoId(), name, date: '', time: '', location: '', description: '', status: 'planning',
    tasks: [], budget: [], vendors: [], guestCount: { invited: 0, confirmed: 0 }, timeline: [],
    afterNotes: { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
  };
}
const money = (n) => `$${Number(n || 0).toLocaleString()}`;

const STATUS_STYLE = {
  planning:  { bg: '#fde8e0', fg: '#8a4a2e', label: 'Planning' },
  upcoming:  { bg: '#f0ebe2', fg: 'var(--gold)', label: 'Upcoming' },
  completed: { bg: '#e3f6ec', fg: '#4a5d3a', label: 'Completed' },
};

function seedEvents() {
  return [
    {
      id: cryptoId(), name: 'Autumn Fundraiser Gala', date: nextDate(18), time: '18:00',
      location: 'North Star House, Grass Valley', description: "Annual fundraiser for the conservancy, seated dinner + auction in the Julia Morgan-designed great hall.",
      status: 'upcoming',
      tasks: [
        { id: cryptoId(), text: 'Confirm caterer menu', done: true, due: nextDate(2), assignee: 'Haley' },
        { id: cryptoId(), text: 'Finalize auction item list', done: false, due: nextDate(10), assignee: 'Committee' },
        { id: cryptoId(), text: 'Send save-the-dates', done: true, due: nextDate(-4), assignee: 'Haley' },
      ],
      budget: [
        { id: cryptoId(), item: 'Catering', estimated: 4500, actual: 4200 },
        { id: cryptoId(), item: 'Venue rental', estimated: 1200, actual: 1200 },
        { id: cryptoId(), item: 'Decor & flowers', estimated: 600, actual: 0 },
      ],
      vendors: [
        { id: cryptoId(), name: 'Harvest Table Catering', role: 'Caterer', contact: 'hello@harvesttable.com', confirmed: true },
        { id: cryptoId(), name: 'Bloom & Vine', role: 'Florist', contact: 'orders@bloomvine.com', confirmed: false },
      ],
      guestCount: { invited: 180, confirmed: 96 },
      timeline: [
        { id: cryptoId(), time: '17:00', activity: 'Vendors arrive, setup begins' },
        { id: cryptoId(), time: '18:00', activity: 'Doors open, cocktail hour' },
        { id: cryptoId(), time: '19:00', activity: 'Dinner service begins' },
      ],
      afterNotes: { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
    },
    {
      id: cryptoId(), name: 'Docent Training Workshop', date: nextDate(-9), time: '10:00',
      location: 'Estate Library', description: 'New docent onboarding and house history walkthrough.',
      status: 'completed',
      tasks: [
        { id: cryptoId(), text: 'Print training packets', done: true, due: nextDate(-11), assignee: 'Haley' },
        { id: cryptoId(), text: 'Book room', done: true, due: nextDate(-14), assignee: 'Haley' },
      ],
      budget: [{ id: cryptoId(), item: 'Printed materials', estimated: 60, actual: 54 }],
      vendors: [],
      guestCount: { invited: 12, confirmed: 10 },
      timeline: [
        { id: cryptoId(), time: '10:00', activity: 'Welcome + house history overview' },
        { id: cryptoId(), time: '11:30', activity: 'Walkthrough tour practice' },
      ],
      afterNotes: {
        wentWell: 'Strong turnout, great questions during the walkthrough segment.',
        wentWrong: 'Ran fifteen minutes over schedule during Q&A.',
        finalAttendance: '10 of 12 invited',
        finalBudget: '$54 (under budget)',
        followUps: 'Send follow-up reading list, schedule shadow shifts.',
      },
    },
    {
      id: cryptoId(), name: 'Spring Volunteer Kickoff', date: nextDate(4), time: '09:30',
      location: 'Garden Pavilion', description: 'Kickoff for spring landscaping and grounds volunteer season.',
      status: 'planning',
      tasks: [{ id: cryptoId(), text: 'Draft volunteer schedule', done: false, due: nextDate(1), assignee: 'Haley' }],
      budget: [{ id: cryptoId(), item: 'Coffee & snacks', estimated: 80, actual: 0 }],
      vendors: [],
      guestCount: { invited: 35, confirmed: 8 },
      timeline: [],
      afterNotes: { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
    },
  ];
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.upcoming;
  return <span className="badge" style={{ background: s.bg, color: s.fg, fontWeight: 600 }}>{s.label}</span>;
}

// ── Home: list / calendar ──────────────────────────────────────────────────

function EventListRow({ ev, onOpen, onDelete }) {
  const doneT = ev.tasks.filter(t => t.done).length;
  return (
    <div className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => onOpen(ev.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{ev.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{ev.location || 'No location set'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: ev.date ? 'var(--text)' : '#c2410c' }}>{ev.date ? fmtDateShort(ev.date) : 'Needs a date'}</div>
          <div style={{ marginTop: 4 }}><StatusBadge status={ev.status} /></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {doneT}/{ev.tasks.length} tasks · {ev.guestCount.confirmed}/{ev.guestCount.invited} guests
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(ev); }}
          style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>
    </div>
  );
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function CalendarView({ events, calYear, setCalYear, onOpen }) {
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth();

  const byMonth = Array.from({ length: 12 }, () => []);
  const undated = [];
  events.forEach(ev => {
    if (!ev.date) { undated.push(ev); return; }
    const d = new Date(`${ev.date}T00:00:00`);
    if (d.getFullYear() === calYear) byMonth[d.getMonth()].push(ev);
  });
  byMonth.forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{calYear}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setCalYear(y => y - 1)}>← {calYear - 1}</button>
          {calYear !== todayYear && <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setCalYear(todayYear)}>Today</button>}
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setCalYear(y => y + 1)}>{calYear + 1} →</button>
        </div>
      </div>
      {undated.length > 0 && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 12, border: '1px solid #f0d0b8' }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 8, color: '#c2410c' }}>Needs a Date</div>
          {undated.map(ev => {
            const s = STATUS_STYLE[ev.status] || STATUS_STYLE.upcoming;
            return (
              <div key={ev.id} onClick={() => onOpen(ev.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.fg, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{ev.name}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {MONTH_NAMES.map((name, i) => {
          const isCurrentMonth = calYear === todayYear && i === todayMonth;
          const evs = byMonth[i];
          return (
            <div key={name} className="card" style={{ padding: '12px 14px', border: isCurrentMonth ? '1px solid var(--gold)' : undefined }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 8, color: isCurrentMonth ? 'var(--gold)' : 'var(--text)' }}>{name}</div>
              {evs.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No events</div>
              ) : evs.map(ev => {
                const s = STATUS_STYLE[ev.status] || STATUS_STYLE.upcoming;
                return (
                  <div key={ev.id} onClick={() => onOpen(ev.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.fg, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{fmtDateShort(ev.date)}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail tabs ─────────────────────────────────────────────────────────────

function OverviewTab({ ev }) {
  const doneT = ev.tasks.filter(t => t.done).length;
  const budgetTotal = ev.budget.reduce((s, b) => s + Number(b.estimated || 0), 0);
  const budgetActual = ev.budget.reduce((s, b) => s + Number(b.actual || 0), 0);
  const nextTasks = ev.tasks.filter(t => !t.done).slice(0, 4);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          [`${doneT}/${ev.tasks.length}`, 'Tasks done'],
          [`${ev.guestCount.confirmed}/${ev.guestCount.invited}`, 'Guests confirmed'],
          [`${ev.vendors.filter(v => v.confirmed).length}/${ev.vendors.length}`, 'Vendors confirmed'],
          [`${money(budgetActual)}`, `Spent of ${money(budgetTotal)}`],
        ].map(([num, lbl]) => (
          <div key={lbl} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{num}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Cardo','Georgia',serif" }}>What's next</div>
      {nextTasks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>All tasks complete.</div>
      ) : nextTasks.map(t => (
        <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 13 }}>{t.text}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.due ? fmtDateShort(t.due) : ''}</span>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ children, onDelete, done }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 6, opacity: done ? 0.6 : 1 }}>
      {children}
      {onDelete && <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>×</button>}
    </div>
  );
}

function PreplanningTab({ ev, onUpdate }) {
  const [taskForm, setTaskForm] = useState({ text: '', due: '', assignee: '' });
  const [budgetForm, setBudgetForm] = useState({ item: '', estimated: '', actual: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', role: '', contact: '' });
  const [guests, setGuests] = useState(ev.guestCount);

  function toggleTask(id) {
    onUpdate(e => ({ ...e, tasks: e.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }
  function deleteTask(id) {
    onUpdate(e => ({ ...e, tasks: e.tasks.filter(t => t.id !== id) }));
  }
  function addTask() {
    if (!taskForm.text.trim()) return;
    onUpdate(e => ({ ...e, tasks: [...e.tasks, { id: cryptoId(), text: taskForm.text.trim(), done: false, due: taskForm.due, assignee: taskForm.assignee.trim() }] }));
    setTaskForm({ text: '', due: '', assignee: '' });
  }

  function deleteBudget(id) {
    onUpdate(e => ({ ...e, budget: e.budget.filter(b => b.id !== id) }));
  }
  function addBudget() {
    if (!budgetForm.item.trim()) return;
    onUpdate(e => ({ ...e, budget: [...e.budget, { id: cryptoId(), item: budgetForm.item.trim(), estimated: Number(budgetForm.estimated) || 0, actual: Number(budgetForm.actual) || 0 }] }));
    setBudgetForm({ item: '', estimated: '', actual: '' });
  }

  function toggleVendor(id) {
    onUpdate(e => ({ ...e, vendors: e.vendors.map(v => v.id === id ? { ...v, confirmed: !v.confirmed } : v) }));
  }
  function deleteVendor(id) {
    onUpdate(e => ({ ...e, vendors: e.vendors.filter(v => v.id !== id) }));
  }
  function addVendor() {
    if (!vendorForm.name.trim()) return;
    onUpdate(e => ({ ...e, vendors: [...e.vendors, { id: cryptoId(), name: vendorForm.name.trim(), role: vendorForm.role.trim(), contact: vendorForm.contact.trim(), confirmed: false }] }));
    setVendorForm({ name: '', role: '', contact: '' });
  }

  function saveGuests() {
    onUpdate(e => ({ ...e, guestCount: { invited: Number(guests.invited) || 0, confirmed: Number(guests.confirmed) || 0 } }));
  }

  const sectionTitle = { fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Cardo','Georgia',serif" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={sectionTitle}>Task checklist</div>
        {ev.tasks.map(t => (
          <ItemRow key={t.id} done={t.done} onDelete={() => deleteTask(t.id)}>
            <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{t.assignee ? `${t.assignee} · ` : ''}{t.due ? fmtDateShort(t.due) : ''}</span>
          </ItemRow>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Add a task…" value={taskForm.text} onChange={e => setTaskForm(f => ({ ...f, text: e.target.value }))} />
          <input className="input" type="date" style={{ width: 130 }} value={taskForm.due} onChange={e => setTaskForm(f => ({ ...f, due: e.target.value }))} />
          <input className="input" style={{ width: 100 }} placeholder="Assignee" value={taskForm.assignee} onChange={e => setTaskForm(f => ({ ...f, assignee: e.target.value }))} />
          <button className="btn-gold" style={{ padding: '9px 14px' }} onClick={addTask}>Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={sectionTitle}>Budget</div>
        {ev.budget.map(b => (
          <ItemRow key={b.id} onDelete={() => deleteBudget(b.id)}>
            <span style={{ flex: 1, fontSize: 13 }}>{b.item}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Est. {money(b.estimated)}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Actual {money(b.actual)}</span>
          </ItemRow>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Line item…" value={budgetForm.item} onChange={e => setBudgetForm(f => ({ ...f, item: e.target.value }))} />
          <input className="input" type="number" style={{ width: 110 }} placeholder="Estimated" value={budgetForm.estimated} onChange={e => setBudgetForm(f => ({ ...f, estimated: e.target.value }))} />
          <input className="input" type="number" style={{ width: 100 }} placeholder="Actual" value={budgetForm.actual} onChange={e => setBudgetForm(f => ({ ...f, actual: e.target.value }))} />
          <button className="btn-gold" style={{ padding: '9px 14px' }} onClick={addBudget}>Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={sectionTitle}>Vendors & contacts</div>
        {ev.vendors.map(v => (
          <ItemRow key={v.id} onDelete={() => deleteVendor(v.id)}>
            <input type="checkbox" checked={v.confirmed} onChange={() => toggleVendor(v.id)} title="Confirmed" style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ flex: 1, fontSize: 13 }}>{v.name} <span style={{ color: 'var(--muted)' }}>— {v.role}</span></span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{v.contact}</span>
          </ItemRow>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input className="input" style={{ width: 140 }} placeholder="Vendor name" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input" style={{ width: 110 }} placeholder="Role" value={vendorForm.role} onChange={e => setVendorForm(f => ({ ...f, role: e.target.value }))} />
          <input className="input" style={{ flex: 1 }} placeholder="Contact info" value={vendorForm.contact} onChange={e => setVendorForm(f => ({ ...f, contact: e.target.value }))} />
          <button className="btn-gold" style={{ padding: '9px 14px' }} onClick={addVendor}>Add</button>
        </div>
      </div>

      <div>
        <div style={sectionTitle}>Guest count</div>
        <div style={{ display: 'flex', gap: 10, maxWidth: 320, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="label">Invited</div>
            <input className="input" type="number" value={guests.invited} onChange={e => setGuests(g => ({ ...g, invited: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Confirmed</div>
            <input className="input" type="number" value={guests.confirmed} onChange={e => setGuests(g => ({ ...g, confirmed: e.target.value }))} />
          </div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={saveGuests}>Save guest count</button>
      </div>
    </div>
  );
}

function DayOfTab({ ev, onUpdate }) {
  const [form, setForm] = useState({ time: '', activity: '' });

  function deleteItem(id) {
    onUpdate(e => ({ ...e, timeline: e.timeline.filter(t => t.id !== id) }));
  }
  function addItem() {
    if (!form.activity.trim()) return;
    onUpdate(e => ({ ...e, timeline: [...e.timeline, { id: cryptoId(), time: form.time || '00:00', activity: form.activity.trim() }] }));
    setForm({ time: '', activity: '' });
  }

  const sorted = [...ev.timeline].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Cardo','Georgia',serif" }}>Run of show</div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No timeline items yet.</div>
      ) : sorted.map(t => (
        <ItemRow key={t.id} onDelete={() => deleteItem(t.id)}>
          <span style={{ fontSize: 12, color: 'var(--muted)', width: 54 }}>{t.time}</span>
          <span style={{ flex: 1, fontSize: 13 }}>{t.activity}</span>
        </ItemRow>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input className="input" type="time" style={{ width: 120 }} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
        <input className="input" style={{ flex: 1 }} placeholder="Activity…" value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} />
        <button className="btn-gold" style={{ padding: '9px 14px' }} onClick={addItem}>Add</button>
      </div>
    </div>
  );
}

function AfterTab({ ev, onUpdate }) {
  const [notes, setNotes] = useState(ev.afterNotes);

  function save() {
    onUpdate(e => ({ ...e, afterNotes: notes }));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="label">What went well</div>
          <textarea className="input" rows={4} style={{ resize: 'vertical' }} value={notes.wentWell} onChange={e => setNotes(n => ({ ...n, wentWell: e.target.value }))} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">What didn't go well</div>
          <textarea className="input" rows={4} style={{ resize: 'vertical' }} value={notes.wentWrong} onChange={e => setNotes(n => ({ ...n, wentWrong: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="label">Final attendance</div>
          <input className="input" value={notes.finalAttendance} onChange={e => setNotes(n => ({ ...n, finalAttendance: e.target.value }))} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">Final budget</div>
          <input className="input" value={notes.finalBudget} onChange={e => setNotes(n => ({ ...n, finalBudget: e.target.value }))} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label">Follow-up items for next time</div>
        <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={notes.followUps} onChange={e => setNotes(n => ({ ...n, followUps: e.target.value }))} />
      </div>
      <button className="btn-gold" onClick={save}>Save after notes</button>
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────

function EventDetail({ ev, onUpdate, onBack, onEdit }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    ['overview', 'Overview'],
    ['preplanning', 'Pre-Planning'],
    ['dayof', 'Day-Of'],
    ['after', 'After Notes'],
  ];

  return (
    <div style={{ padding: '14px 14px 24px' }}>
      <button onClick={onBack} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', marginBottom: 14 }}>← All Events</button>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <StatusBadge status={ev.status} />
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginTop: 6 }}>{ev.name}</div>
            {ev.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{ev.description}</div>}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
              <span>📅 {fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</span>
              <span>📍 {ev.location || 'No location set'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <select className="input" style={{ appearance: 'auto', fontSize: 12 }} value={ev.status}
              onChange={e => onUpdate(x => ({ ...x, status: e.target.value }))}>
              <option value="planning">Planning</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onEdit}>Edit</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--border)', marginBottom: 18 }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{
            fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, padding: '9px 14px', cursor: 'pointer',
            color: tab === id ? 'var(--text)' : 'var(--muted)', fontWeight: tab === id ? 700 : 400,
            borderBottom: tab === id ? '2px solid var(--gold)' : '2px solid transparent', marginBottom: -1,
          }}>{label}</div>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab ev={ev} />}
      {tab === 'preplanning' && <PreplanningTab ev={ev} onUpdate={onUpdate} />}
      {tab === 'dayof' && <DayOfTab ev={ev} onUpdate={onUpdate} />}
      {tab === 'after' && <AfterTab ev={ev} onUpdate={onUpdate} />}
    </div>
  );
}

// ── Create/edit modal ────────────────────────────────────────────────────────

function EventModal({ editing, onSave, onCancel }) {
  const isNew = !editing.id;
  const [form, setForm] = useState({
    name: editing.name || '',
    date: editing.date || nextDate(0),
    time: editing.time || '',
    location: editing.location || '',
    description: editing.description || '',
    status: editing.status || 'upcoming',
  });

  function save() {
    if (!form.name.trim()) { alert('Give the event a name first.'); return; }
    onSave({ ...form, name: form.name.trim(), location: form.location.trim(), description: form.description.trim() });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,38,43,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 24, background: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 16 }}>{isNew ? 'New Event' : 'Edit Event'}</div>

        <div style={{ marginBottom: 12 }}>
          <div className="label">Event Name</div>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Autumn Fundraiser Gala" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="label">Date</div>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Time</div>
            <input className="input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="label">Location</div>
          <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Where is this happening?" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="label">Description</div>
          <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A short summary…" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <div className="label">Status</div>
          <select className="input" style={{ appearance: 'auto' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planning">Planning</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: '0.5px solid var(--border-light)' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-gold" onClick={save}>{isNew ? 'Create Event' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EventsCommittee() {
  const [events, setEvents] = useState(seedEvents);
  const [mode, setMode] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [loadingBudgetEvents, setLoadingBudgetEvents] = useState(true);

  // Pull in event names already used in Op Budget / Op Earnings (same
  // source the Reimbursements form's Event dropdown suggests from) so the
  // committee sees everything already on the books, not just what's been
  // planned here. They show up undated — add a date via Edit once known.
  useEffect(() => {
    fetchEventNames().then(names => {
      setEvents(prev => {
        const existing = new Set(prev.map(e => e.name.trim().toLowerCase()));
        const additions = names.filter(n => !existing.has(n.trim().toLowerCase())).map(emptyEvent);
        return additions.length ? [...prev, ...additions] : prev;
      });
      setLoadingBudgetEvents(false);
    }).catch(() => setLoadingBudgetEvents(false));
  }, []);

  const selected = events.find(e => e.id === selectedId) || null;

  function updateSelected(updater) {
    setEvents(prev => prev.map(e => e.id === selectedId ? updater(e) : e));
  }

  function deleteEvent(ev) {
    if (!confirm(`Delete "${ev.name}"? This can't be undone.`)) return;
    setEvents(prev => prev.filter(e => e.id !== ev.id));
  }

  function openNewModal() {
    setEditingEvent({ status: 'upcoming' });
    setShowModal(true);
  }
  function openEditModal() {
    setEditingEvent({ ...selected });
    setShowModal(true);
  }
  function saveModal(data) {
    if (editingEvent.id) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    } else {
      setEvents(prev => [...prev, {
        id: cryptoId(), ...data,
        tasks: [], budget: [], vendors: [], guestCount: { invited: 0, confirmed: 0 }, timeline: [],
        afterNotes: { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
      }]);
    }
    setShowModal(false);
    setEditingEvent(null);
  }

  const sorted = [...events].sort((a, b) => {
    if (!a.date && !b.date) return a.name.localeCompare(b.name);
    if (!a.date) return -1;
    if (!b.date) return 1;
    return a.date.localeCompare(b.date);
  });

  return (
    <div>
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Events Team</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Events Committee Planning Notes</div>
          {loadingBudgetEvents && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Syncing with budget tracking…</div>}
        </div>
        {!selected && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setMode('list')} style={{ fontSize: 12, padding: '7px 14px', border: 'none', cursor: 'pointer', background: mode === 'list' ? 'var(--text)' : 'transparent', color: mode === 'list' ? '#fff' : 'var(--text)' }}>List</button>
              <button onClick={() => setMode('calendar')} style={{ fontSize: 12, padding: '7px 14px', border: 'none', cursor: 'pointer', background: mode === 'calendar' ? 'var(--text)' : 'transparent', color: mode === 'calendar' ? '#fff' : 'var(--text)' }}>Calendar</button>
            </div>
            <button className="btn-gold" onClick={openNewModal}>+ New Event</button>
          </div>
        )}
      </div>

      <div style={{ padding: selected ? 0 : '14px 14px 24px' }}>
        {selected ? (
          <EventDetail ev={selected} onUpdate={updateSelected} onBack={() => setSelectedId(null)} onEdit={openEditModal} />
        ) : events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 6 }}>Nothing on the docket yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Create your first event to start planning.</div>
            <button className="btn-gold" onClick={openNewModal}>+ New Event</button>
          </div>
        ) : mode === 'list' ? (
          sorted.map(ev => <EventListRow key={ev.id} ev={ev} onOpen={setSelectedId} onDelete={deleteEvent} />)
        ) : (
          <CalendarView events={events} calYear={calYear} setCalYear={setCalYear} onOpen={setSelectedId} />
        )}
      </div>

      {showModal && <EventModal editing={editingEvent} onSave={saveModal} onCancel={() => { setShowModal(false); setEditingEvent(null); }} />}
    </div>
  );
}
