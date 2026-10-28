import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portal = fs.readFileSync(path.resolve(root, '../north-star-portal/src/app.jsx'), 'utf8').replace(/\r\n/g, '\n');
const destination = path.join(root, 'src/pages/PortalEventOverviews.jsx');
function section(from, to) {
  const start = portal.indexOf(from);
  const end = portal.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`Portal source section missing: ${from}`);
  return portal.slice(start, end).trim();
}
let component = section('var DEFAULT_EVENT_CHECKLIST =', '\nfunction driveImg(');
// Adapt only the host app's authentication, navigation, and absent cache.
component = component.replace('function EventsView({ navigate }) {', 'export default function PortalEventOverviews({ navigate, request }) {\n  const fetch = request;');
component = component.replace(/^[ \t]*clearCache\('[^']+'\);\n/gm, '');
component = component.replace("window.location.hash = 'planning/edit/' + p.id;", "openPortal('planning/edit/' + p.id);");
component = component.replace("window.location.origin + window.location.pathname + '#event-plan/' + p.id", "PORTAL_URL + '#event-plan/' + p.id");
// Hub-only adapter: Event Overviews mirrors the Events Committee page (its hidden and cancelled events, and
// events that only exist there). The Portal's own version is unaffected.
function hubOnly(from, to) {
  if (component.split(from).length !== 2) throw new Error('Hub mirror anchor missing or not unique: ' + from.slice(0, 70));
  component = component.replace(from, () => to);
}
hubOnly("  var [ticketOrders, setTicketOrders] = useState(null);\n",
  "  var [ticketOrders, setTicketOrders] = useState(null);\n" +
  "  var [mirror, setMirror] = useState(null); // Events Committee page: committee-only, hidden and cancelled events\n" +
  "  useEffect(function() { Promise.all([fetchMergedEventCards(), fetchHiddenCommitteeEvents()]).then(function(r) { setMirror({ cards: r[0], hidden: r[1] }); }).catch(function() { setMirror({ cards: [], hidden: [] }); }); }, []);\n");
hubOnly("    return Object.keys(byKey).map(function(k) { return byKey[k]; });\n  }, [groups, overviewCards, ticketOrders]);",
  "    if (mirror) {\n" +
  "      // Same event list as the Events Committee page.\n" +
  "      mirror.cards.forEach(function(m) { var b = ensure(m.name); if (!b.date && m.date) b.date = m.date; b.status = m.status || null; });\n" +
  "      mirror.hidden.forEach(function(h) { delete byKey[keyOfName(h.name)]; });\n" +
  "    }\n" +
  "    return Object.keys(byKey).map(function(k) { return byKey[k]; });\n  }, [groups, overviewCards, ticketOrders, mirror]);");
hubOnly("style={{ background: '#fff', border: '0.5px solid #e8e0d5', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s, transform 0.15s' }}",
  "style={{ background: '#fff', border: '0.5px solid ' + (c.status === 'cancelled' ? '#a04545' : '#e8e0d5'), opacity: c.status === 'cancelled' ? 0.65 : 1, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s, transform 0.15s' }}");
hubOnly("aspectRatio: '4/3', backgroundColor: '#f0ebe2', ", "aspectRatio: '4/3', filter: c.status === 'cancelled' ? 'grayscale(0.6)' : 'none', backgroundColor: '#f0ebe2', ");
hubOnly("{dateStr || 'No date set'}</div>\n          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11 }}>", "{dateStr || 'No date set'}{c.status === 'cancelled' ? ' · Cancelled' : ''}</div>\n          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11 }}>");

const output = `// Generated from north-star-portal/src/app.jsx by scripts/sync-portal-event-overviews.mjs.
// Edit the Portal component and re-run the script to keep both views aligned.
import React from 'react';
import { SUPABASE_URL, SUPABASE_KEY, PORTAL_URL, openPortal, openPlanPreview } from '../lib/portalEvents.js';
import { fetchMergedEventCards, fetchHiddenCommitteeEvents } from '../lib/db.js';
const gold = '#886c44';

${section('function StatCard(', '\nfunction ProgressBar(')}

${component}
`;
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('Volunteer Hub Event Overviews has drifted from Portal. Run the sync script.');
  console.log('Event Overviews matches Portal source (with authentication/navigation adapters only).');
} else {
  fs.writeFileSync(destination, output);
  console.log('Synced Portal Event Overviews into Volunteer Hub.');
}
