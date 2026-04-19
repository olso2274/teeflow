-- Golf course staff accounts
CREATE TABLE IF NOT EXISTS course_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id uuid REFERENCES golf_courses(id) ON DELETE SET NULL,
  course_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending', -- pending | active
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_accounts_user_id ON course_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_course_accounts_email ON course_accounts(email);

-- Tee times submitted directly by course staff
CREATE TABLE IF NOT EXISTS course_tee_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_account_id uuid NOT NULL REFERENCES course_accounts(id) ON DELETE CASCADE,
  course_id uuid REFERENCES golf_courses(id) ON DELETE SET NULL,
  course_name text NOT NULL,
  course_address text,
  date date NOT NULL,
  tee_time time NOT NULL,
  spots_available integer NOT NULL DEFAULT 4,
  price_cents integer,
  special_note text,
  is_last_minute boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_tee_times_date ON course_tee_times(date);
CREATE INDEX IF NOT EXISTS idx_course_tee_times_last_minute
  ON course_tee_times(date, is_last_minute) WHERE is_active = true;

-- RLS
ALTER TABLE course_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tee_times ENABLE ROW LEVEL SECURITY;

-- Anyone may register (user_id is NULL until magic link is clicked)
CREATE POLICY "course_accounts_insert_public"
  ON course_accounts FOR INSERT WITH CHECK (true);

-- Authenticated users see their own account
CREATE POLICY "course_accounts_select_own"
  ON course_accounts FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated user to see their unclaimed record (so they can claim it)
CREATE POLICY "course_accounts_select_by_email"
  ON course_accounts FOR SELECT
  USING (
    user_id IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow newly-authenticated user to claim the record created with their email
CREATE POLICY "course_accounts_claim_by_email"
  ON course_accounts FOR UPDATE
  USING (
    user_id IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Linked user may update their own record
CREATE POLICY "course_accounts_update_own"
  ON course_accounts FOR UPDATE USING (auth.uid() = user_id);

-- Public can read active course-submitted tee times
CREATE POLICY "course_tee_times_read_public"
  ON course_tee_times FOR SELECT USING (is_active = true);

-- Course staff can manage their own posted times
CREATE POLICY "course_tee_times_manage_own"
  ON course_tee_times FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_accounts
      WHERE id = course_account_id AND user_id = auth.uid()
    )
  );
