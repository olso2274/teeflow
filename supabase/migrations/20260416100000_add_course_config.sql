-- Add columns to golf_courses for scalability to 100+ courses
-- Each course carries its own scraper configuration

ALTER TABLE golf_courses
  ADD COLUMN IF NOT EXISTS region text DEFAULT 'Minneapolis Metro',
  ADD COLUMN IF NOT EXISTS scraper_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS scraper_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS holes integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS par integer,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Index for region filtering and active status
CREATE INDEX IF NOT EXISTS idx_golf_courses_region ON golf_courses(region);
CREATE INDEX IF NOT EXISTS idx_golf_courses_active ON golf_courses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_golf_courses_scraper ON golf_courses(scraper_type);

-- Update existing courses with scraper config
-- Braemar Golf Course (ForeUp)
UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 18127, "schedule_id": 2431}',
    region = 'Minneapolis Metro'
WHERE booking_url LIKE '%foreupsoftware%';

-- CPS Golf courses
UPDATE golf_courses
SET scraper_type = 'cps_direct',
    region = 'Minneapolis Metro'
WHERE booking_url NOT LIKE '%foreupsoftware%'
  AND scraper_type = 'manual';

COMMENT ON COLUMN golf_courses.scraper_type IS 'Scraper strategy: foreup, golfnow, teesheet, cps_direct, manual';
COMMENT ON COLUMN golf_courses.scraper_config IS 'JSON config for scraper (course_id, schedule_id, etc.)';
COMMENT ON COLUMN golf_courses.region IS 'Geographic region for filtering (e.g. Minneapolis Metro, St. Paul, Greater MN)';
