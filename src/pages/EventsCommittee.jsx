import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import {
  fetchEventNames, fetchEventFinancials, fetchCommitteeEvents, insertCommitteeEvent, updateCommitteeEvent, deleteCommitteeEvent,
} from '../lib/db.js';

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

function EventListRow({ ev, onOpen, onDelete }) {
  const doneT = ev.tasks.filter(t => t.done).length;
  return (
    <div className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => onOpen(ev.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{ev.name}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: ev.date ? 'var(--text)' : '#c2410c' }}>{ev.date ? fmtDateShort(ev.date) : 'Needs a date'}</div>
          <div style={{ marginTop: 4 }}><StatusBadge status={ev.status} /></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {doneT}/{ev.tasks.length} tasks
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: '#4a5d3a' }}>{money(totalEarnings)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Earnings</div>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: '#8a4a2e' }}>{money(totalExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Expenses</div>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: totalEarnings - totalExpenses >= 0 ? '#4a5d3a' : '#8a4a2e' }}>{money(totalEarnings - totalExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Net</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Cardo','Georgia',serif" }}>Earnings</div>
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
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Cardo','Georgia',serif" }}>Expenses</div>
        {expenses.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No expenses logged for this event yet.</div>
        ) : expenses.map(r => (
          <ItemRow key={r.id}>
            <span style={{ flex: 1, fontSize: 13 }}>{r.description || r.type || 'Expense'}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.date ? fmtDateShort(r.date) : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8a4a2e' }}>{money(r.amount)}</span>
          </ItemRow>
        ))}
      </div>
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
    ['financials', 'Financials'],
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
      {tab === 'financials' && <FinancialsTab ev={ev} />}
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
  const { session } = useVol();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());

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
          insertCommitteeEvent({ ...toDb(emptyEvent(n)), created_by: session.user.id })
        ));
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
      return next;
    }));
  }

  function deleteEvent(ev) {
    if (!confirm(`Delete "${ev.name}"? This can't be undone.`)) return;
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    deleteCommitteeEvent(ev.id);
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
    } else {
      const newEvent = { ...emptyEvent(data.name), ...data };
      const res = await insertCommitteeEvent({ ...toDb(newEvent), created_by: session.user.id });
      if (res.row) setEvents(prev => [...prev, fromDb(res.row)]);
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

  return (
    <div className="ec-page">
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Events Team</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Events Committee Planning Notes</div>
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
