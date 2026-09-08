import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import {
  fetchEventNames, fetchEventFinancials, fetchCommitteeEvents, insertCommitteeEvent, insertCommitteeEventIfMissing, updateCommitteeEvent, deleteCommitteeEvent,
  fetchAllActiveVolunteers, syncInHouseEvent, logActivity,
  fetchEventFeedback, insertEventFeedback, updateEventFeedback, deleteEventFeedback,
} from '../lib/db.js';
import AreasTab from './eventsCommitteeAreas.jsx';

const cryptoId = () => Math.random().toString(36).slice(2, 10);
const nextDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set';
const fmtDateShort = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
const fmt12hr = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const fmtTimeRange = (start, end) => {
  if (!start && !end) return 'No time set';
  if (start && end) return `${fmt12hr(start)} – ${fmt12hr(end)}`;
  return fmt12hr(start || end);
};

const MINUTES = ['00', '15', '30', '45'];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Native <input type="time"> doesn't reliably restrict the minute picker to
// a fixed step across browsers, so use plain selects instead — guarantees
// only :00/:15/:30/:45 no matter what.
function TimeSelect({ value, onChange }) {
  const [h24, m] = value ? value.split(':').map(Number) : [null, null];
  const hour12 = h24 === null ? '' : (h24 % 12 || 12);
  const ampm = h24 === null ? 'AM' : (h24 >= 12 ? 'PM' : 'AM');
  const minute = m === null ? '00' : String(m - (m % 15)).padStart(2, '0');

  function update(nextHour12, nextMinute, nextAmpm) {
    if (nextHour12 === '') { onChange(''); return; }
    let h = parseInt(nextHour12, 10) % 12;
    if (nextAmpm === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${nextMinute}`);
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select className="input" style={{ appearance: 'auto' }} value={hour12} onChange={e => update(e.target.value, minute, ampm)}>
        <option value="">--</option>
        {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <select className="input" style={{ appearance: 'auto' }} value={minute} onChange={e => update(hour12 || 12, e.target.value, ampm)}>
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
      <select className="input" style={{ appearance: 'auto' }} value={ampm} onChange={e => update(hour12 || 12, minute, e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

const EVENT_PURPOSES = ['Educational', 'Entertainment', 'Community Engagement', 'Fundraising Support'];

function emptyEvent(name) {
  return {
    id: cryptoId(), name, date: '', startTime: '', endTime: '', location: '', description: '', status: 'planning',
    purpose: '', expectedAttendance: '', pricing: '',
    tasks: [], budget: [], vendors: [], guestCount: { invited: 0, confirmed: 0 }, timeline: [],
    afterNotes: { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
  };
}

// Map between the app's camelCase shape and the events_committee table's columns.
function fromDb(row) {
  return {
    id: row.id,
    in_house_event_id: row.in_house_event_id || null,
    name: row.name,
    date: row.date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    location: row.location || '',
    description: row.description || '',
    status: row.status || 'planning',
    purpose: row.purpose || '',
    expectedAttendance: row.expected_attendance || '',
    pricing: row.pricing || '',
    guestCount: { invited: row.guest_invited || 0, confirmed: row.guest_confirmed || 0 },
    tasks: row.tasks || [],
    budget: row.budget || [],
    vendors: row.vendors || [],
    timeline: row.timeline || [],
    afterNotes: (row.after_notes && Object.keys(row.after_notes).length)
      ? row.after_notes
      : { wentWell: '', wentWrong: '', finalAttendance: '', finalBudget: '', followUps: '' },
  };
}
function toDb(ev) {
  return {
    name: ev.name,
    date: ev.date || null,
    start_time: ev.startTime || null,
    end_time: ev.endTime || null,
    location: ev.location || null,
    description: ev.description || null,
    status: ev.status,
    purpose: ev.purpose || null,
    expected_attendance: ev.expectedAttendance || null,
    pricing: ev.pricing || null,
    guest_invited: ev.guestCount.invited || 0,
    guest_confirmed: ev.guestCount.confirmed || 0,
    tasks: ev.tasks,
    budget: ev.budget,
    vendors: ev.vendors,
    timeline: ev.timeline,
    after_notes: ev.afterNotes,
  };
}

const money = (n) => `$${Number(n || 0).toLocaleString()}`;

// Shared section-header treatment across every tab in the event workspace —
// uppercase + letter-spaced + a thin rule, so headers read as clear
// dividers between sections of one continuous page instead of blending
// into the body copy around them.
const SECTION_HEAD = {
  fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8,
  marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid var(--border-light)',
};

// Flat stat row (no per-tile card/border) — a set of numbers is a single
// unit, not a handful of separate bubbles.
function StatRow({ stats }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 36px', marginBottom: 22 }}>
      {stats.map(([num, lbl]) => (
        <div key={lbl}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{num}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_STYLE = {
  planning:      { bg: '#fde8e0', fg: '#8a4a2e', label: 'Planning' },
  upcoming:      { bg: '#f0ebe2', fg: 'var(--gold)', label: 'Upcoming' },
  needs_review:  { bg: '#fde8e0', fg: '#c2410c', label: 'Needs Final Review' },
  completed:     { bg: '#e3f6ec', fg: '#4a5d3a', label: 'Completed' },
};
const STATUS_ORDER = { upcoming: 0, planning: 1, needs_review: 2, completed: 3 };

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.upcoming;
  return <span className="badge" style={{ background: s.bg, color: s.fg, fontWeight: 600 }}>{s.label}</span>;
}

// ── Home: list / calendar ──────────────────────────────────────────────────

function EventListRow({ ev, onOpen, onDelete, isPast }) {
  const doneT = ev.tasks.filter(t => t.done).length;
  const d = ev.date ? new Date(`${ev.date}T00:00:00`) : null;
  return (
    <div className="card" style={{ marginBottom: 6, padding: '9px 14px', cursor: 'pointer', opacity: isPast ? 0.62 : 1 }} onClick={() => onOpen(ev.id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center', width: 42, flexShrink: 0 }}>
          {d ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 1 }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div style={{ fontSize: 21, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", lineHeight: 1.15 }}>{d.getDate()}</div>
            </>
          ) : (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#c2410c' }}>No date</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{doneT}/{ev.tasks.length} tasks</div>
        </div>
        <div style={{ flexShrink: 0 }}><StatusBadge status={ev.status} /></div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(ev); }}
          style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 14, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
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
  const PRIORITY_RANK = { high: 0, medium: 1, '': 2 };
  const nextTasks = ev.tasks.filter(t => !t.done)
    .slice().sort((a, b) => (PRIORITY_RANK[a.priority || ''] ?? 2) - (PRIORITY_RANK[b.priority || ''] ?? 2))
    .slice(0, 4);
  return (
    <div>
      <StatRow stats={[
        [`${doneT}/${ev.tasks.length}`, 'Tasks done'],
        [`${ev.guestCount.confirmed}/${ev.guestCount.invited}`, 'Guests confirmed'],
        [`${ev.vendors.filter(v => v.confirmed).length}/${ev.vendors.length}`, 'Vendors confirmed'],
        [`${money(budgetActual)}`, `Spent of ${money(budgetTotal)}`],
      ]} />
      <div style={SECTION_HEAD}>What's Next</div>
      {nextTasks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>All tasks complete.</div>
      ) : nextTasks.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0 9px 10px',
          borderBottom: '0.5px solid var(--border-light)', borderLeft: `3px solid ${t.priority ? TASK_PRIORITY[t.priority].color : 'transparent'}`,
        }}>
          <span style={{ flex: 1, fontSize: 13 }}>{t.text}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.due ? fmtDateShort(t.due) : ''}</span>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ children, onDelete, done, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0 9px 10px',
      borderBottom: '0.5px solid var(--border-light)', borderLeft: `3px solid ${accent || 'transparent'}`,
      opacity: done ? 0.6 : 1,
    }}>
      {children}
      {onDelete && <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>×</button>}
    </div>
  );
}

const TASK_PRIORITY = {
  high:   { label: 'High priority',   color: '#c0392b' },
  medium: { label: 'Medium priority', color: '#d9822b' },
};
function nextPriority(p) { return !p ? 'medium' : p === 'medium' ? 'high' : ''; }

function PriorityDot({ priority, onClick }) {
  const p = TASK_PRIORITY[priority];
  return (
    <button type="button" onClick={onClick} title={p ? `${p.label} — click to change` : 'No priority — click to set'}
      style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
        border: p ? 'none' : '1.5px solid var(--border)', background: p ? p.color : 'transparent',
      }} />
  );
}

function AssigneeMentionInput({ assignee, assigneeId, onChange, volunteers }) {
  const [query, setQuery] = useState(assignee || '');
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(assignee || ''); }, [assignee]);

  const showList = query.startsWith('@');
  const search = query.slice(1).trim().toLowerCase();
  const filtered = showList
    ? (volunteers || []).filter(v => `${v['First Name']} ${v['Last Name']}`.toLowerCase().includes(search)).slice(0, 8)
    : [];

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    onChange(val, null);
    setOpen(val.startsWith('@'));
  }

  function select(v) {
    const name = `${v['First Name']} ${v['Last Name']}`.trim();
    setQuery(name);
    onChange(name, v.id);
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative', width: 130 }}>
      <input className="input" placeholder="@ Assignee" value={query}
        onChange={handleChange}
        onFocus={() => { if (query.startsWith('@')) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 30, marginTop: 2, minWidth: 180,
          maxHeight: 180, overflowY: 'auto', background: '#fff', border: '0.5px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        }}>
          {filtered.map(v => (
            <div key={v.id} onMouseDown={() => select(v)}
              style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
              {v['First Name']} {v['Last Name']}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreplanningTab({ ev, onUpdate, volunteers }) {
  const [taskForm, setTaskForm] = useState({ text: '', due: '', assignee: '', assigneeId: null, priority: '' });
  const [budgetForm, setBudgetForm] = useState({ item: '', estimated: '', actual: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', role: '', contact: '' });
  const [guests, setGuests] = useState(ev.guestCount);
  const [basics, setBasics] = useState({ purpose: ev.purpose, expectedAttendance: ev.expectedAttendance, pricing: ev.pricing });

  function saveBasics() {
    onUpdate(e => ({ ...e, purpose: basics.purpose, expectedAttendance: basics.expectedAttendance.trim(), pricing: basics.pricing.trim() }));
  }

  function toggleTask(id) {
    onUpdate(e => ({ ...e, tasks: e.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }
  function deleteTask(id) {
    onUpdate(e => ({ ...e, tasks: e.tasks.filter(t => t.id !== id) }));
  }
  function cycleTaskPriority(id) {
    onUpdate(e => ({ ...e, tasks: e.tasks.map(t => t.id === id ? { ...t, priority: nextPriority(t.priority) } : t) }));
  }
  function addTask() {
    if (!taskForm.text.trim()) return;
    onUpdate(e => ({ ...e, tasks: [...e.tasks, { id: cryptoId(), text: taskForm.text.trim(), done: false, due: taskForm.due, assignee: taskForm.assignee.trim(), assigneeId: taskForm.assigneeId, priority: taskForm.priority || '' }] }));
    setTaskForm({ text: '', due: '', assignee: '', assigneeId: null, priority: '' });
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

  const sectionTitle = SECTION_HEAD;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={sectionTitle}>Event Basics</div>
        <div style={{ marginBottom: 10 }}>
          <div className="label">Main Purpose of This Event</div>
          <select className="input" style={{ appearance: 'auto' }} value={basics.purpose} onChange={e => setBasics(b => ({ ...b, purpose: e.target.value }))}>
            <option value="">Select a purpose…</option>
            {EVENT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <div className="label">Expected Attendance</div>
            <input className="input" value={basics.expectedAttendance} onChange={e => setBasics(b => ({ ...b, expectedAttendance: e.target.value }))} placeholder="e.g. 40–60 guests" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Ticket Price / Free / Donation-Based</div>
            <input className="input" value={basics.pricing} onChange={e => setBasics(b => ({ ...b, pricing: e.target.value }))} placeholder="e.g. $25/ticket, Free, Donation-based" />
          </div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={saveBasics}>Save event basics</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={sectionTitle}>Task checklist</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: TASK_PRIORITY.high.color, display: 'inline-block' }} />High</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: TASK_PRIORITY.medium.color, display: 'inline-block' }} />Medium</span>
          </div>
        </div>
        {ev.tasks.map(t => (
          <ItemRow key={t.id} done={t.done} onDelete={() => deleteTask(t.id)} accent={t.priority ? TASK_PRIORITY[t.priority].color : null}>
            <PriorityDot priority={t.priority} onClick={() => cycleTaskPriority(t.id)} />
            <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
            <span style={{ fontSize: 11, color: t.assigneeId ? 'var(--gold)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{t.assignee ? `${t.assigneeId ? '@' : ''}${t.assignee} · ` : ''}{t.due ? fmtDateShort(t.due) : ''}</span>
          </ItemRow>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Add a task…" value={taskForm.text} onChange={e => setTaskForm(f => ({ ...f, text: e.target.value }))} />
          <select className="input" style={{ width: 118, appearance: 'auto' }} value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="">No priority</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input className="input" type="date" style={{ width: 130 }} value={taskForm.due} onChange={e => setTaskForm(f => ({ ...f, due: e.target.value }))} />
          <AssigneeMentionInput assignee={taskForm.assignee} assigneeId={taskForm.assigneeId} volunteers={volunteers}
            onChange={(assignee, assigneeId) => setTaskForm(f => ({ ...f, assignee, assigneeId }))} />
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ time: '', activity: '' });

  function deleteItem(id) {
    onUpdate(e => ({ ...e, timeline: e.timeline.filter(t => t.id !== id) }));
  }
  function addItem() {
    if (!form.activity.trim()) return;
    onUpdate(e => ({ ...e, timeline: [...e.timeline, { id: cryptoId(), time: form.time || '00:00', activity: form.activity.trim() }] }));
    setForm({ time: '', activity: '' });
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm({ time: t.time, activity: t.activity });
  }
  function saveEdit() {
    if (!editForm.activity.trim()) return;
    const id = editingId;
    onUpdate(e => ({ ...e, timeline: e.timeline.map(t => t.id === id ? { ...t, time: editForm.time || '00:00', activity: editForm.activity.trim() } : t) }));
    setEditingId(null);
  }

  const sorted = [...ev.timeline].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div>
      <div style={SECTION_HEAD}>Run of Show</div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No timeline items yet.</div>
      ) : sorted.map(t => (
        editingId === t.id ? (
          <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid var(--border-light)' }}>
            <TimeSelect value={editForm.time} onChange={v => setEditForm(f => ({ ...f, time: v }))} />
            <input className="input" style={{ flex: 1 }} value={editForm.activity} onChange={e => setEditForm(f => ({ ...f, activity: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} autoFocus />
            <button className="btn-gold" style={{ padding: '7px 12px', fontSize: 12 }} onClick={saveEdit}>Save</button>
            <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
          </div>
        ) : (
          <ItemRow key={t.id} onDelete={() => deleteItem(t.id)}>
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 54, flexShrink: 0 }}>{t.time}</span>
            <button onClick={() => startEdit(t)} title="Edit"
              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>
              {t.activity}
            </button>
          </ItemRow>
        )
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <TimeSelect value={form.time} onChange={v => setForm(f => ({ ...f, time: v }))} />
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

function FinancialsTab({ ev }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchEventFinancials(ev.name).then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
  }, [ev.name]);

  if (loading) return <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Loading…</div>;

  const earnings = data?.earnings || [];
  const expenses = data?.expenses || [];
  const totalEarnings = earnings.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
        Pulled live from this event's entries in Portal's budget tracking (Op Budget / Op Earnings) — read-only here.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 36px', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: '#4a5d3a' }}>{money(totalEarnings)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Earnings</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: '#8a4a2e' }}>{money(totalExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Expenses</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: totalEarnings - totalExpenses >= 0 ? '#4a5d3a' : '#8a4a2e' }}>{money(totalEarnings - totalExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Net</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={SECTION_HEAD}>Earnings</div>
        {earnings.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No earnings logged for this event yet.</div>
        ) : earnings.map(r => (
          <ItemRow key={r.id}>
            <span style={{ flex: 1, fontSize: 13 }}>{r.earning_source || 'Earning'}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.date ? fmtDateShort(r.date) : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4a5d3a' }}>{money(r.amount)}</span>
          </ItemRow>
        ))}
      </div>

      <div>
        <div style={SECTION_HEAD}>Expenses</div>
        {expenses.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No expenses logged for this event yet.</div>
        ) : expenses.map(r => (
          <ItemRow key={r.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{r.description || r.type || 'Expense'}</div>
              {r.purchased_by && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Purchased by {r.purchased_by}</div>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.date ? fmtDateShort(r.date) : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8a4a2e' }}>{money(r.amount)}</span>
          </ItemRow>
        ))}
      </div>
    </div>
  );
}

function emptyFeedback(eventName, todayStr) {
  return { event_name: eventName, source: '', name: '', role: '', feedback: '', date: todayStr };
}

function ReviewsTab({ ev }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [reviews, setReviews] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyFeedback(ev.name, todayStr));
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expanded, setExpanded] = useState({});

  function load() {
    fetchEventFeedback(ev.name).then(setReviews).catch(() => setReviews([]));
  }
  useEffect(() => { load(); }, [ev.name]);

  async function addReview(e) {
    e.preventDefault();
    if (!form.feedback.trim()) return;
    setSaving(true);
    const res = await insertEventFeedback({ ...form, event_name: ev.name, source: form.source || null, name: form.name || null, role: form.role || null, date: form.date || null });
    setSaving(false);
    if (res.error) { alert(`Failed to save: ${res.error}`); return; }
    if (res.row) setReviews(prev => [res.row, ...(prev || [])]);
    setForm(emptyFeedback(ev.name, todayStr));
    setShowAdd(false);
  }

  function startEdit(f) {
    setEditingId(f.id);
    setEditForm({ source: f.source || '', name: f.name || '', role: f.role || '', feedback: f.feedback || '', date: f.date || todayStr });
  }
  async function saveEdit() {
    if (!editForm) return;
    setSavingEdit(true);
    const patch = { source: editForm.source || null, name: editForm.name || null, role: editForm.role || null, feedback: editForm.feedback, date: editForm.date || null };
    const res = await updateEventFeedback(editingId, patch);
    setSavingEdit(false);
    if (res.error) { alert(`Failed to save: ${res.error}`); return; }
    setReviews(prev => prev.map(f => f.id === editingId ? { ...f, ...patch } : f));
    setEditingId(null);
    setEditForm(null);
  }
  async function removeReview(id) {
    if (!confirm('Delete this review?')) return;
    setReviews(prev => prev.filter(f => f.id !== id));
    await deleteEventFeedback(id);
  }

  if (reviews === null) return <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Shared with Portal's Events page — reviews added here show up there too, and vice versa.
        </div>
        <button className="btn-gold" style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }} onClick={() => { setShowAdd(s => !s); setForm(emptyFeedback(ev.name, todayStr)); }}>
          {showAdd ? 'Cancel' : '+ Add Review'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addReview} style={{ padding: 14, marginBottom: 16, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div className="label">Source</div>
              <input className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Google review, comment card…" />
            </div>
            <div>
              <div className="label">Name</div>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Who left this feedback (optional)" />
            </div>
            <div>
              <div className="label">Role</div>
              <input className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Guest, Vendor, Volunteer…" />
            </div>
            <div>
              <div className="label">Date</div>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Feedback</div>
            <textarea className="input" rows={3} style={{ resize: 'vertical' }} required value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} placeholder="What did they say…" />
          </div>
          <button type="submit" className="btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Add Review'}</button>
        </form>
      )}

      {reviews.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No reviews recorded for this event yet.</div>
      ) : (
        <div>
          {reviews.map(f => {
            if (editingId === f.id && editForm) {
              return (
                <div key={f.id} style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border-light)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input className="input" value={editForm.source} onChange={e => setEditForm(ff => ({ ...ff, source: e.target.value }))} placeholder="Source" />
                    <input className="input" value={editForm.name} onChange={e => setEditForm(ff => ({ ...ff, name: e.target.value }))} placeholder="Name" />
                    <input className="input" value={editForm.role} onChange={e => setEditForm(ff => ({ ...ff, role: e.target.value }))} placeholder="Role" />
                    <input className="input" type="date" value={editForm.date} onChange={e => setEditForm(ff => ({ ...ff, date: e.target.value }))} />
                  </div>
                  <textarea className="input" rows={3} style={{ resize: 'vertical', marginBottom: 8 }} value={editForm.feedback} onChange={e => setEditForm(ff => ({ ...ff, feedback: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-gold" style={{ fontSize: 12, padding: '6px 14px' }} disabled={savingEdit} onClick={saveEdit}>{savingEdit ? 'Saving…' : 'Save'}</button>
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} disabled={savingEdit} onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</button>
                  </div>
                </div>
              );
            }
            const isOpen = !!expanded[f.id];
            return (
              <div key={f.id} style={{ borderBottom: '0.5px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name || 'Anonymous'}{f.role ? ` — ${f.role}` : ''}</div>
                      {f.source && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{f.source}</div>}
                    </div>
                    {f.date && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{fmtDateShort(f.date)}</span>}
                    <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  <button onClick={() => startEdit(f)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }}>✎</button>
                  <button onClick={() => removeReview(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, flexShrink: 0 }}>×</button>
                </div>
                {isOpen && <div style={{ padding: '0 0 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{f.feedback}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────

function EventDetail({ ev, onUpdate, onBack, onEdit, volunteers, session, volunteer }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    ['overview', 'Overview'],
    ['preplanning', 'Pre-Planning'],
    ['areas', 'Areas'],
    ['dayof', 'Day-Of'],
    ['financials', 'Financials'],
    ['reviews', 'Reviews'],
    ['after', 'After Notes'],
  ];

  return (
    <div style={{ padding: '14px 14px 24px' }}>
      <button onClick={onBack} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', marginBottom: 14 }}>← All Events</button>

      {/* One continuous white panel — header, tabs, and tab content all
          live inside it, rather than a stack of separately-floating cards. */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <StatusBadge status={ev.status} />
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginTop: 6 }}>{ev.name}</div>
              {ev.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{ev.description}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {fmtDate(ev.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {fmtTimeRange(ev.startTime, ev.endTime)}
                </span>
              </div>
              {(ev.purpose || ev.expectedAttendance || ev.pricing) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {ev.purpose && <span className="badge" style={{ background: 'var(--light)', color: 'var(--gold)' }}>{ev.purpose}</span>}
                  {ev.expectedAttendance && <span className="badge" style={{ background: 'var(--light)', color: 'var(--text)' }}>{ev.expectedAttendance}</span>}
                  {ev.pricing && <span className="badge" style={{ background: 'var(--light)', color: 'var(--text)' }}>{ev.pricing}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <select className="input" style={{ appearance: 'auto', fontSize: 12 }} value={ev.status}
                onChange={e => onUpdate(x => ({ ...x, status: e.target.value }))}>
                <option value="planning">Planning</option>
                <option value="upcoming">Upcoming</option>
                <option value="needs_review">Needs Final Review</option>
                <option value="completed">Completed</option>
              </select>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onEdit}>Edit</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--border)', padding: '0 22px', overflowX: 'auto' }}>
          {tabs.map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)} style={{
              fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              color: tab === id ? 'var(--text)' : 'var(--muted)', fontWeight: tab === id ? 700 : 400,
              borderBottom: tab === id ? '2px solid var(--gold)' : '2px solid transparent', marginBottom: -1,
            }}>{label}</div>
          ))}
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          {tab === 'overview' && <OverviewTab ev={ev} />}
          {tab === 'preplanning' && <PreplanningTab ev={ev} onUpdate={onUpdate} volunteers={volunteers} />}
          {tab === 'areas' && <AreasTab event={ev} session={session} volunteer={volunteer} />}
          {tab === 'dayof' && <DayOfTab ev={ev} onUpdate={onUpdate} />}
          {tab === 'financials' && <FinancialsTab ev={ev} />}
          {tab === 'reviews' && <ReviewsTab ev={ev} />}
          {tab === 'after' && <AfterTab ev={ev} onUpdate={onUpdate} />}
        </div>
      </div>
    </div>
  );
}

// ── Create/edit modal ────────────────────────────────────────────────────────

function EventModal({ editing, onSave, onCancel }) {
  const isNew = !editing.id;
  const [form, setForm] = useState({
    name: editing.name || '',
    date: editing.date || nextDate(0),
    startTime: editing.startTime || '',
    endTime: editing.endTime || '',
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
        <div style={{ marginBottom: 12 }}>
          <div className="label">Date</div>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="label">From</div>
            <TimeSelect value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">To</div>
            <TimeSelect value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} />
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
            <option value="needs_review">Needs Final Review</option>
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
  const { session, volunteer } = useVol();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => { fetchAllActiveVolunteers().then(rows => setVolunteers(Array.isArray(rows) ? rows : [])).catch(() => setVolunteers([])); }, []);

  // Load saved events, then pull in any event names already used in
  // Op Budget / Op Earnings (same source the Reimbursements form's Event
  // dropdown suggests from) that aren't tracked here yet, and persist them
  // so the committee sees everything already on the books. Those come in
  // undated — add a date via Edit once known.
  function load() {
    setLoading(true);
    fetchCommitteeEvents().then(async rows => {
      const mapped = rows.map(fromDb);
      const names = await fetchEventNames().catch(() => []);
      const existing = new Set(mapped.map(e => e.name.trim().toLowerCase()));
      const missing = names.filter(n => !existing.has(n.trim().toLowerCase()));
      if (missing.length) {
        const results = await Promise.all(missing.map(n =>
          insertCommitteeEventIfMissing({ ...toDb(emptyEvent(n)), created_by: session.user.id })
        ));
        // A no-op result means another concurrent load already inserted this
        // name first — nothing to add locally, it'll show up on next load.
        results.forEach(res => { if (res.row) mapped.push(fromDb(res.row)); });
      }
      setEvents(mapped);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const selected = events.find(e => e.id === selectedId) || null;

  function updateSelected(updater) {
    setEvents(prev => prev.map(e => {
      if (e.id !== selectedId) return e;
      const next = updater(e);
      updateCommitteeEvent(e.id, toDb(next));
      if (next.status !== e.status) {
        const fullName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();
        logActivity({
          vol: volunteer,
          authUserId: session.user.id,
          action: 'committee_event_status_changed',
          description: `${fullName || 'A volunteer'} marked "${e.name}" as ${(STATUS_STYLE[next.status] || {}).label || next.status}`,
        });
      }
      return next;
    }));
  }

  function deleteEvent(ev) {
    if (!confirm(`Delete "${ev.name}"? This can't be undone.`)) return;
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    deleteCommitteeEvent(ev.id);
    const fullName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();
    logActivity({
      vol: volunteer,
      authUserId: session.user.id,
      action: 'committee_event_deleted',
      description: `${fullName || 'A volunteer'} deleted the event "${ev.name}"`,
    });
  }

  function openNewModal() {
    setEditingEvent({ status: 'upcoming' });
    setShowModal(true);
  }
  function openEditModal() {
    setEditingEvent({ ...selected });
    setShowModal(true);
  }
  async function saveModal(data) {
    if (editingEvent.id) {
      const merged = { ...selected, ...data };
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? merged : e));
      updateCommitteeEvent(editingEvent.id, toDb(merged));

      // Keep the Leadership Dashboard's In-House Events entry in sync on rename/reschedule.
      const nameOrDateChanged = merged.name !== selected.name || merged.date !== selected.date;
      if (nameOrDateChanged) {
        const fullName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();
        const change = merged.name !== selected.name && merged.date !== selected.date
          ? `renamed "${selected.name}" to "${merged.name}" and rescheduled it`
          : merged.name !== selected.name
            ? `renamed "${selected.name}" to "${merged.name}"`
            : `rescheduled "${merged.name}"`;
        logActivity({
          vol: volunteer,
          authUserId: session.user.id,
          action: 'committee_event_updated',
          description: `${fullName || 'A volunteer'} ${change}`,
        });
      }
      if (nameOrDateChanged && merged.date) {
        if (merged.in_house_event_id) {
          syncInHouseEvent({ name: merged.name, date: merged.date, ihEventId: merged.in_house_event_id });
        } else {
          syncInHouseEvent({ name: merged.name, date: merged.date }).then(ihEvent => {
            if (ihEvent?.id) {
              updateCommitteeEvent(editingEvent.id, { in_house_event_id: ihEvent.id });
              setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, in_house_event_id: ihEvent.id } : e));
            }
          });
        }
      }
    } else {
      const newEvent = { ...emptyEvent(data.name), ...data };
      const res = await insertCommitteeEvent({ ...toDb(newEvent), created_by: session.user.id });
      if (res.error) {
        alert(res.error.includes('duplicate') || res.error.includes('unique')
          ? `An event named "${data.name}" already exists.`
          : `Failed to save: ${res.error}`);
        return;
      }
      if (res.row) {
        setEvents(prev => [...prev, fromDb(res.row)]);
        logActivity({
          vol: volunteer,
          authUserId: session.user.id,
          action: 'committee_event_added',
          description: `New event added to the Events Committee planning notes: ${res.row.name}`,
        });
        if (res.row.date) {
          syncInHouseEvent({ name: res.row.name, date: res.row.date }).then(ihEvent => {
            if (ihEvent?.id) {
              updateCommitteeEvent(res.row.id, { in_house_event_id: ihEvent.id });
              setEvents(prev => prev.map(e => e.id === res.row.id ? { ...e, in_house_event_id: ihEvent.id } : e));
            }
          });
        }
      }
    }
    setShowModal(false);
    setEditingEvent(null);
  }

  const sorted = [...events].sort((a, b) => {
    const so = (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1);
    if (so !== 0) return so;
    if (!a.date && !b.date) return a.name.localeCompare(b.name);
    if (!a.date) return -1;
    if (!b.date) return 1;
    return a.date.localeCompare(b.date);
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingEvents = sorted.filter(ev => !ev.date || ev.date >= todayStr);
  const pastEvents = sorted.filter(ev => ev.date && ev.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="ec-page">
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fff' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Events Team</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Events Committee Planning Notes</div>
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
        ) : selected ? (
          <EventDetail ev={selected} onUpdate={updateSelected} onBack={() => setSelectedId(null)} onEdit={openEditModal} volunteers={volunteers} session={session} volunteer={volunteer} />
        ) : events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 6 }}>Nothing on the docket yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Create your first event to start planning.</div>
            <button className="btn-gold" onClick={openNewModal}>+ New Event</button>
          </div>
        ) : mode === 'list' ? (
          <div>
            {upcomingEvents.map(ev => <EventListRow key={ev.id} ev={ev} onOpen={setSelectedId} onDelete={deleteEvent} />)}
            {pastEvents.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Past Events</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                {pastEvents.map(ev => <EventListRow key={ev.id} ev={ev} onOpen={setSelectedId} onDelete={deleteEvent} isPast />)}
              </>
            )}
          </div>
        ) : (
          <CalendarView events={events} calYear={calYear} setCalYear={setCalYear} onOpen={setSelectedId} />
        )}
      </div>

      {showModal && <EventModal editing={editingEvent} onSave={saveModal} onCancel={() => { setShowModal(false); setEditingEvent(null); }} />}
    </div>
  );
}
