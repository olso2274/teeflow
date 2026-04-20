-- Fix course_accounts RLS policies that referenced auth.users directly.
--
-- The original policies used (SELECT email FROM auth.users WHERE id = auth.uid())
-- to match unclaimed rows by email. But the `authenticated` role does not
-- have SELECT on auth.users, so evaluating those policies raised
-- "permission denied for table users" — which Postgres bubbled up as a
-- query error, masking ALL course_accounts rows from authenticated users,
-- not just the unclaimed-by-email ones. The result: /api/course/me always
-- returned {account: null} and the course dashboard bounced back to
-- /course-signup in an infinite loop.
--
-- Switch to (auth.jwt() ->> 'email') which reads the email from the
-- already-verified JWT claims, needs no table access, and is the
-- recommended Supabase pattern.

DROP POLICY IF EXISTS "course_accounts_select_by_email" ON course_accounts;
CREATE POLICY "course_accounts_select_by_email"
  ON course_accounts FOR SELECT
  USING (
    user_id IS NULL
    AND email = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "course_accounts_claim_by_email" ON course_accounts;
CREATE POLICY "course_accounts_claim_by_email"
  ON course_accounts FOR UPDATE
  USING (
    user_id IS NULL
    AND email = (auth.jwt() ->> 'email')
  );
