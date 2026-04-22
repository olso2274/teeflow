-- Tee time online bookings
-- Golfers reserve spots directly through RubeGolf; courses see bookings in their dashboard.

CREATE TABLE tee_time_bookings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tee_time_id       uuid        NOT NULL REFERENCES course_tee_times(id),
  course_account_id uuid        NOT NULL REFERENCES course_accounts(id),
  user_id           uuid        NOT NULL,
  golfer_name       text        NOT NULL,
  golfer_email      text        NOT NULL,
  golfer_phone      text        NOT NULL,
  num_golfers       integer     NOT NULL DEFAULT 1,
  agreed            boolean     NOT NULL DEFAULT true,
  status            text        NOT NULL DEFAULT 'confirmed',
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT num_golfers_range CHECK (num_golfers BETWEEN 1 AND 4),
  CONSTRAINT booking_status    CHECK (status IN ('confirmed', 'cancelled'))
);

ALTER TABLE tee_time_bookings ENABLE ROW LEVEL SECURITY;

-- Golfers can read and manage their own bookings
CREATE POLICY "bookings_select_own" ON tee_time_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookings_insert_own" ON tee_time_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookings_update_own" ON tee_time_bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast per-user and per-tee-time lookups
CREATE INDEX idx_bookings_user_id     ON tee_time_bookings(user_id);
CREATE INDEX idx_bookings_tee_time_id ON tee_time_bookings(tee_time_id);
CREATE INDEX idx_bookings_course      ON tee_time_bookings(course_account_id);
