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
const output = `// Generated from north-star-portal/src/app.jsx by scripts/sync-portal-event-overviews.mjs.
// Edit the Portal component and re-run the script to keep both views aligned.
import React from 'react';
import { SUPABASE_URL, SUPABASE_KEY, PORTAL_URL, openPortal, openPlanPreview } from '../lib/portalEvents.js';
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
