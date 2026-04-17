# Western Minnesota Golf Courses Integration Tests

## Overview
50 new public golf courses added to western Minneapolis metro area (Hennepin, Carver, Wright, Sherburne, Anoka, Scott Counties).

## Course Distribution
- **Total Courses**: 50 (all is_active=true)
- **Manual Scraper Type**: 33 courses (course websites, no API)
- **CPS Direct**: 6 courses (CPS Golf booking system)
- **GolfNow**: 11 courses (GolfNow platform)
- **ForeUp**: 0 courses (supports if added)

## Test Scenarios

### 1. Course Discovery (Tee Times Search)
**Endpoint**: `GET /api/scrape-tee-times?date=YYYY-MM-DD&startHour=6&endHour=18`

**Expected Behavior**:
- Returns all 50 courses in results
- ForeUp courses (if any): Show live scraped times from API
- Other courses: Show placeholder times with booking_url for redirect

**Validation**:
```bash
curl "http://localhost:3000/api/scrape-tee-times?date=2026-04-17&startHour=6&endHour=18" | jq '.count'
# Should show: ~50
```

### 2. Course Card Display (Tee Times Page)
**Component**: `app/tee-times/page.tsx`

**Expected Behavior**:
- Displays all courses from search results
- Shows course name, address, time, price
- CPS Direct courses labeled with "Direct" badge
- "Book Now" button for regular courses
- "View on Course Site" button for CPS Direct courses

**Validation**:
1. Navigate to tee times search page
2. Verify all courses appear in grid
3. Verify CPS courses show "Direct" label
4. Verify button labels differ for CPS vs others

### 3. Booking Flow (Book Now Click)
**Endpoints**:
1. `POST /api/book-tee-time` - Log booking
2. Redirect to external booking_url

**Request Body**:
```json
{
  "tee_time_id": "uuid",
  "course_id": "uuid",
  "course_name": "Course Name",
  "tee_time_display": "10:30 AM",
  "price_cents": 5000,
  "booking_url": "https://..."
}
```

**Expected Behavior**:
1. POST to `/api/book-tee-time` succeeds
2. Booking logged in database (if user authenticated)
3. Window opens with external booking_url in new tab
4. User can complete booking on course's system

**Validation**:
1. Login to app
2. Click "Book Now" on any course
3. Verify booking_url opens in new tab (correct platform)
4. Verify booking appears in user's booking history

### 4. Course Filtering
**Feature**: Filter by course, sort by time/price/distance

**Expected Behavior**:
- Course filter dropdown shows all 50 courses
- Can filter to individual courses
- Sorting works correctly across all courses

**Validation**:
1. Open tee times page
2. Click course filter dropdown
3. Verify all 50 courses listed
4. Select a few different courses, verify filtering works
5. Test sort buttons (Earliest, Price, Nearest)

### 5. Favorite Courses
**Feature**: Save favorite courses for quick access

**Expected Behavior**:
- Users can star any course
- Favorites persist in database
- Can filter to show only favorites

**Validation**:
1. Click star on a course to favorite
2. Refresh page, verify star state persists
3. Toggle favorites filter, verify works

### 6. Booking History
**Component**: `app/bookings` page (or similar)

**Expected Behavior**:
- Shows all user's bookings with course name, time, price
- Includes booking_url for reference

**Validation**:
1. Make a test booking
2. Navigate to booking history
3. Verify booking appears with all details

## Critical Data Points

### Sample Course (Manual)
```
Name: Rush Creek Golf Club
Address: 7801 County Road 101, Maple Grove, MN 55311
Lat/Lng: 45.0810, -93.5070
Holes: 18
Scraper Type: manual
Booking URL: https://www.rushcreek.com/tee-times
```

### Sample Course (CPS Direct)
```
Name: Edinburgh USA Golf Course
Address: 8700 Edinbrook Crossing, Brooklyn Park, MN 55443
Lat/Lng: 45.1169, -93.3858
Holes: 18
Scraper Type: cps_direct
Booking URL: https://edinburghusa.cps.golf/onlineresweb/m/search-teetime/default
```

### Sample Course (GolfNow)
```
Name: Dahlgreen Golf Club
Address: 6940 Dahlgren Road, Chaska, MN 55318
Lat/Lng: 44.7819, -93.6589
Holes: 18
Scraper Type: golfnow
Booking URL: https://www.golfnow.com/tee-times/facility/1032251-dahlgreen/search
```

## Edge Cases to Test

1. **Time Range Filtering**: Search only 6am-10am (morning tees)
2. **9-Hole Courses**: 8 courses are 9-hole; verify display correctly
3. **CPS Direct Visual**: Verify "Direct" badge and different button text
4. **Geographic Spread**: Verify all coordinates are in western metro area
5. **Missing Prices**: Manual courses may show "Call for price"
6. **Booking URL Redirect**: Verify each platform opens correct booking site

## Database Verification

### Quick SQL Check
```sql
-- Verify all 50 courses
SELECT COUNT(*) FROM golf_courses WHERE region = 'Minneapolis Metro';
-- Expected: 50

-- Verify course distribution
SELECT scraper_type, COUNT(*) FROM golf_courses 
WHERE region = 'Minneapolis Metro' 
GROUP BY scraper_type;
-- Expected: manual (33), cps_direct (6), golfnow (11)

-- Verify active status
SELECT COUNT(*) FROM golf_courses 
WHERE region = 'Minneapolis Metro' AND is_active = true;
-- Expected: 50
```

## Performance Considerations

- **Initial Load**: 50 courses × search = placeholder results for all non-ForeUp
- **ForeUp Scraping**: Parallelized via Promise.all()
- **Distance Calculation**: Non-blocking, optional feature
- **Favorites**: Indexed on user_id for fast queries

## Deployment Checklist

- [x] All 50 courses in migration file
- [x] Booking route fixed (single request.json() call)
- [x] Data types match across API boundary
- [x] Frontend handles cps_direct badge
- [x] Booking flow traces through to external redirect
- [x] Code reviewed for TypeScript/logic errors
- [ ] Database migration applied (user: done manually in Supabase)
- [ ] End-to-end testing in dev environment
- [ ] Testing with real booking flows
