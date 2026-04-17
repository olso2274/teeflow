-- Add 50 public golf courses in the western Minneapolis metro area
-- Includes name, address, lat/lng, website, and booking_url for each

INSERT INTO golf_courses (name, address, lat, lng, website, booking_url, region, scraper_type, holes, is_active)
VALUES
  (
    'Rush Creek Golf Club',
    '7801 County Road 101, Maple Grove, MN 55311',
    45.0810, -93.5070,
    'https://www.rushcreek.com',
    'https://www.rushcreek.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Edinburgh USA Golf Course',
    '8700 Edinbrook Crossing, Brooklyn Park, MN 55443',
    45.1169, -93.3858,
    'https://www.edinburghusa.com',
    'https://edinburghusa.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Fox Hollow Golf Club',
    '4780 Palmgren Ln NE, Saint Michael, MN 55376',
    45.2148, -93.6462,
    'https://www.foxhollowgolfmn.com',
    'https://www.foxhollowgolfmn.com/book-a-tee-time/',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Sundance Golf Club',
    '15240 113th Ave N, Maple Grove, MN 55369',
    45.1252, -93.4812,
    'https://www.sundanceentertainment.com/golf/',
    'https://www.chronogolf.com/club/sundance-golf-club-minnesota',
    'Minneapolis Metro', 'manual', 9, true
  ),
  (
    'Timber Creek Golf Course',
    '9750 County Rd 24, Watertown, MN 55388',
    44.9706, -93.8312,
    'https://www.timbercreekgolfmn.com',
    'https://www.timbercreekgolfmn.com/tee-times-west-metro',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Meadowbrook Golf Club',
    '201 Meadowbrook Rd, Hopkins, MN 55343',
    44.9222, -93.3975,
    'https://www.minneapolisparks.org/golf/courses/meadowbrook_golf_club/',
    'https://minneapolismeadowbrook.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Dahlgreen Golf Club',
    '6940 Dahlgren Road, Chaska, MN 55318',
    44.7819, -93.6589,
    'https://www.dahlgreen.com',
    'https://www.golfnow.com/tee-times/facility/1032251-dahlgreen/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Shamrock Golf Course',
    '19625 Larkin Rd, Corcoran, MN 55340',
    45.0922, -93.5714,
    'https://www.shamrockgolfcourse.com',
    'https://www.golfnow.com/tee-times/facility/16977-shamrock-golf-course/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Riverwood National Golf Course',
    '10444 95th St NE, Otsego, MN 55362',
    45.2628, -93.5850,
    'https://www.riverwoodnational.com',
    'https://www.chronogolf.com/club/riverwood-national-golf-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Elk River Golf Club',
    '20015 Elk Lake Rd NW, Elk River, MN 55330',
    45.3137, -93.6014,
    'https://www.elkrivercc.com',
    'https://www.golfnow.com/tee-times/facility/3885-elk-river-golf-club/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Wild Marsh Golf Club',
    '1710 Montrose Blvd, Buffalo, MN 55313',
    45.1803, -93.8571,
    'https://www.wildmarsh.com',
    'https://www.golfnow.com/tee-times/facility/7522-wild-marsh-golf-club/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Spring Hill Golf Club',
    '725 County Road 6, Wayzata, MN 55391',
    44.9925, -93.4972,
    'https://www.springhillgc.com',
    'https://www.springhillgc.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Orono Orchards Golf Course',
    '265 Orono Orchards Rd S, Wayzata, MN 55391',
    44.9706, -93.5500,
    'https://www.facebook.com/oronogolf/',
    'https://www.chronogolf.com/club/orono-public-golf-course',
    'Minneapolis Metro', 'manual', 9, true
  ),
  (
    'Island View Golf Club',
    '7795 Laketown Pkwy, Waconia, MN 55387',
    44.8450, -93.7742,
    'https://www.islandviewgolfclub.com',
    'https://www.islandviewgolfclub.com/public-play',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Pioneer Creek Golf Course',
    '705 Copeland Rd, Maple Plain, MN 55359',
    45.0098, -93.6530,
    'https://www.pioneercreek.com',
    'https://www.pioneercreek.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Stonebrooke Golf Club',
    '2693 County Road 79, Shakopee, MN 55379',
    44.7928, -93.5583,
    'https://www.stonebrooke.com',
    'https://www.stonebrooke.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Hollydale Golf Course',
    '4710 Holly Lane N, Plymouth, MN 55441',
    44.9958, -93.4408,
    'https://hollydalegolf.com',
    'https://www.chronogolf.com/club/hollydale-golf-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Daytona Golf Club',
    '14730 Lawndale Lane, Dayton, MN 55327',
    45.1728, -93.5261,
    'https://www.daytonagolfclub.com',
    'https://daytonagolfclub.teesnap.net',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Brookland Golf Park',
    '8232 Regent Ave N, Brooklyn Park, MN 55443',
    45.1058, -93.3700,
    'https://www.brooklandgolfpark.org',
    'https://www.golfnow.com/tee-times/facility/16956-brookland-golf-park-executive-9-holes/search',
    'Minneapolis Metro', 'golfnow', 9, true
  ),
  (
    'Brookview Golf Course',
    '316 Brookview Pkwy, Golden Valley, MN 55426',
    44.9919, -93.3719,
    'https://www.brookviewgolf.com',
    'https://www.brookviewgolf.com/book-a-tee-time',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Baker National Golf Course',
    '2935 Parkview Dr, Medina, MN 55340',
    45.0328, -93.5786,
    'https://www.threeriversparks.org/location/baker-national-golf',
    'https://www.chronogolf.com/club/baker-national-golf-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Bunker Hills Golf Club',
    '12800 Bunker Prairie Rd NW, Coon Rapids, MN 55448',
    45.1381, -93.3383,
    'https://bunkerhillsgolf.com',
    'https://bunkerhillsgolf.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Heritage Links Golf Club',
    '8075 Lucerne Blvd, Lakeville, MN 55044',
    44.6775, -93.2219,
    'https://www.heritagelinks.com',
    'https://www.golfnow.com/tee-times/facility/3891-heritage-links-golf-club/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Crow River Golf Club',
    '915 Colorado St NW, Hutchinson, MN 55350',
    44.8942, -94.3716,
    'https://www.crowrivergolf.com',
    'https://www.chronogolf.com/club/crow-river-country-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Deer Run Golf Club',
    '8661 Deer Run Dr, Victoria, MN 55386',
    44.8681, -93.6544,
    'https://www.deerrungolf.com',
    'https://www.deerrungolf.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Bluff Creek Golf Course',
    '1025 Creekwood St, Chaska, MN 55318',
    44.7889, -93.6200,
    'https://bluffcreek.com',
    'https://www.golfnow.com/tee-times/facility/4388-bluff-creek-golf-course/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Greenhaven Golf Center',
    '2800 Greenhaven Rd, Anoka, MN 55303',
    45.2033, -93.3897,
    'https://www.greenhavengolfcourse.com',
    'https://www.greenhavengolfcourse.com/teetimes.php',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'The Links at Northfork',
    '9333 Alpine Dr NW, Ramsey, MN 55303',
    45.2658, -93.4558,
    'https://www.golfthelinks.com',
    'https://www.golfthelinks.com/book-online',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Chomonix Golf Course',
    '700 Aqua Ln, Lino Lakes, MN 55014',
    45.1611, -93.1047,
    'https://www.chomonix.com',
    'https://www.chomonix.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Halla Greens Golf',
    '495 Pioneer Trail, Chanhassen, MN 55317',
    44.8664, -93.5419,
    'https://www.hallagreens.com',
    'https://www.hallagreens.com/new-page',
    'Minneapolis Metro', 'manual', 9, true
  ),
  (
    'Columbia Golf Club',
    '3300 Central Ave NE, Minneapolis, MN 55418',
    45.0167, -93.2489,
    'https://www.minneapolisparks.org/golf/courses/columbia_golf_club/',
    'https://minneapoliscolumbia.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Monticello Country Club',
    '1209 Golf Course Rd, Monticello, MN 55362',
    45.3128, -93.7861,
    'https://montigolf.com',
    'https://www.golfnow.com/tee-times/facility/7845-monticello-country-club/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'New Prague Golf Club',
    '400 Lexington Ave S, New Prague, MN 56071',
    44.5389, -93.5694,
    'https://www.newpraguegolf.com',
    'https://www.newpraguegolf.com/tee-times',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Crystal Lake Golf Club',
    '16725 Innisbrook Dr, Lakeville, MN 55044',
    44.6736, -93.2181,
    'https://crystallakegolfcourse.com',
    'https://www.chronogolf.com/club/crystal-lake-golf-club-minnesota',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Dwan Golf Course',
    '3301 W 110th St, Bloomington, MN 55431',
    44.8339, -93.3672,
    'https://www.dwangolfcourse.com',
    'https://www.chronogolf.com/club/dwan-golf-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Hiawatha Golf Course',
    '4553 Longfellow Ave S, Minneapolis, MN 55407',
    44.9183, -93.2378,
    'https://www.minneapolisparks.org/golf/courses/hiawatha_golf_club/',
    'https://minneapolishiawatha.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Hidden Haven Golf Club',
    '20520 Polk St NE, East Bethel, MN 55011',
    45.3694, -93.2056,
    'https://www.hiddenhavengolfclub.com',
    'https://hiddenhaven.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Pebble Creek Golf Club',
    '14000 Clubhouse Lane, Becker, MN 55308',
    45.3917, -93.8722,
    'https://www.pebblecreekgolf.com',
    'https://www.chronogolf.com/club/pebble-creek-golf-club-minnesota',
    'Minneapolis Metro', 'manual', 27, true
  ),
  (
    'Pheasant Acres Golf Club',
    '10705 County Road 116, Rogers, MN 55374',
    45.1822, -93.5578,
    'https://www.pheasantacresgolf.com',
    'https://www.pheasantacresgolf.com/teetimes/',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Majestic Oaks Golf Club',
    '701 Bunker Lake Blvd, Ham Lake, MN 55304',
    45.2611, -93.1828,
    'https://www.majesticoaksgolfclub.com',
    'https://www.golfnow.com/tee-times/facility/7435-majestic-oaks-signature/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Hyland Greens Golf Course',
    '10100 Normandale Blvd, Bloomington, MN 55437',
    44.8458, -93.4178,
    'https://www.threeriversparks.org/HylandGreensGolf',
    'https://www.chronogolf.com/club/hyland-greens-golf-learning-center',
    'Minneapolis Metro', 'manual', 9, true
  ),
  (
    'Theodore Wirth Golf Course',
    '1301 Theodore Wirth Pkwy, Golden Valley, MN 55422',
    44.9919, -93.3356,
    'https://www.minneapolisparks.org/golf/courses/theodore_wirth_golf_club/',
    'https://minneapolistheodorewirth.cps.golf/onlineresweb/m/search-teetime/default',
    'Minneapolis Metro', 'cps_direct', 18, true
  ),
  (
    'Glen Lake Golf & Practice Center',
    '14350 County Road 62, Minnetonka, MN 55345',
    44.8886, -93.5200,
    'https://www.threeriversparks.org/location/glen-lake-golf',
    'https://www.chronogolf.com/club/glen-lake-golf-course',
    'Minneapolis Metro', 'manual', 9, true
  ),
  (
    'Glencoe Country Club',
    '1325 1st St E, Glencoe, MN 55336',
    44.7797, -94.1536,
    'https://glencoecountryclub.com',
    'https://www.chronogolf.com/club/glencoe-country-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'Whispering Pines Golf Course',
    '8713 70th St NW, Annandale, MN 55302',
    45.2433, -94.1325,
    'https://www.whisperingpinesgolf.com',
    'https://www.golfnow.com/tee-times/facility/6006-whispering-pines-golf-club-mn/search',
    'Minneapolis Metro', 'golfnow', 18, true
  ),
  (
    'Albion Ridges Golf Club',
    '7771 20th St NW, Annandale, MN 55302',
    45.2583, -94.1200,
    'https://www.albionridgesgc.com',
    'https://www.albionridgesgc.com/tee-times',
    'Minneapolis Metro', 'manual', 27, true
  ),
  (
    'Southbrook Golf Club',
    '511 Morrison Ave S, Annandale, MN 55302',
    45.2667, -94.1181,
    'https://www.southbrookgolf.com',
    'https://www.southbrookgolf.com',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'The Wilds Golf Club',
    '3151 Wilds Ridge, Prior Lake, MN 55372',
    44.7128, -93.4194,
    'https://www.golfthewilds.com',
    'https://www.chronogolf.com/club/the-wilds-golf-club',
    'Minneapolis Metro', 'manual', 18, true
  ),
  (
    'The Greens at Howard Lake',
    '5055 County Rd 7 SW, Howard Lake, MN 55349',
    45.0603, -94.0744,
    'https://www.golfnow.com/courses/1047947-the-greens-at-howard-lake-details',
    'https://www.golfnow.com/tee-times/facility/1047947-the-greens-at-howard-lake/search',
    'Minneapolis Metro', 'golfnow', 9, true
  ),
  (
    'Birnamwood Golf Course',
    '12424 Parkwood Drive, Burnsville, MN 55337',
    44.7489, -93.3183,
    'https://burnsvillemn.gov/215/Birnamwood-Golf-Course',
    'https://registration.burnsvillemn.gov/wbwsc/webtrac.wsc/search.html?display=detail&module=GR',
    'Minneapolis Metro', 'manual', 9, true
  )
ON CONFLICT DO NOTHING;
