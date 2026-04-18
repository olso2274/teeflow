-- Fix GolfNow facility IDs that were assigned to wrong courses in 20260417100000
-- Correct courses: Bluff Creek=4388, Monticello=7845, Majestic Oaks=7435, Greens at Howard Lake=1047947

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 4388)
WHERE name = 'Bluff Creek Golf Course';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 7845)
WHERE name = 'Monticello Country Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 7435)
WHERE name = 'Majestic Oaks Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 1047947)
WHERE name = 'The Greens at Howard Lake';

-- Clear wrongly assigned GolfNow IDs from non-GolfNow courses
UPDATE golf_courses
SET scraper_config = '{}'
WHERE name IN ('Southbrook Golf Club', 'The Wilds Golf Club', 'Glencoe Country Club');
-- Note: Albion Ridges gets updated below with ChronoGolf config

-- ── ForeUp courses discovered via booking URL research ────────────────────────
-- These courses use ForeUp as their teesheet; the public API (api_key=no_limits)
-- can fetch live tee times without authentication.

UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 21629, "schedule_id": 8394}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/21629/8394'
WHERE name = 'Rush Creek Golf Club';

UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 21800, "schedule_id": 8918}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/21800/8918'
WHERE name = 'Deer Run Golf Club';

UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 20252, "schedule_id": 4106}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/20252/4106'
WHERE name = 'Bunker Hills Golf Club';

-- Pebble Creek was listed as ChronoGolf but actually uses ForeUp
UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 19006, "schedule_id": 1680}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/19006/1680'
WHERE name = 'Pebble Creek Golf Club';

UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 20696, "schedule_id": 5512}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/20696/5512'
WHERE name = 'Timber Creek Golf Course';

-- Pheasant Acres: only course_id known from /booking/index/19484 URL;
-- schedule_id=0 triggers runtime discovery in the scraper
UPDATE golf_courses
SET scraper_type = 'foreup',
    scraper_config = '{"course_id": 19484, "schedule_id": 0}',
    booking_url = 'https://foreupsoftware.com/index.php/booking/index/19484'
WHERE name = 'Pheasant Acres Golf Club';

-- ── CPS Golf correction ────────────────────────────────────────────────────────
-- Stonebrooke booking URL was the course website; the actual CPS tee time URL
UPDATE golf_courses
SET scraper_type = 'cps_direct',
    booking_url = 'https://stonebrookemn.cps.golf/onlineresweb/m/search-teetime/default'
WHERE name = 'Stonebrooke Golf Club';

-- ── TeeSnap correction ────────────────────────────────────────────────────────
-- Crystal Lake was listed as ChronoGolf but uses TeeSnap
UPDATE golf_courses
SET scraper_type = 'teesnap',
    booking_url = 'https://crystallakegc.teesnap.net/'
WHERE name = 'Crystal Lake Golf Club';

-- ── ChronoGolf corrections ────────────────────────────────────────────────────
-- Brookview Golf was manual with course website URL
UPDATE golf_courses
SET scraper_type = 'chronogolf',
    booking_url = 'https://www.chronogolf.com/club/brookview-golf-course',
    scraper_config = '{}'
WHERE name = 'Brookview Golf Course';

-- Albion Ridges was manual with course website URL (and had wrong GolfNow ID)
UPDATE golf_courses
SET scraper_type = 'chronogolf',
    booking_url = 'https://www.chronogolf.com/club/albion-ridges-golf-club',
    scraper_config = '{}'
WHERE name = 'Albion Ridges Golf Club';
