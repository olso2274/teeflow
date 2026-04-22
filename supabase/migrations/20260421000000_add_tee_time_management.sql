-- Enhance course_tee_times for real booking management
--
-- spots_booked: how many spots the course has confirmed are taken
-- status: lifecycle state — open | filling | full | cancelled
-- updated_at: last-modified timestamp (auto-updated via trigger)

ALTER TABLE course_tee_times
  ADD COLUMN IF NOT EXISTS spots_booked  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status        text        NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

ALTER TABLE course_tee_times
  ADD CONSTRAINT status_values CHECK (status IN ('open','filling','full','cancelled'));

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tee_times_updated_at ON course_tee_times;
CREATE TRIGGER tee_times_updated_at
  BEFORE UPDATE ON course_tee_times
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
