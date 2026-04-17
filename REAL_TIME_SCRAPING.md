# Real-Time Tee Time Scraping Architecture

## Overview

The system now supports **real-time tee time scraping** from multiple golf booking platforms. Instead of showing placeholder tee times, we actively fetch live availability from each course's booking system.

## Platform Support (50 Western MN Courses)

### 1. **GolfNow** (11 courses)
- **API Method**: Public GolfNow API endpoint
- **Configuration**: Facility ID stored in `scraper_config.facility_id`
- **Real-Time**: ✅ Yes - Live tee times fetched from API
- **Pricing**: ✅ Included when available
- **Courses**: Dahlgreen, Shamrock, Elk River, Wild Marsh, Brookland, Heritage Links, Glencoe, Whispering Pines, Southbrook, The Wilds, Albion Ridges

**Facility IDs**:
```
Dahlgreen Golf Club: 1032251
Shamrock Golf Course: 16977
Elk River Golf Club: 3885
Wild Marsh Golf Club: 7522
Brookland Golf Park: 16956
Heritage Links Golf Club: 3891
Glencoe Country Club: 7435
Whispering Pines Golf Course: 6006
Southbrook Golf Club: 4388
The Wilds Golf Club: 7845
Albion Ridges Golf Club: 1047947
```

### 2. **CPS Golf** (6 courses)
- **API Method**: Web scraping of CPS Golf booking interface
- **Configuration**: Course domain extracted from booking URL
- **Real-Time**: ✅ Yes - Scrapes available tee times from web interface
- **Pricing**: ⚠️ Limited (CPS doesn't expose pricing in public API)
- **Courses**: Edinburgh USA, Meadowbrook, Columbia, Hiawatha, Hidden Haven, Theodore Wirth

**Domains**:
```
Edinburgh USA: edinburghusa.cps.golf
Meadowbrook: minneapolismeadowbrook.cps.golf
Columbia: minneapoliscolumbia.cps.golf
Hiawatha: minneapolishiawatha.cps.golf
Hidden Haven: hiddenhaven.cps.golf
Theodore Wirth: minneapolistheodorewirth.cps.golf
```

### 3. **ChronoGolf** (6 courses)
- **API Method**: ChronoGolf public API (if available) or web scraping
- **Configuration**: Club slug extracted from booking URL
- **Real-Time**: ✅ Yes - Fetches tee times from ChronoGolf
- **Pricing**: ✅ Available from API
- **Courses**: Sundance, Riverwood, Orono, Hollydale, Baker National, Crow River

**Club Slugs**:
```
Sundance Golf Club: sundance-golf-club-minnesota
Riverwood National: riverwood-national-golf-club
Orono Orchards: orono-public-golf-course
Hollydale: hollydale-golf-club
Baker National: baker-national-golf-club
Crow River: crow-river-country-club
```

### 4. **TeeSnap** (1 course)
- **API Method**: Web scraping of TeeSnap booking interface
- **Configuration**: Full TeeSnap URL
- **Real-Time**: ✅ Yes - Scrapes available tee times
- **Pricing**: ⚠️ Limited
- **Courses**: Daytona Golf Club

### 5. **Manual Entry** (26 courses)
- **API Method**: None (requires manual entry or custom integration)
- **Real-Time**: ❌ No - Shows placeholder with course phone
- **Display**: "Call Course" button linking to course website/phone
- **Examples**: Rush Creek, Fox Hollow, Spring Hill, Island View, Pioneer Creek, etc.

## Scraper Implementation Details

### GolfNow Scraper
```typescript
async function scrapeGolfNow(facilityId: number, dateStr: string) {
  // Endpoint: https://www.golfnow.com/api/v2/public/facility/{id}/rates
  // Returns: Array of rates with tee_times containing availability and pricing
}
```

### CPS Golf Scraper
```typescript
async function scrapeCPS(cpsDomain: string, dateStr: string) {
  // Endpoint: https://{domain}/onlineresweb/m/search-teetime/default
  // Method: HTML parsing for time slots
  // Returns: Available tee times (pricing extracted if visible)
}
```

### ChronoGolf Scraper
```typescript
async function scrapeChronoGolf(clubSlug: string, dateStr: string) {
  // Endpoint: https://api.chronogolf.com/tee-times?club={slug}&date={date}
  // Returns: Array of tee times with availability and pricing
}
```

### TeeSnap Scraper
```typescript
async function scrapeTeeSnap(teesnapUrl: string, dateStr: string) {
  // Endpoint: Direct booking URL with date parameter
  // Method: HTML parsing for available time slots
  // Returns: Available tee times
}
```

## Data Flow

```
User searches tee times
    ↓
GET /api/scrape-tee-times?date=2026-04-17&startHour=6&endHour=18
    ↓
Route handler filters courses by scraper_type:
  ├─ ForeUp → scrapeForeUp()
  ├─ GolfNow → scrapeGolfNow()
  ├─ CPS → scrapeCPS()
  ├─ ChronoGolf → scrapeChronoGolf()
  ├─ TeeSnap → scrapeTeeSnap()
  └─ Manual → Placeholder + "Call Course"
    ↓
[Parallel execution of all scrapers]
    ↓
Results aggregated and sorted:
  1. Real tee times (by time)
  2. Manual courses (placeholder)
    ↓
Frontend displays results with:
  ├─ Actual times + prices (GolfNow, ChronoGolf, TeeSnap)
  ├─ Available times (CPS, ForeUp)
  └─ "Call Course" for manual entries
    ↓
User clicks "Book Now" → External booking redirect
```

## Database Schema

### golf_courses table updates
```sql
scraper_type: 'foreup' | 'golfnow' | 'cps_direct' | 'chronogolf' | 'teesnap' | 'manual'
scraper_config: {
  "course_id": 123,           -- ForeUp
  "schedule_id": 456,         -- ForeUp
  "facility_id": 1032251      -- GolfNow
}
```

### Migrations
- `20260417100000_update_scraper_configs.sql` - Adds facility IDs for GolfNow
- `20260417200000_reclassify_scraper_types.sql` - Reclassifies courses by actual platform

## Performance

- **Parallel Execution**: All scrapers run in parallel via `Promise.all()`
- **Cache Duration**: 5 minutes (300s) for each scraper
- **Timeout**: Individual fetch calls timeout after 10s
- **Error Handling**: Graceful fallback to empty results if scraper fails

## Testing Checklist

### GolfNow Courses
- [ ] Dahlgreen Golf Club - verify facility ID 1032251
- [ ] Shamrock Golf Course - check pricing included
- [ ] Elk River Golf Club - test 18-hole course
- [ ] Brookland Golf Park - test 9-hole course

### CPS Golf Courses
- [ ] Edinburgh USA Golf Course - verify CPS parsing
- [ ] Meadowbrook Golf Club - test Minneapolis Parks course
- [ ] Check all 6 CPS courses populate tee times

### ChronoGolf Courses
- [ ] Sundance Golf Club - verify club slug extraction
- [ ] Riverwood National - test API response parsing
- [ ] Check pricing when available

### TeeSnap Courses
- [ ] Daytona Golf Club - verify HTML parsing

### Manual Courses
- [ ] Rush Creek Golf Club - shows "Call Course" button
- [ ] Fox Hollow Golf Club - links to course website
- [ ] Verify placeholder tee times work

### Integration Tests
- [ ] Search by date returns all courses
- [ ] Filter by time range works (e.g., morning 6-10am)
- [ ] Sorting by time/price/distance functions correctly
- [ ] "Book Now" redirects to correct external URL
- [ ] Booking flow logs course context to database

## Known Limitations

1. **Manual Courses** (26): No automated tee time fetching - requires user to call course or visit website
2. **CPS Pricing**: CPS Golf may not expose pricing in public interface
3. **ChronoGolf API**: Assumes API endpoint availability - may fall back to web scraping
4. **Rate Limiting**: GolfNow and other APIs may have rate limits - implement backoff if needed
5. **TeeSnap**: HTML parsing may break if layout changes

## Future Improvements

1. **Automatic Facility ID Discovery**: Auto-find facility IDs from GolfNow search
2. **HTML Pattern Learning**: Use machine learning to adapt scrapers to layout changes
3. **Fallback Chains**: If API fails, try web scraping; if that fails, show booking link
4. **User-Contributed Data**: Allow users to submit tee time data for manual courses
5. **OAuth Integration**: Direct booking through Teeoff or similar APIs

## Migration Execution

To apply migrations in Supabase:

```sql
-- Run migration 20260417100000
UPDATE golf_courses
SET scraper_config = jsonb_build_object('facility_id', 1032251)
WHERE name = 'Dahlgreen Golf Club';
-- ... (see migration file for all updates)

-- Run migration 20260417200000
UPDATE golf_courses
SET scraper_type = 'chronogolf'
WHERE booking_url LIKE '%chronogolf.com%';

UPDATE golf_courses
SET scraper_type = 'teesnap'
WHERE booking_url LIKE '%teesnap.net%';
```

## Debugging

### Check scraper logs:
```bash
# Monitor API requests
curl "http://localhost:3000/api/scrape-tee-times?date=2026-04-17&startHour=6&endHour=18"

# Check individual scraper output
Check browser Network tab for API response
```

### Common Issues
- **Empty results**: Check if date is valid and in future
- **Missing facility IDs**: Verify `scraper_config` in database
- **Pricing is null**: Platform may not expose pricing publicly
- **Slow response**: Check if all scrapers are completing within timeout

