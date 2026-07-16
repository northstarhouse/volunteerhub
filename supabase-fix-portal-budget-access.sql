-- Fix: Portal lost read access to "Op Budget" / "Op Earnings"
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
--
-- supabase-op-budget-rls.sql and supabase-reimbursements.sql enabled RLS on
-- these tables with a SELECT policy scoped only to the "authenticated" role
-- (for the Volunteer Hub, which does real per-user Supabase Auth logins).
-- Portal has no per-user Supabase Auth session — it always calls the API as
-- the "anon" role — so it was left with zero read access, silently returning
-- empty results for Pending Reimbursements, budgets, and earnings everywhere
-- in Portal. This adds a matching "anon" policy so Portal can read again.

drop policy if exists "anon read budget" on "Op Budget";
create policy "anon read budget"
on "Op Budget"
for select
to anon
using (status is distinct from 'Draft');

drop policy if exists "anon read earnings" on "Op Earnings";
create policy "anon read earnings"
on "Op Earnings"
for select
to anon
using (true);
