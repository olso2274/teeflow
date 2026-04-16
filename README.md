# ⛳ TeeFlow

Real-time golf tee-time booking app with live course scraping, distance calculation, and instant booking.

## 🎯 Features

- **Live Scraping**: Playwright-powered browser automation to scrape real tee times from golf courses
- **3 Local Courses**: Chaska Town Course, Pioneer Creek Country Club, Braemar Golf Club
- **Smart Sorting**: Results sorted by time match, distance, and price
- **Distance Calculation**: Google Maps Distance Matrix API integration
- **Real-time Database**: Supabase with RLS and live subscriptions
- **Mobile First**: Responsive design with Framer Motion animations
- **One-Click Booking**: Save tee times with instant confirmation

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Edit .env.local with your Supabase and Google Maps keys
# See SETUP.md for detailed instructions

# 3. Link to Supabase
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

## 📖 Full Setup Guide

See [SETUP.md](./SETUP.md) for complete setup instructions including:
- Creating a Supabase project
- Getting a Google Maps API key
- Deploying to Vercel
- Testing the live scraper

## 🏗️ Architecture

### Frontend
- **Next.js 15** with TypeScript
- **shadcn/ui** components
- **Framer Motion** for animations
- **Tailwind CSS** with golf theme

### Backend
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Playwright** for web scraping
- **Google Maps API** for distance calculations

### Database Schema
- `golf_courses` - Course info with booking URLs
- `tee_times` - Available times with pricing and player count
- `bookings` - User reservations with RLS

## 📱 How It Works

1. **Search**: Select date and time range
2. **Scrape**: Real-time web scraping of course websites
3. **Locate**: Get user's geolocation
4. **Distance**: Calculate driving time via Google Maps
5. **Display**: Show results sorted by relevance
6. **Book**: One-click booking to Supabase

## 🔗 Live Data Sources

- Chaska CPS: `https://chaska.cps.golf/onlineresweb/m/search-teetime/default`
- Pioneer Creek CPS: `https://www.pioneercreek.com/pioneercreek.cps.golf`
- Braemar ForeUp: `https://foreupsoftware.com/index.php/booking/21445/7829`

## 📦 Tech Stack

```json
{
  "Frontend": ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS"],
  "Backend": ["Supabase", "PostgreSQL", "Edge Functions"],
  "Automation": ["Playwright", "Headless Chrome"],
  "APIs": ["Google Maps", "Vercel"],
  "Deployment": ["Vercel", "GitHub"]
}
```

## 🔐 Security

- Row-level security (RLS) on all tables
- Environment variables for API keys
- Public golf courses viewable to all
- Users own only their bookings
- HTTPS only in production

## 🚢 Deployment

Deploy to Vercel with one click:

```bash
vercel --prod
```

Or connect GitHub repo to Vercel dashboard for auto-deploy on push.

## 📝 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= # Google Maps API key
NEXT_PUBLIC_APP_NAME=TeeFlow     # App name
```

## 🎨 Customization

### Colors (Golf Theme)
- Primary Green: `#1f5a3d`
- Accent Gold: `#d4af37`
- Tailwind config: `tailwind.config.ts`

### Courses
Edit `app/api/scrape-tee-times/route.ts` to add more courses.

### Time Presets
Edit `app/components/TimeRangeSelector.tsx` to customize time options.

## 🐛 Troubleshooting

See [SETUP.md](./SETUP.md) troubleshooting section for common issues.

## 📄 License

MIT - Feel free to use for personal or commercial projects.

## 👤 Created by

Eddie Olson - April 2026
