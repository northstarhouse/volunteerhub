// One-time rollout script: creates a Supabase Auth account for every active
// volunteer who has an email on file, using the shared temporary password
// below. On first login the app forces them to set their own password
// (App.jsx checks user_metadata.must_change_password) and keeps them signed
// in once they do.
//
// Requires the SERVICE ROLE key (never the anon key) — has full admin
// rights, so this only runs locally, never ships in the app bundle.
//
// Usage (PowerShell):
//   $env:SUPABASE_URL = "https://uvzwhhwzelaelfhfkvdb.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key from Supabase dashboard>"
//   node scripts/bulk-create-volunteer-accounts.mjs
//
// Safe to re-run: volunteers who already have an auth account are skipped.

import { createClient } from '@supabase/supabase-js';

const TEMP_PASSWORD = '1905';
const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchActiveVolunteers() {
  const r = await fetch(
    `${URL}/rest/v1/${encodeURIComponent('2026 Volunteers')}?Status=eq.Active&select=id,Email,"First Name","Last Name"`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!r.ok) throw new Error(`Failed to fetch volunteers: ${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  const volunteers = await fetchActiveVolunteers();
  const withEmail = volunteers.filter(v => v.Email && v.Email.trim());

  console.log(`Found ${volunteers.length} active volunteers, ${withEmail.length} with an email on file.\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const v of withEmail) {
    const email = v.Email.trim();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (error) {
      if (/already.*registered|already been registered/i.test(error.message)) {
        skipped++;
      } else {
        failed++;
        console.error(`FAILED  ${email}: ${error.message}`);
      }
      continue;
    }

    // Pre-link so first login doesn't need the by-email fallback lookup.
    const { error: linkError } = await supabase
      .from('volunteer_auth_links')
      .upsert({ auth_user_id: data.user.id, volunteer_id: v.id });
    if (linkError) console.error(`  (link warning for ${email}: ${linkError.message})`);

    created++;
    console.log(`created ${email} (${v['First Name']} ${v['Last Name']})`);
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already had an account), failed ${failed}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
