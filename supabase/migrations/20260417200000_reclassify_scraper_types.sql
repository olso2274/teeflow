-- Reclassify courses by actual booking platform

-- ChronoGolf courses
UPDATE golf_courses
SET scraper_type = 'chronogolf'
WHERE booking_url LIKE '%chronogolf.com%';

-- TeeSnap courses
UPDATE golf_courses
SET scraper_type = 'teesnap'
WHERE booking_url LIKE '%teesnap.net%';

-- Verify the changes - all courses should now be classified
-- ForeUp (if any in western MN), GolfNow, CPS Direct, ChronoGolf, TeeSnap, or manual
