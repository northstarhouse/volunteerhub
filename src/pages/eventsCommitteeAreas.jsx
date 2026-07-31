// Area-based event planning (Overall/Programs/Volunteers/Logistics/
// Hospitality/Finance/Sponsorship/Interiors/Marketing) for Volunteer Hub's
// Events Committee page. Ported from the richer per-area structure in the
// standalone nsh-events-committee site, but schema-driven (one generic
// renderer + field list per area) instead of nine hand-written components,
// and saved to a single `events_committee_areas` table row per (event, area)
// instead of the old app's localStorage + event_forms dual-write.
import { useEffect, useState } from 'react';
import { fetchAreaData, saveArea, logActivity } from '../lib/db.js';

export const AREA_DEFAULTS = [
  { key: 'overall', label: 'Overall Event Status', role: 'Event Chair', defaultOwner: 'Barb Kusha' },
  { key: 'programs', label: 'Activities & Programs', role: 'Programs', defaultOwner: 'Gerrie Kopec' },
  { key: 'volunteers', label: 'Volunteer Coordination', role: 'Volunteers', defaultOwner: 'Haley Wright' },
  { key: 'logistics', label: 'Event Logistics', role: 'Logistics & Operations', defaultOwner: 'Vince LoFranco' },
  { key: 'hospitality', label: 'Hospitality', role: 'Hospitality', defaultOwner: 'Barb Kusha' },
  { key: 'finance', label: 'Finance & Budget', role: 'Finance and Budget', defaultOwner: 'Ken Underwood' },
  { key: 'sponsorship', label: 'Sponsorships & Partnerships', role: 'Sponsorship & Partnership', defaultOwner: 'Derek Cheeseman' },
  { key: 'interiors', label: 'Interiors', role: 'Interiors', defaultOwner: 'Rebekah Freeman' },
  { key: 'marketing', label: 'Marketing', role: 'Marketing', defaultOwner: 'Haley Wright' },
];

const VOLUNTEER_ROLES = ['Setup', 'Check-in booth', 'Hospitality / Food Support', 'Cleanup / Breakdown', 'Program Support', 'Float / General Support', 'Bartending', 'Parking', 'Other'];
const MARKETING_CHANNELS = [
  'Create Press Release', 'Send Email Blast', 'YubaNet (Press Release Only)', 'Go Nevada County Calendar - Community Blast',
  'Arts Council Calendar', 'Grass Valley Chamber Newsletter', 'KVMR Calendar', 'Facebook Event Page', 'NSH Facebook Page',
  'NSH Instagram Page', 'Nevada County Peeps', 'Grass Valley Peeps', 'Lake Wildwood Page', 'Next Door', 'Union Event Calendar', 'Union Advertisement ($270)',
];
const EXPENSE_CATEGORIES = ['Food & Beverage', 'Entertainment / Speakers', 'Supplies / Decor', 'Marketing / Printing', 'Permits / Licenses / Insurance', 'Cleaning / Security', 'Other'];
const INCOME_SOURCES = ['Ticket Sales', 'Alcohol or food sales', 'House Merch', 'Donations', 'Other'];

// ---------- Field schemas: [ { key, label, type, ...opts } ] per area/phase ----------
// Types: text, textarea, select, radio, yesno, checkboxGroup, checkbox,
// table (dynamic add/remove rows), roleCounts, channelChecklist, moneyTable.

const SCHEMAS = {
  overall: {
    pre: [
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
    post: [
      { key: 'finalNotes', label: 'Final Notes', type: 'textarea' },
    ],
  },
  programs: {
    pre: [
      { key: 'vendorFormsSent', label: 'Vendor Forms', type: 'select', options: ['', 'Not Sent', 'Sent', 'Received'] },
      { key: 'transitions', label: 'Transitions', type: 'textarea' },
      { key: 'performers', label: 'Performers / Vendors', type: 'table', columns: [{ key: 'name', label: 'Name' }, { key: 'contact', label: 'Contact' }] },
      { key: 'activities', label: 'Activities', type: 'table', columns: [{ key: 'activity', label: 'Activity' }, { key: 'timeFrame', label: 'Time Frame' }, { key: 'volunteers', label: 'Volunteers' }] },
      { key: 'actionItems', label: 'Action Items', type: 'table', columns: [{ key: 'item', label: 'Item' }, { key: 'dueDate', label: 'Due Date', type: 'date' }, { key: 'volunteer', label: 'Volunteer' }] },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'activityReview', label: 'Activity Review', type: 'table', columns: [{ key: 'activity', label: 'Activity' }, { key: 'whatWorked', label: 'What Worked' }, { key: 'whatDidnt', label: "What Didn't" }, { key: 'notes', label: 'Notes' }] },
      { key: 'flowTiming', label: 'Flow & Timing', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  volunteers: {
    pre: [
      { key: 'roles', label: 'Volunteer Roles Needed', type: 'roleCounts' },
      { key: 'volunteersAssigned', label: 'Volunteers Assigned', type: 'textarea' },
      { key: 'boardContacted', label: 'Board Contacted', type: 'yesno', options: ['N/A', 'Yes', 'No'], pairedDateKey: 'boardContactedDate' },
      { key: 'eventSupportContacted', label: 'Event Support Contacted', type: 'yesno', options: ['N/A', 'Yes', 'No'], pairedDateKey: 'eventSupportDate' },
      { key: 'volunteerBriefingSent', label: 'Volunteer Briefing Sent', type: 'yesno', options: ['N/A', 'Yes', 'No'], pairedDateKey: 'volunteerBriefingDate' },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'avgHoursOnSite', label: 'Average Hours On Site', type: 'text' },
      { key: 'totalVolunteerHours', label: 'Total Volunteer Hours', type: 'text' },
      { key: 'whatWeLearned', label: 'What We Learned', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  logistics: {
    pre: [
      { key: 'proposedAttendance', label: 'Proposed Attendance', type: 'text' },
      { key: 'eventLocations', label: 'Event Locations', type: 'textarea' },
      { key: 'setupPlan', label: 'Setup Plan', type: 'textarea' },
      { key: 'volunteersAssisting', label: 'Volunteers Assisting', type: 'text' },
      { key: 'equipmentNeeded', label: 'Equipment Needed', type: 'textarea' },
      { key: 'safetyConsiderations', label: 'Safety Considerations', type: 'textarea' },
      { key: 'couldImpactSuccess', label: 'Could Impact Success?', type: 'radio', options: ['No', 'Yes'] },
      { key: 'backupPlan', label: 'Backup Plan', type: 'textarea' },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'setupVsReality', label: 'Setup vs Reality', type: 'radio', options: ['Matched plan exactly', 'Minor adjustments', 'Significant changes'] },
      { key: 'adjustmentsMade', label: 'Adjustments Made', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  hospitality: {
    pre: [
      { key: 'servingStyle', label: 'Serving Style', type: 'checkboxGroup', options: ['Self-serve', 'Served', 'Passed items', 'Combination'] },
      { key: 'alcoholInvolved', label: 'Alcohol Involved', type: 'radio', options: ['No', 'Yes'] },
      { key: 'cleanupPlan', label: 'Cleanup Plan', type: 'textarea' },
      { key: 'volunteersAssisting', label: 'Volunteers Assisting', type: 'text' },
      { key: 'foodBevPlan', label: 'Food & Beverage Plan', type: 'table', columns: [{ key: 'item', label: 'Item' }, { key: 'volunteer', label: 'Volunteer' }] },
      { key: 'shoppingList', label: 'Shopping List', type: 'table', columns: [{ key: 'item', label: 'Item' }, { key: 'volunteer', label: 'Volunteer' }] },
      { key: 'rentalEquipment', label: 'Rental Equipment', type: 'table', columns: [{ key: 'item', label: 'Equipment' }, { key: 'volunteer', label: 'Volunteer' }] },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'fbOutcome', label: 'Food & Beverage Outcome', type: 'radio', options: ['More than enough', 'Adequate', 'Ran out'] },
      { key: 'guestFlow', label: 'Guest Flow', type: 'radio', options: ['Excellent', 'Good', 'Issues noted'] },
      { key: 'guestComments', label: 'Guest Comments', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  finance: {
    pre: [
      { key: 'expenses', label: 'Projected Expenses', type: 'moneyTable', rowKey: 'category', rows: EXPENSE_CATEGORIES },
      { key: 'income', label: 'Projected Income', type: 'moneyTable', rowKey: 'source', rows: INCOME_SOURCES },
      { key: 'financialNotes', label: 'Financial Notes', type: 'textarea' },
    ],
    post: [
      { key: 'finalExpenses', label: 'Final Expenses', type: 'text' },
      { key: 'finalIncome', label: 'Final Income', type: 'text' },
      { key: 'finalNet', label: 'Final Net', type: 'text' },
      { key: 'reimbursementsNeeded', label: 'Reimbursements Needed?', type: 'radio', options: ['No', 'Yes'] },
      { key: 'netReportedToBoard', label: 'Net Reported to Board?', type: 'checkbox' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  sponsorship: {
    pre: [
      { key: 'recognitionMethods', label: 'Recognition Methods', type: 'checkboxGroup', options: ['Signage on site', 'Verbal recognition', 'Program/printed materials', 'Digital recognition', 'Invitation-only/VIP access', 'Other'] },
      { key: 'recognitionOther', label: 'Other Recognition', type: 'text' },
      { key: 'recognitionVolunteer', label: 'Recognition Volunteer', type: 'text' },
      { key: 'potentialSponsors', label: 'Potential Sponsors', type: 'textarea' },
      { key: 'outreachActions', label: 'Outreach Actions', type: 'checkboxGroup', options: ['Personal invitation', 'Event-specific pitch', 'Follow-up after event', 'Other'] },
      { key: 'outreachOther', label: 'Other Outreach', type: 'text' },
      { key: 'outreachVolunteer', label: 'Outreach Volunteer', type: 'text' },
      { key: 'intentionalInvites', label: 'Intentional Invites', type: 'textarea' },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'sponsorsInvolved', label: 'Sponsors Involved', type: 'textarea' },
      { key: 'recognitionDelivered', label: 'Recognition Delivered', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  interiors: {
    pre: [
      { key: 'historicApproach', label: 'Historic Approach', type: 'radio', options: ['All historically accurate items remain in place', 'Some items may be moved/stored', 'Significant rearrangement needed'] },
      { key: 'moreInfo', label: 'More Info', type: 'textarea' },
      { key: 'decorAdded', label: 'Decor Added', type: 'textarea' },
      { key: 'decorCost', label: 'Decor Cost', type: 'text' },
      { key: 'removalReasons', label: 'Removal Reasons', type: 'checkboxGroup', options: ['Space needs', 'Safety concerns', 'Damage risk', 'Event logistics', 'Other'] },
      { key: 'removalOther', label: 'Other Removal Reason', type: 'text' },
      { key: 'otherNotes', label: 'Other Notes', type: 'textarea' },
    ],
    post: [
      { key: 'historicIssues', label: 'Historic Issues', type: 'textarea' },
      { key: 'wearDamage', label: 'Wear / Damage', type: 'textarea' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
  marketing: {
    pre: [
      { key: 'channels', label: 'Channels', type: 'channelChecklist' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    post: [
      { key: 'photosTaken', label: 'Photos Taken?', type: 'checkbox' },
      { key: 'donationsRelatedToEvent', label: 'Donations Related to Event', type: 'text' },
      { key: 'committeeNotes', label: 'Committee Notes', type: 'textarea' },
    ],
  },
};

function defaultValueFor(field) {
  if (field.type === 'table') return [];
  if (field.type === 'checkboxGroup') return [];
  if (field.type === 'checkbox') return false;
  if (field.type === 'roleCounts') { const m = {}; VOLUNTEER_ROLES.forEach(r => { m[r] = { needed: false, count: '' }; }); return m; }
  if (field.type === 'channelChecklist') { const m = {}; MARKETING_CHANNELS.forEach(c => { m[c] = { done: false, date: '' }; }); return m; }
  if (field.type === 'moneyTable') return field.rows.map(r => ({ [field.rowKey]: r, estimated: '', actual: '' }));
  return '';
}

// ---------- Generic field renderers ----------

function Field({ field, value, onChange }) {
  const v = value !== undefined ? value : defaultValueFor(field);

  if (field.type === 'text') return <input className="input" value={v} onChange={e => onChange(e.target.value)} />;
  if (field.type === 'textarea') return <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={v} onChange={e => onChange(e.target.value)} />;
  if (field.type === 'select') return (
    <select className="input" style={{ appearance: 'auto' }} value={v} onChange={e => onChange(e.target.value)}>
      {field.options.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
    </select>
  );
  if (field.type === 'radio') return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {field.options.map(o => (
        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
          <input type="radio" checked={v === o} onChange={() => onChange(o)} style={{ accentColor: 'var(--gold)' }} /> {o}
        </label>
      ))}
    </div>
  );
  if (field.type === 'checkboxGroup') {
    const arr = Array.isArray(v) ? v : [];
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {field.options.map(o => (
          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={arr.includes(o)} onChange={() => onChange(arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o])} style={{ accentColor: 'var(--gold)' }} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'checkbox') return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
      <input type="checkbox" checked={!!v} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} /> Yes
    </label>
  );
  if (field.type === 'table') {
    const rows = Array.isArray(v) ? v : [];
    const [draft, setDraft] = useState({});
    function addRow() {
      if (field.columns.every(c => !draft[c.key])) return;
      onChange([...rows, { id: Math.random().toString(36).slice(2, 8), ...draft }]);
      setDraft({});
    }
    function removeRow(id) { onChange(rows.filter(r => r.id !== id)); }
    return (
      <div>
        {rows.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 10px', marginBottom: 5 }}>
            {field.columns.map(c => <span key={c.key} style={{ flex: 1, fontSize: 12 }}>{r[c.key]}</span>)}
            <button onClick={() => removeRow(r.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {field.columns.map(c => (
            <input key={c.key} className="input" type={c.type || 'text'} style={{ flex: 1 }} placeholder={c.label}
              value={draft[c.key] || ''} onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))} />
          ))}
          <button className="btn-gold" style={{ padding: '8px 12px' }} onClick={addRow}>Add</button>
        </div>
      </div>
    );
  }
  if (field.type === 'roleCounts') {
    const m = v || {};
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {VOLUNTEER_ROLES.map(r => {
          const row = m[r] || { needed: false, count: '' };
          return (
            <div key={r} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
              <input type="checkbox" checked={!!row.needed} onChange={e => onChange({ ...m, [r]: { ...row, needed: e.target.checked } })} style={{ accentColor: 'var(--gold)' }} />
              <span style={{ flex: 1, fontSize: 12 }}>{r}</span>
              <input className="input" style={{ width: 54 }} value={row.count} placeholder="#" onChange={e => onChange({ ...m, [r]: { ...row, count: e.target.value } })} />
            </div>
          );
        })}
      </div>
    );
  }
  if (field.type === 'channelChecklist') {
    const m = v || {};
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {MARKETING_CHANNELS.map(c => {
          const row = m[c] || { done: false, date: '' };
          return (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!row.done} onChange={e => onChange({ ...m, [c]: { ...row, done: e.target.checked } })} style={{ accentColor: 'var(--gold)' }} />
              {c}
            </label>
          );
        })}
      </div>
    );
  }
  if (field.type === 'moneyTable') {
    const rows = Array.isArray(v) && v.length ? v : defaultValueFor(field);
    const total = (col) => rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
    function update(i, col, val) {
      const next = rows.map((r, idx) => idx === i ? { ...r, [col]: val } : r);
      onChange(next);
    }
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
          <span style={{ flex: 2 }}>{field.rowKey === 'category' ? 'Category' : 'Source'}</span>
          <span style={{ flex: 1 }}>Estimated</span>
          <span style={{ flex: 1 }}>Actual</span>
        </div>
        {rows.map((r, i) => (
          <div key={r[field.rowKey]} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 2, fontSize: 12 }}>{r[field.rowKey]}</span>
            <input className="input" type="number" style={{ flex: 1 }} value={r.estimated} onChange={e => update(i, 'estimated', e.target.value)} />
            <input className="input" type="number" style={{ flex: 1 }} value={r.actual} onChange={e => update(i, 'actual', e.target.value)} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
          <span style={{ flex: 2 }}>Total</span>
          <span style={{ flex: 1 }}>${total('estimated').toLocaleString()}</span>
          <span style={{ flex: 1 }}>${total('actual').toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
}

function AreaFormSection({ fields, data, onFieldChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map(f => (
        <div key={f.key}>
          <div className="label">{f.label}</div>
          <Field field={f} value={data[f.key]} onChange={val => onFieldChange(f.key, val)} />
          {f.pairedDateKey && (data[f.key] === 'Yes' || data[f.key] === '') && (
            <div style={{ marginTop: 6, maxWidth: 180 }}>
              <div className="label">Date</div>
              <input className="input" type="date" value={data[f.pairedDateKey] || ''} onChange={e => onFieldChange(f.pairedDateKey, e.target.value)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Top-level Areas tab ----------

export default function AreasTab({ event, session, volunteer }) {
  const [rows, setRows] = useState(null);
  const [activeArea, setActiveArea] = useState('programs');
  const [phase, setPhase] = useState('pre');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAreaData(event.id).then(setRows);
  }, [event.id]);

  if (rows === null) return <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>;

  const areaDef = AREA_DEFAULTS.find(a => a.key === activeArea);
  const row = rows.find(r => r.area_key === activeArea);
  const preData = (row && row.pre_data) || {};
  const postData = (row && row.post_data) || {};
  const ownerName = (row && row.owner_name) || areaDef.defaultOwner;
  const schema = SCHEMAS[activeArea];
  const fields = phase === 'pre' ? schema.pre : schema.post;
  const data = phase === 'pre' ? preData : postData;

  function updateField(key, val) {
    setRows(prev => {
      const next = prev.some(r => r.area_key === activeArea) ? prev.map(r => r.area_key === activeArea ? { ...r, [phase === 'pre' ? 'pre_data' : 'post_data']: { ...(phase === 'pre' ? r.pre_data : r.post_data), [key]: val } } : r)
        : [...prev, { area_key: activeArea, owner_name: areaDef.defaultOwner, pre_data: phase === 'pre' ? { [key]: val } : {}, post_data: phase === 'post' ? { [key]: val } : {} }];
      return next;
    });
  }

  function save() {
    setSaving(true);
    const current = rows.find(r => r.area_key === activeArea) || { pre_data: {}, post_data: {}, owner_name: areaDef.defaultOwner };
    const fullName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();
    saveArea(event.id, activeArea, { ownerName: current.owner_name, preData: current.pre_data, postData: current.post_data, authUserId: session.user.id }).then(res => {
      setSaving(false);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        logActivity({ vol: volunteer, authUserId: session.user.id, action: 'committee_area_updated', description: `${fullName || 'A volunteer'} updated ${areaDef.label} notes for "${event.name}"` });
      }
    });
  }

  function updateOwner(name) {
    setRows(prev => prev.some(r => r.area_key === activeArea) ? prev.map(r => r.area_key === activeArea ? { ...r, owner_name: name } : r) : [...prev, { area_key: activeArea, owner_name: name, pre_data: {}, post_data: {} }]);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {AREA_DEFAULTS.map(a => (
          <button key={a.key} onClick={() => setActiveArea(a.key)}
            className={activeArea === a.key ? 'btn-gold' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '6px 12px' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>{areaDef.label}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Owner: <input value={ownerName} onChange={e => updateOwner(e.target.value)} style={{ border: 'none', borderBottom: '1px dashed var(--border)', background: 'none', fontSize: 12, color: 'var(--gold)', width: 140 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, background: 'var(--light)', borderRadius: 8, padding: 2 }}>
          <button onClick={() => setPhase('pre')} style={{ border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: phase === 'pre' ? 600 : 400, cursor: 'pointer', background: phase === 'pre' ? '#fff' : 'transparent' }}>Pre-Event</button>
          <button onClick={() => setPhase('post')} style={{ border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: phase === 'post' ? 600 : 400, cursor: 'pointer', background: phase === 'post' ? '#fff' : 'transparent' }}>Post-Event</button>
        </div>
      </div>

      <AreaFormSection fields={fields} data={data} onFieldChange={updateField} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <button className="btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--gold)' }}>Saved ✓</span>}
      </div>
    </div>
  );
}
