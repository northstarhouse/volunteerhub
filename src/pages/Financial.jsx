import { useState, useEffect } from 'react';
import { fetchAllReimbursements, updateReimbursement, parseReceipts } from '../lib/db.js';

// Treasurer's own view: every reimbursement request, with the money owed up top and one-tap status changes.
const STATUS_STYLE = {
  'Submitted':               { bg: '#e6f0fb', fg: '#1d4ed8' },
  'Pending Review':          { bg: '#fdf3e0', fg: '#92600c' },
  'Pending':                 { bg: '#fdf3e0', fg: '#92600c' },
  'More Information Needed': { bg: '#fde8e0', fg: '#c2410c' },
  'Approved':                { bg: '#e3f6ec', fg: '#15803d' },
  'Paid':                    { bg: '#e3f6ec', fg: '#15803d' },
  'Denied':                  { bg: '#fbe4e4', fg: '#c0392b' },
};
const statusOf = (r) => r.status || 'Pending';
const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GROUPS = [
  { key: 'review', label: 'Needs review', test: (s) => ['Submitted', 'Pending Review', 'Pending', 'More Information Needed'].includes(s) },
  { key: 'approved', label: 'Approved, to pay', test: (s) => s === 'Approved' },
  { key: 'paid', label: 'Paid', test: (s) => s === 'Paid' },
  { key: 'denied', label: 'Denied', test: (s) => s === 'Denied' },
  { key: 'all', label: 'All', test: () => true },
];

export default function Financial() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('review');
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAllReimbursements().then(setRows).catch(() => setRows([])); }, []);

  async function setStatus(r, status) {
    if (busyId) return;
    setBusyId(r.id);
    const res = await updateReimbursement(r.id, { status, ...(status === 'Paid' ? { needs_reimbursement: false } : {}) });
    setBusyId(null);
    if (res.error) { alert('Could not update: ' + res.error); return; }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status, ...(status === 'Paid' ? { needs_reimbursement: false } : {}) } : x)));
  }

  const all = rows || [];
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const group = GROUPS.find((g) => g.key === tab) || GROUPS[0];
  const shown = all.filter((r) => group.test(statusOf(r))).filter((r) => {
    if (!words.length) return true;
    const hay = [r.volunteer_name, r.description, r.area, r.event_name, r.notes].filter(Boolean).join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const sum = (g) => all.filter((r) => g.test(statusOf(r))).reduce((n, r) => n + (Number(r.amount) || 0), 0);
  const count = (g) => all.filter((r) => g.test(statusOf(r))).length;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900 }}>
      <div style={{ fontSize: 22, fontFamily: "'Cardo','Georgia',serif", fontWeight: 700, marginBottom: 4 }}>Financial</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Reimbursement requests from volunteers. Approve, mark paid once the check is mailed, or send back for more information.</div>

      {rows === null ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div> : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {GROUPS.filter((g) => g.key !== 'all').map((g) => (
              <button key={g.key} onClick={() => setTab(g.key)} className="card"
                style={{ flex: '1 1 150px', textAlign: 'left', cursor: 'pointer', padding: '12px 14px', border: tab === g.key ? '1.5px solid var(--gold)' : undefined }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{g.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{money(sum(g))}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{count(g)} {count(g) === 1 ? 'request' : 'requests'}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {GROUPS.map((g) => (
              <button key={g.key} onClick={() => setTab(g.key)}
                style={{ padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--border)', background: tab === g.key ? 'var(--gold)' : '#fff', color: tab === g.key ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{g.label}</button>
            ))}
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, item, area…"
              style={{ marginLeft: 'auto', padding: '6px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 12, width: 220, maxWidth: '100%' }} />
          </div>

          {shown.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 30 }}>Nothing here.</div>
          ) : shown.map((r) => {
            const st = statusOf(r);
            const sty = STATUS_STYLE[st] || STATUS_STYLE.Submitted;
            const receipts = parseReceipts(r.receipt_url);
            return (
              <div key={r.id} className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.volunteer_name || 'Unknown'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {r.description || 'No description'}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {[r.date, r.area, r.event_name].filter(Boolean).join('  ·  ')}
                    </div>
                    {r.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{r.notes}</div>}
                    {receipts.length > 0 && (
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        {receipts.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', marginRight: 10 }}>Receipt{receipts.length > 1 ? ' ' + (i + 1) : ''}</a>)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{money(r.amount)}</div>
                    <span className="badge" style={{ background: sty.bg, color: sty.fg }}>{st}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {st !== 'Approved' && st !== 'Paid' && <button disabled={busyId === r.id} onClick={() => setStatus(r, 'Approved')} style={btn('#15803d')}>Approve</button>}
                  {st !== 'Paid' && <button disabled={busyId === r.id} onClick={() => setStatus(r, 'Paid')} style={btn('#15803d', true)}>Mark paid</button>}
                  {st !== 'More Information Needed' && st !== 'Paid' && <button disabled={busyId === r.id} onClick={() => setStatus(r, 'More Information Needed')} style={btn('#c2410c', true)}>Need more info</button>}
                  {st !== 'Denied' && st !== 'Paid' && <button disabled={busyId === r.id} onClick={() => setStatus(r, 'Denied')} style={btn('#c0392b', true)}>Deny</button>}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function btn(color, outline) {
  return { padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + color, background: outline ? '#fff' : color, color: outline ? color : '#fff' };
}
