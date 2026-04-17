-- Favorite courses per user
CREATE TABLE IF NOT EXISTS favorite_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES golf_courses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE favorite_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON favorite_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON favorite_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorite_courses FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_favorite_courses_user ON favorite_courses(user_id);
CREATE INDEX idx_favorite_courses_course ON favorite_courses(course_id);

-- Add booking tracking columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS tee_time_display text,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS booked_at timestamptz DEFAULT now();

-- Index for user booking history
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booked_at DESC);
