// Generated from north-star-portal/src/app.jsx by scripts/sync-portal-event-overviews.mjs.
// Edit the Portal component and re-run the script to keep both views aligned.
import React from 'react';
import { SUPABASE_URL, SUPABASE_KEY, PORTAL_URL, openPortal, openPlanPreview } from '../lib/portalEvents.js';
const gold = '#886c44';

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e0d8cc", borderRadius: 10, padding: "14px 18px", minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "#2a2a2a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#777", marginTop: 2, minHeight: 16 }}>{sub || ''}</div>
    </div>
  );
}

var DEFAULT_EVENT_CHECKLIST = ['Flyer designed', 'Posted on social media', 'Newsletter mention', 'Tickets / RSVP page live', 'Reminder sent'].map(function(l) { return { label: l, done: false }; });

export default function PortalEventOverviews({ navigate, request }) {
  const fetch = request;
  var { useState, useEffect, useMemo } = React;
  // Event Overviews opens on the card-based Events tab, except when arriving
  // via the "Save to Event Overviews" flow (event-overviews/plans), which
  // should land straight on the plan the user just saved.
  var [tab, setTab] = useState(function() { return window.location.hash.replace(/^#/, '').indexOf('event-overviews/plans') === 0 ? 'plans' : 'overview'; });
  var [loading, setLoading] = useState(true);
  var [budgetRows, setBudgetRows] = useState([]);
  var [earningsRows, setEarningsRows] = useState([]);
  var [inHouse, setInHouse] = useState([]);
  var [expanded, setExpanded] = useState(null);
  var todayStr = new Date().toISOString().slice(0, 10);
  var [feedback, setFeedback] = useState([]);
  var [feedbackLoading, setFeedbackLoading] = useState(true);
  var [showAddFeedback, setShowAddFeedback] = useState(false);
  var [feedbackForm, setFeedbackForm] = useState({ event_name: '', source: '', name: '', role: '', feedback: '', date: todayStr });
  var [savingFeedback, setSavingFeedback] = useState(false);
  var [editingFeedbackId, setEditingFeedbackId] = useState(null);
  var [editFeedbackForm, setEditFeedbackForm] = useState(null);
  var [savingFeedbackEdit, setSavingFeedbackEdit] = useState(false);
  var [expandedEventGroups, setExpandedEventGroups] = useState({});
  var [showBulkFeedback, setShowBulkFeedback] = useState(false);
  var [bulkPasteText, setBulkPasteText] = useState('');
  var [bulkParsed, setBulkParsed] = useState(null);
  var [bulkEventName, setBulkEventName] = useState('');
  var [bulkSource, setBulkSource] = useState('');
  var [bulkDate, setBulkDate] = useState(todayStr);
  var [bulkSaving, setBulkSaving] = useState(false);
  var [plans, setPlans] = useState(null);
  var [openingPlanId, setOpeningPlanId] = useState(null);
  var [attachingPlanId, setAttachingPlanId] = useState(null);
  var [copiedPlanId, setCopiedPlanId] = useState(null);
  var [showAddEarning, setShowAddEarning] = useState(false);
  var [earningForm, setEarningForm] = useState({ event: '', earning_source: '', amount: '', notes: '', date: todayStr });
  var [savingEarning, setSavingEarning] = useState(false);
  var [showAddExpense, setShowAddExpense] = useState(false);
  var [expenseForm, setExpenseForm] = useState({ event_name: '', type: 'Purchase', description: '', amount: '', date: todayStr, purchased_by: '' });
  var [savingExpense, setSavingExpense] = useState(false);
  var [editingEarningId, setEditingEarningId] = useState(null);
  var [editEarningForm, setEditEarningForm] = useState(null);
  var [savingEarningEdit, setSavingEarningEdit] = useState(false);
  var [editingExpenseId, setEditingExpenseId] = useState(null);
  var [editExpenseForm, setEditExpenseForm] = useState(null);
  var [savingExpenseEdit, setSavingExpenseEdit] = useState(false);
  var [overviewCards, setOverviewCards] = useState(null);
  var [selectedEvent, setSelectedEvent] = useState(null);
  var [showNewEvent, setShowNewEvent] = useState(false);
  var [newEventForm, setNewEventForm] = useState({ name: '', date: todayStr });
  var [savingNewEvent, setSavingNewEvent] = useState(false);
  var [uploadingFlyerFor, setUploadingFlyerFor] = useState(null);
  var [newChecklistItem, setNewChecklistItem] = useState('');
  var [ticketOrders, setTicketOrders] = useState(null);
  var flyerInputRef = React.useRef(null);

  useEffect(function() {
    fetch(SUPABASE_URL + '/rest/v1/event_overview_cards?select=*', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setOverviewCards(Array.isArray(rows) ? rows : []);
    }).catch(function() { setOverviewCards([]); });
    // Real website ticket sales -- may not exist yet on installs that haven't
    // run the ticketing migration, so a failure here just means "no ticket
    // data to show" rather than a broken page (same handling as WebsitePaymentsView).
    fetch(SUPABASE_URL + '/rest/v1/ticket_orders?select=event_title,event_slug,event_date,kind,quantity,amount,paypal_fee,net_amount&limit=5000', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function(r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function(rows) {
      setTicketOrders(Array.isArray(rows) ? rows : []);
    }).catch(function() { setTicketOrders([]); });
  }, []);

  useEffect(function() {
    var hdrs = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
    Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Budget') + '?area=eq.Events&select=*', { headers: hdrs }).then(function(r) { return r.json(); }),
      fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Earnings') + '?area=eq.Events&select=*', { headers: hdrs }).then(function(r) { return r.json(); }),
      fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('In-House Events') + '?select=*&order=date.asc', { headers: hdrs }).then(function(r) { return r.json(); })
    ]).then(function(res) {
      setBudgetRows(Array.isArray(res[0]) ? res[0] : []);
      setEarningsRows(Array.isArray(res[1]) ? res[1] : []);
      setInHouse(Array.isArray(res[2]) ? res[2] : []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Event Feedback') + '?select=*&order=date.desc,id.desc', { headers: hdrs }).then(function(r) { return r.json(); }).then(function(rows) {
      setFeedback(Array.isArray(rows) ? rows : []);
      setFeedbackLoading(false);
    }).catch(function() { setFeedbackLoading(false); });
    loadPlans();
  }, []);

  function loadPlans() {
    fetch(SUPABASE_URL + '/rest/v1/planning_templates?select=*&order=created_at.desc', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setPlans(Array.isArray(rows) ? rows : []);
    }).catch(function() { setPlans([]); });
  }

  function handleViewPlan(p) {
    setOpeningPlanId(p.id);
    openPlanPreview(p.id, function() { setOpeningPlanId(null); });
  }

  function handleEditPlan(p) {
    openPortal('planning/edit/' + p.id);
  }

  function handleCopyPlanLink(p) {
    var link = PORTAL_URL + '#event-plan/' + p.id;
    function done() { setCopiedPlanId(p.id); setTimeout(function() { setCopiedPlanId(null); }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(function() { window.prompt('Copy this link:', link); });
    } else {
      window.prompt('Copy this link:', link);
    }
  }

  function handleAttachPlan(p) {
    setAttachingPlanId(p.id);
    fetch(SUPABASE_URL + '/rest/v1/vol_events?title=ilike.*Appreciation*&select=id,title&order=date.desc&limit=1', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function(r) { return r.json(); }).then(function(rows) {
      var ev = Array.isArray(rows) && rows[0];
      if (!ev) {
        setAttachingPlanId(null);
        alert('No upcoming Appreciation event found on the calendar to attach this plan to. Create the event first, then attach the plan.');
        return;
      }
      return fetch(SUPABASE_URL + '/rest/v1/vol_events?id=eq.' + ev.id, {
        method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: p.id })
      }).then(function() {
        setAttachingPlanId(null);
        alert('Attached "' + p.name + '" to "' + ev.title + '" — a "View Event Plan" button will now show on the dashboard RSVP card.');
      });
    }).catch(function() { setAttachingPlanId(null); alert('Could not attach the plan.'); });
  }

  function handleDeletePlan(p) {
    if (!window.confirm('Delete "' + p.name + '"? This can\'t be undone.')) return;
    fetch(SUPABASE_URL + '/rest/v1/planning_templates?id=eq.' + p.id, {
      method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function() {
      setPlans(function(prev) { return prev.filter(function(x) { return x.id !== p.id; }); });
    });
  }

  function fmt(n) { return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  var groups = useMemo(function() {
    var byEvent = {};
    function bucket(name) {
      var key = (name || '').trim() || 'Uncategorized';
      if (!byEvent[key]) byEvent[key] = { event: key, earnings: 0, costs: 0, earningsRows: [], expenseRows: [], date: null, link: null };
      return byEvent[key];
    }
    earningsRows.forEach(function(e) { var b = bucket(e.event); b.earnings += parseFloat(e.amount) || 0; b.earningsRows.push(e); });
    budgetRows.forEach(function(b0) {
      var b = bucket(b0.event_name);
      b.expenseRows.push(b0);
      if (b0.type === 'Purchase' || b0.type === 'In-Kind') b.costs += parseFloat(b0.amount) || 0;
    });
    inHouse.forEach(function(ev) {
      var name = (ev.name || '').trim();
      if (!name) return;
      var match = Object.keys(byEvent).find(function(k) { return k.toLowerCase() === name.toLowerCase(); });
      if (!match) return;
      byEvent[match].date = ev.date || byEvent[match].date;
      byEvent[match].link = ev.link || byEvent[match].link;
    });
    var list = Object.keys(byEvent).map(function(k) { var r = byEvent[k]; return Object.assign({}, r, { net: r.earnings - r.costs }); });
    list.sort(function(a, b) {
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return b.net - a.net;
    });
    return list;
  }, [budgetRows, earningsRows, inHouse]);

  var totalEarnings = groups.reduce(function(s, r) { return s + r.earnings; }, 0);
  var totalCosts = groups.reduce(function(s, r) { return s + r.costs; }, 0);
  var eventNameOptions = groups.map(function(g) { return g.event; }).filter(function(n) { return n && n !== 'Uncategorized'; });
  var feedbackSourceOptions = Array.from(new Set(feedback.map(function(f) { return (f.source || '').trim(); }).filter(Boolean))).sort();

  function keyOfName(n) { return (n || '').trim().toLowerCase(); }

  function findCardMeta(name) {
    if (!overviewCards) return null;
    var key = keyOfName(name);
    return overviewCards.find(function(c) { return keyOfName(c.event_name) === key; }) || null;
  }

  // Upserts (by event_name) into event_overview_cards -- only the columns
  // passed in `patch` are written, so this doubles as a partial update
  // (e.g. image-only, or checklist-only) as well as first-time creation.
  function upsertCardMeta(eventName, patch, cb) {
    var existing = findCardMeta(eventName);
    var body = Object.assign({ event_name: existing ? existing.event_name : eventName.trim() }, patch, { updated_at: new Date().toISOString() });
    fetch(SUPABASE_URL + '/rest/v1/event_overview_cards?on_conflict=event_name', {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); }).then(function(rows) {
      var updated = Array.isArray(rows) ? rows[0] : rows;
      if (updated && updated.id) {
        setOverviewCards(function(prev) {
          var list = prev || [];
          var idx = list.findIndex(function(c) { return c.id === updated.id; });
          if (idx === -1) return list.concat([updated]);
          var next = list.slice(); next[idx] = updated; return next;
        });
      }
      if (cb) cb(updated && updated.id ? updated : null);
    }).catch(function() { if (cb) cb(null); });
  }

  function uploadFlyer(eventName, file) {
    if (!file) return;
    setUploadingFlyerFor(eventName);
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = reader.result.split(',')[1];
      var ext = (file.name.match(/\.[a-zA-Z0-9]+$/) || [''])[0];
      var safeName = eventName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Event';
      var filename = safeName + ' Flyer ' + Date.now() + ext;
      fetch(SUPABASE_URL + '/functions/v1/upload-archive-file', {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          mimeType: file.type || 'application/octet-stream',
          base64: base64,
          kind: 'general',
          subfolder: 'Event Flyers',
          makePublic: true,
          driveDescription: 'Flyer for ' + eventName
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        setUploadingFlyerFor(null);
        if (!data.success) { alert('Upload failed: ' + (data.error || 'unknown error')); return; }
        upsertCardMeta(eventName, { image_url: data.url, image_drive_file_id: data.fileId, image_drive_folder_url: data.folderUrl });
      }).catch(function(err) { setUploadingFlyerFor(null); alert('Upload error: ' + err.message); });
    };
    reader.onerror = function() { setUploadingFlyerFor(null); alert('Failed to read file.'); };
    reader.readAsDataURL(file);
  }

  function toggleChecklistItem(eventName, idx) {
    var meta = findCardMeta(eventName);
    var list = (meta && Array.isArray(meta.checklist)) ? meta.checklist.slice() : [];
    if (!list[idx]) return;
    list[idx] = Object.assign({}, list[idx], { done: !list[idx].done });
    upsertCardMeta(eventName, { checklist: list });
  }

  function addChecklistItem(eventName, label) {
    if (!label.trim()) return;
    var meta = findCardMeta(eventName);
    var list = (meta && Array.isArray(meta.checklist)) ? meta.checklist.slice() : [];
    list.push({ label: label.trim(), done: false });
    upsertCardMeta(eventName, { checklist: list });
    setNewChecklistItem('');
  }

  function removeChecklistItem(eventName, idx) {
    var meta = findCardMeta(eventName);
    var list = (meta && Array.isArray(meta.checklist)) ? meta.checklist.slice() : [];
    list.splice(idx, 1);
    upsertCardMeta(eventName, { checklist: list });
  }

  function createNewEvent(e) {
    e.preventDefault();
    if (!newEventForm.name.trim() || savingNewEvent) return;
    setSavingNewEvent(true);
    upsertCardMeta(newEventForm.name.trim(), { event_date: newEventForm.date || null, checklist: DEFAULT_EVENT_CHECKLIST }, function(updated) {
      setSavingNewEvent(false);
      if (updated) {
        setShowNewEvent(false);
        var createdName = updated.event_name;
        setNewEventForm({ name: '', date: todayStr });
        setSelectedEvent(createdName);
      } else {
        alert('Could not create the event.');
      }
    });
  }

  // Merges three sources, all keyed by free-text event name, so nothing
  // already tracked anywhere disappears from the card view and a brand-new
  // event can be created here before any money moves:
  //  - groups: manually-logged P&L (Op Earnings / Op Budget)
  //  - ticket_orders: real website ticket/RSVP sales
  //  - event_overview_cards: flyer image, checklist, an explicit date
  var eventCards = useMemo(function() {
    var byKey = {};
    function ensure(name) {
      var k = keyOfName(name);
      if (!byKey[k]) byKey[k] = { name: name, date: null, earnings: 0, costs: 0, net: 0, earningsRows: [], expenseRows: [], image_url: null, checklist: [], ticketQty: 0, ticketRevenue: 0, ticketFees: 0, ticketNet: 0, rsvpQty: 0 };
      return byKey[k];
    }
    groups.forEach(function(g) {
      if (g.event === 'Uncategorized') return;
      var b = ensure(g.event);
      b.date = g.date; b.earnings = g.earnings; b.costs = g.costs; b.net = g.net; b.earningsRows = g.earningsRows; b.expenseRows = g.expenseRows;
    });
    (ticketOrders || []).forEach(function(o) {
      var name = o.event_title || o.event_slug;
      if (!name) return;
      var b = ensure(name);
      b.date = b.date || o.event_date || null;
      if (o.kind === 'rsvp') {
        b.rsvpQty += Number(o.quantity || 0);
      } else {
        b.ticketQty += Number(o.quantity || 0);
        b.ticketRevenue += Number(o.amount || 0);
        b.ticketFees += Number(o.paypal_fee || 0);
        b.ticketNet += Number(o.net_amount != null ? o.net_amount : (o.amount || 0));
      }
    });
    (overviewCards || []).forEach(function(c) {
      var b = ensure(c.event_name);
      b.date = c.event_date || b.date;
      b.image_url = c.image_url || null;
      b.checklist = Array.isArray(c.checklist) ? c.checklist : [];
    });
    return Object.keys(byKey).map(function(k) { return byKey[k]; });
  }, [groups, overviewCards, ticketOrders]);

  var todayForBuckets = new Date(); todayForBuckets.setHours(0, 0, 0, 0);
  var upcomingCards = eventCards.filter(function(c) { return c.date && new Date(c.date + 'T00:00:00') >= todayForBuckets; })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  var pastCards = eventCards.filter(function(c) { return !c.date || new Date(c.date + 'T00:00:00') < todayForBuckets; })
    .sort(function(a, b) { if (a.date && b.date) return new Date(b.date) - new Date(a.date); if (a.date) return -1; if (b.date) return 1; return 0; });
  var selectedEventCard = selectedEvent ? eventCards.find(function(c) { return keyOfName(c.name) === keyOfName(selectedEvent); }) : null;

  function renderEventCard(c) {
    var dateStr = c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    return (
      <div key={c.name} onClick={function() { setSelectedEvent(c.name); }}
        style={{ background: '#fff', border: '0.5px solid #e8e0d5', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s, transform 0.15s' }}
        onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f0ebe2', backgroundImage: c.image_url ? 'url(' + c.image_url + ')' : 'linear-gradient(135deg,#f0ebe2,#e4d9c6)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{dateStr || 'No date set'}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: '#5a8a5a', fontWeight: 600 }}>{fmt(c.earnings + c.ticketRevenue)}</span>
            <span style={{ color: '#c07040', fontWeight: 600 }}>-{fmt(c.costs)}</span>
          </div>
        </div>
      </div>
    );
  }

  function addEarning(e) {
    e.preventDefault();
    setSavingEarning(true);
    var payload = { area: 'Events', event: earningForm.event, earning_source: earningForm.earning_source || null, amount: parseFloat(earningForm.amount) || 0, notes: earningForm.notes || null, date: earningForm.date || null };
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Earnings'), {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setSavingEarning(false);
      if (rows && rows.code) { alert('Add failed: ' + (rows.message || rows.code)); return; }
      if (rows && rows[0]) setEarningsRows(function(prev) { return [rows[0]].concat(prev); });
      setEarningForm({ event: '', earning_source: '', amount: '', notes: '', date: todayStr });
      setShowAddEarning(false);
    }).catch(function() { setSavingEarning(false); });
  }

  function addExpense(e) {
    e.preventDefault();
    setSavingExpense(true);
    var payload = { area: 'Events', type: expenseForm.type, description: expenseForm.description, amount: parseFloat(expenseForm.amount) || 0, date: expenseForm.date || null, purchased_by: expenseForm.purchased_by || null, event_name: expenseForm.event_name || null };
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Budget'), {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setSavingExpense(false);
      if (rows && rows.code) { alert('Add failed: ' + (rows.message || rows.hint || rows.code)); return; }
      if (rows && rows[0]) setBudgetRows(function(prev) { return [rows[0]].concat(prev); });
      setExpenseForm({ event_name: '', type: 'Purchase', description: '', amount: '', date: todayStr, purchased_by: '' });
      setShowAddExpense(false);
    }).catch(function() { setSavingExpense(false); });
  }

  function startEditEarning(e) {
    setEditingEarningId(e.id);
    setEditEarningForm({ event: e.event || '', earning_source: e.earning_source || '', amount: e.amount != null ? String(e.amount) : '', notes: e.notes || '', date: e.date || todayStr });
  }

  function saveEditEarning() {
    if (!editEarningForm) return;
    setSavingEarningEdit(true);
    var patch = { event: editEarningForm.event, earning_source: editEarningForm.earning_source || null, amount: parseFloat(editEarningForm.amount) || 0, notes: editEarningForm.notes || null, date: editEarningForm.date || null };
    var id = editingEarningId;
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Earnings') + '?id=eq.' + id, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    }).then(function(r) {
      if (!r.ok) throw new Error('Failed to save');
      setSavingEarningEdit(false);
      setEarningsRows(function(prev) { return prev.map(function(e) { return e.id === id ? Object.assign({}, e, patch) : e; }); });
      setEditingEarningId(null);
      setEditEarningForm(null);
    }).catch(function() { setSavingEarningEdit(false); alert('Failed to save changes'); });
  }

  function deleteEarning(id) {
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Earnings') + '?id=eq.' + id, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function() {
      setEarningsRows(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
    });
  }

  function startEditExpense(b) {
    setEditingExpenseId(b.id);
    setEditExpenseForm({ event_name: b.event_name || '', type: b.type || 'Purchase', description: b.description || '', amount: b.amount != null ? String(b.amount) : '', date: b.date || todayStr, purchased_by: b.purchased_by || '' });
  }

  function saveEditExpense() {
    if (!editExpenseForm) return;
    setSavingExpenseEdit(true);
    var patch = { event_name: editExpenseForm.event_name || null, type: editExpenseForm.type, description: editExpenseForm.description, amount: parseFloat(editExpenseForm.amount) || 0, date: editExpenseForm.date || null, purchased_by: editExpenseForm.purchased_by || null };
    var id = editingExpenseId;
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Budget') + '?id=eq.' + id, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    }).then(function(r) {
      if (!r.ok) throw new Error('Failed to save');
      setSavingExpenseEdit(false);
      setBudgetRows(function(prev) { return prev.map(function(b) { return b.id === id ? Object.assign({}, b, patch) : b; }); });
      setEditingExpenseId(null);
      setEditExpenseForm(null);
    }).catch(function() { setSavingExpenseEdit(false); alert('Failed to save changes'); });
  }

  function deleteExpense(id) {
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Op Budget') + '?id=eq.' + id, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function() {
      setBudgetRows(function(prev) { return prev.filter(function(b) { return b.id !== id; }); });
    });
  }

  // Splits a pasted block of multiple survey responses (e.g. exported from a
  // form tool) into one feedback entry per "Response N" section, so a whole
  // batch can be logged in one paste instead of retyping each one by hand.
  // The full Q&A text of each block becomes that entry's feedback body
  // (preserves context like email/answers that don't have their own
  // column); Name/Craft are pulled out into the name/role fields when
  // present, everything else stays in the feedback text.
  function parseBulkPaste() {
    // "Response N" may stand alone on its own line, or have a title on the
    // same line ("Response 1: Steve - Woodworker") -- match up to end of
    // that line either way, not just a bare newline right after the number.
    var parts = bulkPasteText.split(/Response\s+\d+[^\n]*\n+/i);
    var blocks = parts.map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
    var parsed = blocks.map(function(block) {
      var nameMatch = block.match(/Name:\s*(.+)/i);
      var craftMatch = block.match(/Craft:\s*(.+)/i);
      return { name: nameMatch ? nameMatch[1].trim() : '', role: craftMatch ? craftMatch[1].trim() : '', feedback: block };
    });
    setBulkParsed(parsed);
  }

  function updateBulkParsedField(i, field, val) {
    setBulkParsed(function(prev) { var next = prev.slice(); next[i] = Object.assign({}, next[i], (function() { var o = {}; o[field] = val; return o; })()); return next; });
  }

  function removeBulkParsedItem(i) {
    setBulkParsed(function(prev) { return prev.filter(function(_, idx) { return idx !== i; }); });
  }

  function saveBulkFeedback() {
    if (!bulkParsed || !bulkParsed.length || bulkSaving) return;
    setBulkSaving(true);
    var payloads = bulkParsed.map(function(p) {
      return { event_name: bulkEventName || null, source: bulkSource || null, name: p.name || null, role: p.role || null, feedback: p.feedback, date: bulkDate || null };
    });
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Event Feedback'), {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payloads)
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setBulkSaving(false);
      if (rows && rows.code) { alert('Add failed: ' + (rows.message || rows.code)); return; }
      if (Array.isArray(rows)) setFeedback(function(prev) { return rows.concat(prev); });
      setBulkPasteText(''); setBulkParsed(null); setBulkEventName(''); setBulkSource('');
      setShowBulkFeedback(false);
    }).catch(function() { setBulkSaving(false); alert('Add failed: network error.'); });
  }

  function addFeedback(e) {
    e.preventDefault();
    setSavingFeedback(true);
    var payload = { event_name: feedbackForm.event_name || null, source: feedbackForm.source || null, name: feedbackForm.name || null, role: feedbackForm.role || null, feedback: feedbackForm.feedback, date: feedbackForm.date || null };
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Event Feedback'), {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); }).then(function(rows) {
      setSavingFeedback(false);
      if (rows && rows.code) { alert('Add failed: ' + (rows.message || rows.code)); return; }
      if (rows && rows[0]) setFeedback(function(prev) { return [rows[0]].concat(prev); });
      setFeedbackForm({ event_name: '', source: '', name: '', role: '', feedback: '', date: todayStr });
      setShowAddFeedback(false);
    }).catch(function() { setSavingFeedback(false); });
  }

  function startEditFeedback(f) {
    setEditingFeedbackId(f.id);
    setEditFeedbackForm({ event_name: f.event_name || '', source: f.source || '', name: f.name || '', role: f.role || '', feedback: f.feedback || '', date: f.date || todayStr });
  }

  function saveEditFeedback() {
    if (!editFeedbackForm) return;
    setSavingFeedbackEdit(true);
    var patch = { event_name: editFeedbackForm.event_name || null, source: editFeedbackForm.source || null, name: editFeedbackForm.name || null, role: editFeedbackForm.role || null, feedback: editFeedbackForm.feedback, date: editFeedbackForm.date || null };
    var id = editingFeedbackId;
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Event Feedback') + '?id=eq.' + id, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    }).then(function(r) {
      if (!r.ok) throw new Error('Failed to save');
      setSavingFeedbackEdit(false);
      setFeedback(function(prev) { return prev.map(function(f) { return f.id === id ? Object.assign({}, f, patch) : f; }); });
      setEditingFeedbackId(null);
      setEditFeedbackForm(null);
    }).catch(function() { setSavingFeedbackEdit(false); alert('Failed to save changes'); });
  }

  function deleteFeedback(id) {
    fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent('Event Feedback') + '?id=eq.' + id, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    }).then(function() {
      setFeedback(function(prev) { return prev.filter(function(f) { return f.id !== id; }); });
    });
  }

  var fieldSt = { width: '100%', padding: '7px 10px', border: '0.5px solid #e0d8cc', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' };
  var fieldLbl = { fontSize: 11, color: '#888', marginBottom: 4, display: 'block' };

  return (
    <div>
      <datalist id="events-hub-event-options">
        {eventNameOptions.map(function(n) { return <option key={n} value={n} />; })}
      </datalist>
      <datalist id="events-hub-feedback-source-options">
        {feedbackSourceOptions.map(function(n) { return <option key={n} value={n} />; })}
      </datalist>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={function() { navigate('admin'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: gold, fontSize: 13, fontWeight: 500, padding: 0 }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            {tab === 'overview' ? 'Click an event for ticket sales, its marketing checklist, and expenses'
              : tab === 'pnl' ? 'Earnings & expenses by event, pulled from the Events operational area'
              : tab === 'feedback' ? 'Guest and volunteer feedback by event'
              : 'Plans built in Planning, saved for reuse'}
          </div>
        </div>
        {tab === 'pnl' && (
          <button onClick={function() { setShowAddEarning(function(s) { return !s; }); setShowAddExpense(false); }} style={{ fontSize: 12, background: showAddEarning ? '#f5f0ea' : gold, color: showAddEarning ? '#666' : '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>{showAddEarning ? 'Cancel' : '+ Log Earning'}</button>
        )}
        {tab === 'pnl' && (
          <button onClick={function() { setShowAddExpense(function(s) { return !s; }); setShowAddEarning(false); }} style={{ fontSize: 12, background: showAddExpense ? '#f5f0ea' : gold, color: showAddExpense ? '#666' : '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>{showAddExpense ? 'Cancel' : '+ Log Expense'}</button>
        )}
        {tab === 'feedback' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={function() { setShowBulkFeedback(function(s) { return !s; }); setShowAddFeedback(false); }} style={{ fontSize: 12, background: showBulkFeedback ? '#f5f0ea' : '#fff', color: showBulkFeedback ? '#666' : gold, border: '1px solid ' + (showBulkFeedback ? '#e0d8cc' : gold), borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>{showBulkFeedback ? 'Cancel' : '📋 Paste Multiple'}</button>
            <button onClick={function() { setShowAddFeedback(function(s) { return !s; }); setShowBulkFeedback(false); }} style={{ fontSize: 12, background: showAddFeedback ? '#f5f0ea' : gold, color: showAddFeedback ? '#666' : '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>{showAddFeedback ? 'Cancel' : '+ Add Feedback'}</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '0.5px solid #e8dece' }}>
        <button onClick={function() { setTab('overview'); }} style={{ background: 'none', border: 'none', borderBottom: tab === 'overview' ? '2px solid ' + gold : '2px solid transparent', padding: '8px 4px', marginBottom: -1, fontSize: 13, fontWeight: tab === 'overview' ? 600 : 400, color: tab === 'overview' ? '#2a2a2a' : '#999', cursor: 'pointer' }}>Events</button>
        <button onClick={function() { setTab('pnl'); }} style={{ background: 'none', border: 'none', borderBottom: tab === 'pnl' ? '2px solid ' + gold : '2px solid transparent', padding: '8px 4px', marginBottom: -1, marginLeft: 16, fontSize: 13, fontWeight: tab === 'pnl' ? 600 : 400, color: tab === 'pnl' ? '#2a2a2a' : '#999', cursor: 'pointer' }}>Profit & Loss</button>
        <button onClick={function() { setTab('feedback'); }} style={{ background: 'none', border: 'none', borderBottom: tab === 'feedback' ? '2px solid ' + gold : '2px solid transparent', padding: '8px 4px', marginBottom: -1, marginLeft: 16, fontSize: 13, fontWeight: tab === 'feedback' ? 600 : 400, color: tab === 'feedback' ? '#2a2a2a' : '#999', cursor: 'pointer' }}>Reviews & Feedback{feedback.length > 0 ? ' (' + feedback.length + ')' : ''}</button>
        <button onClick={function() { setTab('plans'); }} style={{ background: 'none', border: 'none', borderBottom: tab === 'plans' ? '2px solid ' + gold : '2px solid transparent', padding: '8px 4px', marginBottom: -1, marginLeft: 16, fontSize: 13, fontWeight: tab === 'plans' ? 600 : 400, color: tab === 'plans' ? '#2a2a2a' : '#999', cursor: 'pointer' }}>Saved Plans{plans && plans.length > 0 ? ' (' + plans.length + ')' : ''}</button>
      </div>

      {tab === 'pnl' && showAddEarning && (
        <form onSubmit={addEarning} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={fieldLbl}>Event</label>
              <input required value={earningForm.event} onChange={function(e) { setEarningForm(function(f) { return Object.assign({}, f, { event: e.target.value }); }); }} list="events-hub-event-options" style={fieldSt} placeholder="e.g. Spring Gala" />
            </div>
            <div>
              <label style={fieldLbl}>Source</label>
              <input value={earningForm.earning_source} onChange={function(e) { setEarningForm(function(f) { return Object.assign({}, f, { earning_source: e.target.value }); }); }} style={fieldSt} placeholder="e.g. Ticket sales" />
            </div>
            <div>
              <label style={fieldLbl}>Amount</label>
              <input required type="number" step="0.01" min="0" value={earningForm.amount} onChange={function(e) { setEarningForm(function(f) { return Object.assign({}, f, { amount: e.target.value }); }); }} style={fieldSt} placeholder="0.00" />
            </div>
            <div>
              <label style={fieldLbl}>Date</label>
              <input type="date" value={earningForm.date} onChange={function(e) { setEarningForm(function(f) { return Object.assign({}, f, { date: e.target.value }); }); }} style={fieldSt} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLbl}>Notes</label>
            <input value={earningForm.notes} onChange={function(e) { setEarningForm(function(f) { return Object.assign({}, f, { notes: e.target.value }); }); }} style={fieldSt} placeholder="Optional notes…" />
          </div>
          <button type="submit" disabled={savingEarning} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: savingEarning ? 0.5 : 1 }}>{savingEarning ? 'Saving…' : 'Add Earning'}</button>
        </form>
      )}

      {tab === 'pnl' && showAddExpense && (
        <form onSubmit={addExpense} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={fieldLbl}>Event</label>
              <input required value={expenseForm.event_name} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { event_name: e.target.value }); }); }} list="events-hub-event-options" style={fieldSt} placeholder="e.g. Spring Gala" />
            </div>
            <div>
              <label style={fieldLbl}>Type</label>
              <select value={expenseForm.type} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { type: e.target.value }); }); }} style={fieldSt}>
                <option value="Purchase">Purchase</option>
                <option value="In-Kind">In-Kind</option>
              </select>
            </div>
            <div>
              <label style={fieldLbl}>Amount</label>
              <input required type="number" step="0.01" min="0" value={expenseForm.amount} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { amount: e.target.value }); }); }} style={fieldSt} placeholder="0.00" />
            </div>
            <div>
              <label style={fieldLbl}>Date</label>
              <input type="date" value={expenseForm.date} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { date: e.target.value }); }); }} style={fieldSt} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLbl}>Description</label>
            <input required value={expenseForm.description} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { description: e.target.value }); }); }} style={fieldSt} placeholder="What was this for…" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLbl}>Purchased By</label>
            <input value={expenseForm.purchased_by} onChange={function(e) { setExpenseForm(function(f) { return Object.assign({}, f, { purchased_by: e.target.value }); }); }} style={fieldSt} placeholder="Optional" />
          </div>
          <button type="submit" disabled={savingExpense} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: savingExpense ? 0.5 : 1 }}>{savingExpense ? 'Saving…' : 'Add Expense'}</button>
        </form>
      )}

      {tab === 'pnl' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Earnings" value={fmt(totalEarnings)} />
        <StatCard label="Costs" value={fmt(totalCosts)} />
        <StatCard label="Net" value={fmt(totalEarnings - totalCosts)} />
      </div>
      )}

      {tab === 'pnl' && (loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 13 }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#ccc', fontSize: 13 }}>No events tracked yet — add earnings or expenses under Operational Areas → Events.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map(function(g) {
            var isOpen = expanded === g.event;
            return (
              <div key={g.event} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={function() { setExpanded(isOpen ? null : g.event); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fdfcfb', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{g.event}</div>
                    {g.date && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: '#5a8a5a', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>{fmt(g.earnings)}</span>
                  <span style={{ fontSize: 12, color: '#c07040', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>-{fmt(g.costs)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: g.net >= 0 ? '#2e7d32' : '#c62828', minWidth: 80, textAlign: 'right' }}>{g.net >= 0 ? '' : '-'}{fmt(Math.abs(g.net))}</span>
                  <span style={{ fontSize: 12, color: '#ccc' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 16px 14px' }}>
                    {g.link && <a href={g.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: gold, textDecoration: 'none' }}>Event details ↗</a>}
                    {g.earningsRows.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Earnings</div>
                        {g.earningsRows.map(function(e, i) {
                          if (editingEarningId === e.id && editEarningForm) {
                            return (
                              <div key={i} style={{ padding: '8px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                  <input value={editEarningForm.event} onChange={function(ev) { setEditEarningForm(function(f) { return Object.assign({}, f, { event: ev.target.value }); }); }} list="events-hub-event-options" style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Event" />
                                  <input value={editEarningForm.earning_source} onChange={function(ev) { setEditEarningForm(function(f) { return Object.assign({}, f, { earning_source: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Source" />
                                  <input type="number" step="0.01" min="0" value={editEarningForm.amount} onChange={function(ev) { setEditEarningForm(function(f) { return Object.assign({}, f, { amount: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Amount" />
                                  <input type="date" value={editEarningForm.date} onChange={function(ev) { setEditEarningForm(function(f) { return Object.assign({}, f, { date: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                                </div>
                                <input value={editEarningForm.notes} onChange={function(ev) { setEditEarningForm(function(f) { return Object.assign({}, f, { notes: ev.target.value }); }); }} style={{ width: '100%', padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', marginBottom: 6 }} placeholder="Notes" />
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={saveEditEarning} disabled={savingEarningEdit} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: savingEarningEdit ? 0.6 : 1 }}>{savingEarningEdit ? 'Saving…' : 'Save'}</button>
                                  <button onClick={function() { setEditingEarningId(null); setEditEarningForm(null); }} disabled={savingEarningEdit} style={{ background: '#f0ece6', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, color: '#666', cursor: 'pointer' }}>Cancel</button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                              <span style={{ color: '#555' }}>{e.earning_source || 'Earning'}{e.notes ? ' — ' + e.notes : ''}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ color: '#5a8a5a', fontWeight: 600 }}>{fmt(e.amount)}</span>
                                <button onClick={function() { startEditEarning(e); }} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px', display: 'flex', alignItems: 'center' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button onClick={function() { deleteEarning(e.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 13, padding: '0 2px' }}>×</button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {g.expenseRows.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Expenses</div>
                        {g.expenseRows.map(function(b, i) {
                          if (editingExpenseId === b.id && editExpenseForm) {
                            return (
                              <div key={i} style={{ padding: '8px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                  <input value={editExpenseForm.event_name} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { event_name: ev.target.value }); }); }} list="events-hub-event-options" style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Event" />
                                  <select value={editExpenseForm.type} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { type: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
                                    <option value="Purchase">Purchase</option>
                                    <option value="In-Kind">In-Kind</option>
                                  </select>
                                  <input type="number" step="0.01" min="0" value={editExpenseForm.amount} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { amount: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Amount" />
                                  <input type="date" value={editExpenseForm.date} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { date: ev.target.value }); }); }} style={{ padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                                </div>
                                <input value={editExpenseForm.description} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { description: ev.target.value }); }); }} style={{ width: '100%', padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', marginBottom: 6 }} placeholder="Description" />
                                <input value={editExpenseForm.purchased_by} onChange={function(ev) { setEditExpenseForm(function(f) { return Object.assign({}, f, { purchased_by: ev.target.value }); }); }} style={{ width: '100%', padding: '5px 7px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', marginBottom: 6 }} placeholder="Purchased by" />
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={saveEditExpense} disabled={savingExpenseEdit} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: savingExpenseEdit ? 0.6 : 1 }}>{savingExpenseEdit ? 'Saving…' : 'Save'}</button>
                                  <button onClick={function() { setEditingExpenseId(null); setEditExpenseForm(null); }} disabled={savingExpenseEdit} style={{ background: '#f0ece6', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, color: '#666', cursor: 'pointer' }}>Cancel</button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                              <span style={{ color: '#555' }}>{b.description}{b.type ? ' (' + b.type + ')' : ''}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ color: '#c07040', fontWeight: 600 }}>{fmt(b.amount)}</span>
                                <button onClick={function() { startEditExpense(b); }} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px', display: 'flex', alignItems: 'center' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button onClick={function() { deleteExpense(b.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 13, padding: '0 2px' }}>×</button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {g.earningsRows.length === 0 && g.expenseRows.length === 0 && (
                      <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', marginTop: 8 }}>No financial entries recorded for this event yet.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {tab === 'feedback' && showBulkFeedback && (
        <div style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
            Paste a batch of survey responses (each starting with "Response 1", "Response 2", etc). Each one becomes its own review, filed under the event you pick below — Name/Craft get pulled into the name/role fields when present; everything else stays as the review text.
          </div>
          {!bulkParsed ? (
            <div>
              <textarea value={bulkPasteText} onChange={function(e) { setBulkPasteText(e.target.value); }} rows={8} style={Object.assign({}, fieldSt, { minHeight: 140, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 })} placeholder="Paste the full block of responses here…" />
              <button onClick={parseBulkPaste} disabled={!bulkPasteText.trim()} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: bulkPasteText.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: bulkPasteText.trim() ? 1 : 0.5 }}>Parse Responses</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={fieldLbl}>Event Name (applies to all)</label>
                  <input value={bulkEventName} onChange={function(e) { setBulkEventName(e.target.value); }} list="events-hub-event-options" style={fieldSt} placeholder="e.g. Spring Gala, or type a new name" />
                </div>
                <div>
                  <label style={fieldLbl}>Source (applies to all)</label>
                  <input value={bulkSource} onChange={function(e) { setBulkSource(e.target.value); }} list="events-hub-feedback-source-options" style={fieldSt} placeholder="e.g. Creative Exchange survey" />
                </div>
                <div>
                  <label style={fieldLbl}>Date (applies to all)</label>
                  <input type="date" value={bulkDate} onChange={function(e) { setBulkDate(e.target.value); }} style={fieldSt} />
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#886c44', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{bulkParsed.length} response{bulkParsed.length !== 1 ? 's' : ''} parsed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 320, overflowY: 'auto' }}>
                {bulkParsed.map(function(p, i) {
                  return (
                    <div key={i} style={{ background: '#faf8f4', border: '0.5px solid #e8e0d5', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <input value={p.name} onChange={function(e) { updateBulkParsedField(i, 'name', e.target.value); }} placeholder="Name" style={Object.assign({}, fieldSt, { flex: 1 })} />
                        <input value={p.role} onChange={function(e) { updateBulkParsedField(i, 'role', e.target.value); }} placeholder="Craft / role" style={Object.assign({}, fieldSt, { flex: 1 })} />
                        <button onClick={function() { removeBulkParsedItem(i); }} title="Remove" style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>
                      </div>
                      <textarea value={p.feedback} onChange={function(e) { updateBulkParsedField(i, 'feedback', e.target.value); }} rows={3} style={Object.assign({}, fieldSt, { resize: 'vertical', fontFamily: 'inherit', fontSize: 11 })} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveBulkFeedback} disabled={bulkSaving || !bulkParsed.length} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: (bulkSaving || !bulkParsed.length) ? 0.5 : 1 }}>{bulkSaving ? 'Adding…' : 'Add ' + bulkParsed.length + ' Review' + (bulkParsed.length !== 1 ? 's' : '')}</button>
                <button onClick={function() { setBulkParsed(null); }} disabled={bulkSaving} style={{ fontSize: 12, background: '#f0ece6', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#666', cursor: 'pointer' }}>Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'feedback' && showAddFeedback && (
        <form onSubmit={addFeedback} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={fieldLbl}>Event Name</label>
              <select required value={feedbackForm.event_name} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { event_name: e.target.value }); }); }} style={fieldSt}>
                <option value="">Select an event…</option>
                {eventNameOptions.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
              </select>
            </div>
            <div>
              <label style={fieldLbl}>Source</label>
              <input value={feedbackForm.source} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { source: e.target.value }); }); }} list="events-hub-feedback-source-options" style={fieldSt} placeholder="e.g. Google review, comment card…" />
            </div>
            <div>
              <label style={fieldLbl}>Name</label>
              <input value={feedbackForm.name} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { name: e.target.value }); }); }} style={fieldSt} placeholder="Who left this feedback (optional)" />
            </div>
            <div>
              <label style={fieldLbl}>Role</label>
              <input value={feedbackForm.role} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { role: e.target.value }); }); }} style={fieldSt} placeholder="e.g. Guest, Vendor, Volunteer…" />
            </div>
            <div>
              <label style={fieldLbl}>Date</label>
              <input type="date" value={feedbackForm.date} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { date: e.target.value }); }); }} style={fieldSt} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLbl}>Feedback</label>
            <textarea required value={feedbackForm.feedback} onChange={function(e) { setFeedbackForm(function(f) { return Object.assign({}, f, { feedback: e.target.value }); }); }} style={Object.assign({}, fieldSt, { minHeight: 70, resize: 'vertical', fontFamily: 'inherit' })} placeholder="What did they say…" />
          </div>
          <button type="submit" disabled={savingFeedback} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: savingFeedback ? 0.5 : 1 }}>{savingFeedback ? 'Saving…' : 'Add Feedback'}</button>
        </form>
      )}

      {tab === 'feedback' && (
        feedbackLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 13 }}>Loading…</div>
        ) : feedback.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#ccc', fontSize: 13 }}>No feedback recorded yet.</div>
        ) : (function() {
          // feedback is already sorted date.desc,id.desc, so grouping in
          // encounter order naturally puts the most-recently-reviewed event
          // first, with each event's own reviews in recency order too.
          var groups = [];
          var byEvent = {};
          feedback.forEach(function(f) {
            var key = (f.event_name || '').trim() || 'Unlinked';
            if (!byEvent[key]) { byEvent[key] = { event: key, items: [] }; groups.push(byEvent[key]); }
            byEvent[key].items.push(f);
          });
          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map(function(g) {
              var isGroupOpen = !!expandedEventGroups[g.event];
              return (
                <div key={g.event} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={function() { setExpandedEventGroups(function(prev) { var n = Object.assign({}, prev); n[g.event] = !n[g.event]; return n; }); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '14px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2a2a2a' }}>{g.event} <span style={{ color: '#aaa', fontWeight: 500 }}>({g.items.length})</span></span>
                    <span style={{ fontSize: 12, color: '#ccc', flexShrink: 0 }}>{isGroupOpen ? '▲' : '▼'}</span>
                  </button>
                  {isGroupOpen && (
                    <div style={{ borderTop: '0.5px solid #f0ece6' }}>
                    {g.items.map(function(f, fi) {
              if (editingFeedbackId === f.id && editFeedbackForm) {
                return (
                  <div key={f.id} style={{ padding: 14, borderBottom: fi < g.items.length - 1 ? '0.5px solid #f5f0e8' : 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <select value={editFeedbackForm.event_name} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { event_name: e.target.value }); }); }} style={{ padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
                        <option value="">Select an event…</option>
                        {eventNameOptions.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
                      </select>
                      <input value={editFeedbackForm.source} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { source: e.target.value }); }); }} list="events-hub-feedback-source-options" style={{ padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Source" />
                      <input value={editFeedbackForm.name} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { name: e.target.value }); }); }} style={{ padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Name" />
                      <input value={editFeedbackForm.role} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { role: e.target.value }); }); }} style={{ padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} placeholder="Role" />
                      <input type="date" value={editFeedbackForm.date} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { date: e.target.value }); }); }} style={{ padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <textarea value={editFeedbackForm.feedback} onChange={function(e) { setEditFeedbackForm(function(ff) { return Object.assign({}, ff, { feedback: e.target.value }); }); }} style={{ width: '100%', padding: '6px 8px', border: '0.5px solid #e0d8cc', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', minHeight: 60, resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveEditFeedback} disabled={savingFeedbackEdit} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingFeedbackEdit ? 0.6 : 1 }}>{savingFeedbackEdit ? 'Saving…' : 'Save'}</button>
                      <button onClick={function() { setEditingFeedbackId(null); setEditFeedbackForm(null); }} disabled={savingFeedbackEdit} style={{ background: '#f0ece6', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: '#666', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.id} style={{ padding: '12px 16px', borderBottom: fi < g.items.length - 1 ? '0.5px solid #f5f0e8' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{f.name || 'Anonymous'}{f.role ? ' - ' + f.role : ''}</span>
                        {f.source && <span style={{ fontSize: 11, color: '#aaa' }}>{f.source}</span>}
                        {f.date && <span style={{ fontSize: 11, color: '#ccc' }}>{new Date(f.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 6 }}>{f.feedback}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={function() { startEditFeedback(f); }} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px', display: 'flex', alignItems: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={function() { deleteFeedback(f.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 14, padding: '0 2px' }}>×</button>
                    </div>
                  </div>
                </div>
              );
                    })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()
      )}

      {tab === 'overview' && (
        selectedEventCard ? (function() {
          var c = selectedEventCard;
          var dateStr = c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set';
          var checklist = c.checklist || [];
          var doneCount = checklist.filter(function(i) { return i.done; }).length;
          return (
            <div>
              <button onClick={function() { setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: gold, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 16 }}>← All Events</button>

              <div style={{ background: '#fff', border: '0.5px solid #e8e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 20, display: 'flex', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, padding: '18px 20px' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#2a2a2a' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{dateStr}</div>
                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: gold, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>Event details ↗</a>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                    <StatCard label="Ticket Sales" value={fmt(c.ticketRevenue)} sub={c.ticketQty + ' sold' + (c.rsvpQty > 0 ? ', ' + c.rsvpQty + ' RSVP' : '')} />
                    <StatCard label="Other Earnings" value={fmt(c.earnings)} />
                    <StatCard label="Expenses" value={fmt(c.costs)} />
                    <StatCard label="Net" value={fmt(c.ticketNet + c.net)} />
                  </div>
                </div>
                <div style={{ width: 260, flexShrink: 0, background: '#faf8f4', borderLeft: '0.5px solid #e8e0d5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt="Event flyer" style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '100%', height: 200, borderRadius: 8, backgroundImage: 'linear-gradient(135deg,#f0ebe2,#e4d9c6)' }} />
                  )}
                  <input ref={flyerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={function(e) { var f = e.target.files[0]; if (f) uploadFlyer(c.name, f); e.target.value = ''; }} />
                  <button onClick={function() { flyerInputRef.current && flyerInputRef.current.click(); }} disabled={uploadingFlyerFor === c.name}
                    style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: gold, cursor: uploadingFlyerFor === c.name ? 'default' : 'pointer' }}>
                    {uploadingFlyerFor === c.name ? 'Uploading…' : (c.image_url ? 'Replace Flyer' : '+ Upload Flyer')}
                  </button>
                </div>
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>Marketing Checklist</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{doneCount}/{checklist.length} done</div>
                </div>
                {checklist.map(function(item, idx) {
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                      <input type="checkbox" checked={!!item.done} onChange={function() { toggleChecklistItem(c.name, idx); }} style={{ width: 15, height: 15, accentColor: gold, cursor: 'pointer' }} />
                      <span style={{ flex: 1, fontSize: 13, color: item.done ? '#aaa' : '#333', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                      <button onClick={function() { removeChecklistItem(c.name, idx); }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input value={newChecklistItem} onChange={function(e) { setNewChecklistItem(e.target.value); }} placeholder="Add a checklist item…" style={fieldSt}
                    onKeyDown={function(e) { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(c.name, newChecklistItem); } }} />
                  <button onClick={function() { addChecklistItem(c.name, newChecklistItem); }} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Add</button>
                </div>
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>Website Ticket Sales</div>
                  <a onClick={function() { navigate('website-payments'); }} style={{ fontSize: 11, color: gold, textDecoration: 'underline', cursor: 'pointer' }}>View orders ↗</a>
                </div>
                {(c.ticketQty === 0 && c.rsvpQty === 0) ? (
                  <div style={{ fontSize: 12, color: '#aaa' }}>No website ticket orders for this event yet.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#555' }}>
                    <span><b style={{ color: '#2a2a2a' }}>{c.ticketQty}</b> tickets sold</span>
                    {c.rsvpQty > 0 && <span><b style={{ color: '#2a2a2a' }}>{c.rsvpQty}</b> RSVPs</span>}
                    <span>Gross <b style={{ color: '#5a8a5a' }}>{fmt(c.ticketRevenue)}</b></span>
                    <span>Fees <b style={{ color: '#c07040' }}>{fmt(c.ticketFees)}</b></span>
                    <span>Net <b style={{ color: '#2a2a2a' }}>{fmt(c.ticketNet)}</b></span>
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', marginBottom: 10 }}>Other Earnings</div>
                {c.earningsRows.length === 0 ? <div style={{ fontSize: 12, color: '#aaa' }}>No earnings logged yet.</div> : c.earningsRows.map(function(e, i) {
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                      <span style={{ color: '#555' }}>{e.earning_source || 'Earning'}{e.notes ? ' — ' + e.notes : ''}</span>
                      <span style={{ color: '#5a8a5a', fontWeight: 600 }}>{fmt(e.amount)}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a', marginBottom: 10 }}>Expenses & Reimbursements</div>
                {c.expenseRows.length === 0 ? <div style={{ fontSize: 12, color: '#aaa' }}>No expenses logged yet.</div> : c.expenseRows.map(function(b, i) {
                  var who = b.purchased_by || b.volunteer_name;
                  var reimbLabel = b.needs_reimbursement ? (b.volunteer_auth_user_id ? (b.status || 'Submitted') : 'Pending') : null;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid #f5f1eb' }}>
                      <span style={{ color: '#555' }}>{b.description}{who ? ' — ' + who : ''}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {reimbLabel && <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{reimbLabel}</span>}
                        <span style={{ color: '#c07040', fontWeight: 600 }}>{fmt(b.amount)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })() : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={function() { setShowNewEvent(function(s) { return !s; }); }} style={{ fontSize: 12, background: showNewEvent ? '#f5f0ea' : gold, color: showNewEvent ? '#666' : '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>{showNewEvent ? 'Cancel' : '+ New Event'}</button>
            </div>
            {showNewEvent && (
              <form onSubmit={createNewEvent} style={{ background: '#fff', border: '0.5px solid #e0d8cc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={fieldLbl}>Event Name</label>
                    <input required value={newEventForm.name} onChange={function(e) { setNewEventForm(function(f) { return Object.assign({}, f, { name: e.target.value }); }); }} list="events-hub-event-options" style={fieldSt} placeholder="e.g. Fall Fundraiser" />
                  </div>
                  <div>
                    <label style={fieldLbl}>Date</label>
                    <input type="date" value={newEventForm.date} onChange={function(e) { setNewEventForm(function(f) { return Object.assign({}, f, { date: e.target.value }); }); }} style={fieldSt} />
                  </div>
                </div>
                <button type="submit" disabled={savingNewEvent} style={{ fontSize: 12, background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: savingNewEvent ? 0.5 : 1 }}>{savingNewEvent ? 'Creating…' : 'Create Event'}</button>
              </form>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Upcoming Events</div>
            {upcomingCards.length === 0 ? (
              <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '24px 0', marginBottom: 28 }}>No upcoming events yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                {upcomingCards.map(renderEventCard)}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Past Events</div>
            {pastCards.length === 0 ? (
              <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No past events yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {pastCards.map(renderEventCard)}
              </div>
            )}
          </div>
        )
      )}

      {tab === 'plans' && (
        plans === null ? (
          <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Loading…</div>
        ) : plans.length === 0 ? (
          <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No saved plans yet. Build one in Planning, then "Save to Event Overviews".</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(function(p) {
              var d = p.data || {};
              var metaBits = [d.dateLine, d.timeLine].filter(Boolean).join('  ·  ');
              return (
                <div key={p.id} style={{ background: '#fff', border: '0.5px solid #e8e0d5', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2a2a' }}>{p.name}</div>
                    {(d.title && d.title !== p.name) && <div style={{ fontSize: 12, color: '#886c44', marginTop: 2 }}>{d.title}</div>}
                    {metaBits && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{metaBits}</div>}
                  </div>
                  <button onClick={function() { handleViewPlan(p); }} disabled={openingPlanId === p.id} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: openingPlanId === p.id ? 'default' : 'pointer', opacity: openingPlanId === p.id ? 0.6 : 1, flexShrink: 0 }}>
                    {openingPlanId === p.id ? 'Opening…' : 'View'}
                  </button>
                  <button onClick={function() { handleEditPlan(p); }} title="Edit this plan in Planning" style={{ background: '#fff', color: gold, border: '1px solid ' + gold, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    Edit
                  </button>
                  <button onClick={function() { handleCopyPlanLink(p); }} title="Copy a shareable link straight to this plan" style={{ background: '#fff', color: '#886c44', border: '1px solid #e0d8cc', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    {copiedPlanId === p.id ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button onClick={function() { handleAttachPlan(p); }} disabled={attachingPlanId === p.id} title="Show a 'View Event Plan' button on the dashboard RSVP card for the current Appreciation event" style={{ background: '#fff', color: gold, border: '1px solid ' + gold, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: attachingPlanId === p.id ? 'default' : 'pointer', opacity: attachingPlanId === p.id ? 0.6 : 1, flexShrink: 0 }}>
                    {attachingPlanId === p.id ? 'Attaching…' : 'Attach to Dashboard'}
                  </button>
                  <button onClick={function() { handleDeletePlan(p); }} style={{ background: 'none', border: 'none', color: '#a04545', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>Delete</button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
