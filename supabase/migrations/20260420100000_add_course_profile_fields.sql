-- Expand course_accounts with public-facing profile fields.
-- These are populated at signup and editable from the course dashboard.

ALTER TABLE course_accounts
  ADD COLUMN IF NOT EXISTS website_url   text,
  ADD COLUMN IF NOT EXISTS description   text,         -- max 500 chars enforced at app layer
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS holes         integer,      -- 9 | 18 | 27 | 36
  ADD COLUMN IF NOT EXISTS par           integer,
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS staff_emails  text[] NOT NULL DEFAULT '{}';  -- extra admin emails

-- Allow public (unauthenticated) reads of course profiles so golfers can
-- view /course/[id] without signing in.
CREATE POLICY "course_accounts_select_public"
  ON course_accounts FOR SELECT
  USING (status = 'active');

-- Note: the service-role client is already used for all authenticated writes
-- from the route layer (see app/api/course/*), so no UPDATE policy is needed
-- for the profile routes. The existing own/claim policies handle direct
-- client-side mutations if ever needed.
