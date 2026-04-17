-- Update GolfNow courses with facility IDs extracted from booking URLs
UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 1032251)
WHERE name = 'Dahlgreen Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 16977)
WHERE name = 'Shamrock Golf Course';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 3885)
WHERE name = 'Elk River Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 7522)
WHERE name = 'Wild Marsh Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 16956)
WHERE name = 'Brookland Golf Park';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 3891)
WHERE name = 'Heritage Links Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 7435)
WHERE name = 'Glencoe Country Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 6006)
WHERE name = 'Whispering Pines Golf Course';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 4388)
WHERE name = 'Southbrook Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 7845)
WHERE name = 'The Wilds Golf Club';

UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 1047947)
WHERE name = 'Albion Ridges Golf Club';
