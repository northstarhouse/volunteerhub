-- Reimbursements feature — Volunteer Hub <-> Portal
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.
--
-- Extends the existing "Op Budget" table (already used by Portal's Operational
-- Areas + Ideas + Financials views) with a status workflow + volunteer-identity
-- columns, so volunteer-submitted reimbursement requests live in the same table
-- Portal's FinancialsView already reads, instead of a parallel table.
--
-- Existing "Op Budget" columns (unchanged): id, area, type, description, amount,
-- date, needs_reimbursement, volunteer_name, receipt_url, created_at.

alter table "Op Budget" add column if not exists status text not null default 'Submitted';
alter table "Op Budget" add column if not exists volunteer_auth_user_id uuid references auth.users(id) on delete set null;
alter table "Op Budget" add column if not exists volunteer_id bigint;
alter table "Op Budget" add column if not exists event_name text;
alter table "Op Budget" add column if not exists notes text;
alter table "Op Budget" add column if not exists reviewer_notes text;
alter table "Op Budget" add column if not exists reviewed_at timestamptz;
alter table "Op Budget" add column if not exists reviewed_by text;
alter table "Op Budget" add column if not exists submitted_at timestamptz;

-- Backfill: rows that pre-date this migration were all logged directly in
-- Portal, so treat them as already-submitted (keeps them showing up in
-- Portal's existing "Pending Reimbursements" list exactly as before).
update "Op Budget" set status = 'Submitted' where status is null;

alter table "Op Budget" drop constraint if exists op_budget_status_check;
alter table "Op Budget" add constraint op_budget_status_check
  check (status in ('Draft','Submitted','Pending Review','More Information Needed','Approved','Paid','Denied'));

-- RLS: "Op Budget" already has RLS enabled (see supabase-op-budget-rls.sql),
-- with a blanket "authenticated read budget" select policy (using (true)).
-- Reimbursement rows now carry personal financial info + drafts-in-progress,
-- so narrow that policy: everyone still sees non-draft rows (matches prior
-- behavior for Operational Area / Ideas expense data), but a Draft is only
-- visible to the volunteer who owns it.
drop policy if exists "authenticated read budget" on "Op Budget";
create policy "authenticated read budget"
on "Op Budget"
for select
to authenticated
using (status is distinct from 'Draft' or volunteer_auth_user_id = auth.uid());

-- Volunteers can create their own reimbursement request rows.
drop policy if exists "volunteers insert own reimbursement" on "Op Budget";
create policy "volunteers insert own reimbursement"
on "Op Budget"
for insert
to authenticated
with check (volunteer_auth_user_id = auth.uid());

-- Volunteers can edit/withdraw their own rows only while still a Draft, or
-- resubmit after Portal asks for more information.
drop policy if exists "volunteers update own reimbursement" on "Op Budget";
create policy "volunteers update own reimbursement"
on "Op Budget"
for update
to authenticated
using (volunteer_auth_user_id = auth.uid() and status in ('Draft','More Information Needed'))
with check (volunteer_auth_user_id = auth.uid());

-- Volunteers can delete their own requests any time before payment goes out
-- (Draft, Submitted, Pending Review, More Information Needed, Approved,
-- Denied) — just not after the money has actually moved (Paid).
drop policy if exists "volunteers delete own draft reimbursement" on "Op Budget";
drop policy if exists "volunteers delete own reimbursement" on "Op Budget";
create policy "volunteers delete own reimbursement"
on "Op Budget"
for delete
to authenticated
using (volunteer_auth_user_id = auth.uid() and status is distinct from 'Paid');

-- Receipts are uploaded to the existing "receipts" storage bucket (same
-- bucket Portal already uses for Op Budget receipts). Allow authenticated
-- volunteers to upload there; Portal's own uploads already work via anon key.
drop policy if exists "volunteers upload receipts" on storage.objects;
create policy "volunteers upload receipts"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'receipts');
