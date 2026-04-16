# TeeFlow Setup Guide

## 🏌️ Project Overview

TeeFlow is a real-time golf tee-time booking app that scrapes live availability from Minnesota golf courses and displays personalized results based on location and preferences.

### Features
- ✨ Real live tee time scraping (Chaska CPS, Pioneer Creek, Braemar)
- 📍 Distance calculation with Google Maps
- 🎨 Mobile-first responsive design
- ⚡ Real-time updates with Supabase
- 🔐 Row-level security (RLS)
- 🎬 Smooth animations with Framer Motion

---

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Git installed
- GitHub account
- Vercel account (optional for deployment)

Verify installations:
```bash
node --version
git --version
gh --version  # GitHub CLI
```

If you don't have GitHub CLI: `brew install gh` (Mac) or see https://cli.github.com

---

## 🔐 Supabase Authentication (SSR-Compatible)

TeeFlow uses **Supabase SSR** for production-ready authentication that works with Next.js Server Components and middleware. This ensures secure session management and automatic token refresh.

### Key Files
- `utils/supabase/server.ts` - Server-side client for API routes and Server Components
- `utils/supabase/client.ts` - Browser-side client for Client Components
- `utils/supabase/middleware.ts` - Middleware for session refresh
- `middleware.ts` - Next.js middleware that runs on every request

### How It Works
1. User logs in via Supabase Auth
2. Session stored in secure HTTP-only cookies
3. Middleware automatically refreshes tokens before expiry
4. Server Components read cookies for authenticated requests
5. Client Components use browser client for real-time updates

---

## 🚀 Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New project"**
3. Fill in:
   - **Name**: `teeflow`
   - **Database Password**: Save this securely
   - **Region**: Choose closest to you (Minnesota: `us-east-1`)
4. Click **"Create new project"** and wait 2-3 minutes

Once created:
- Copy your **Project Reference ID** from dashboard URL or settings (looks like: `abcdef123456`)
- Go to **Settings → API** and copy:
  - `public (ANON)` key
  - Project URL

### Update .env.local
Edit `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
```

---

## 🗺️ Step 2: Create Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create a new project named "TeeFlow"
3. In the search bar, enable these APIs:
   - **Maps SDK for JavaScript**
   - **Distance Matrix API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the key:
   - Application restrictions: **HTTP referrers**
   - Add:
     - `localhost:3000/*`
     - `*.vercel.app/*`
     - Your domain (once deployed)

### Update .env.local
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<paste-api-key-here>
```

---

## 💻 Step 3: Install Dependencies & Setup

Run these commands in order:

```bash
# 1. Install Node dependencies (includes @supabase/ssr for SSR auth)
npm install

# 2. Generate Supabase types (optional but recommended)
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/supabase.ts

# 3. Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Push database schema
npx supabase db push
```

**Note**: Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.

---

## 🧪 Step 4: Test Locally

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

You should see:
- TeeFlow logo and title
- Search form with date picker and time range selector
- "Find real tee times" button

### Test the Scraper

Open your browser console and test:
```javascript
fetch('/api/scrape-tee-times?date=2026-04-16&startHour=6&endHour=18')
  .then(r => r.json())
  .then(d => console.log(d))
```

You should see tee times from the courses.

---

## 📦 Step 5: Deploy to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "feat: initial TeeFlow setup with live scraper"

# Create and push to GitHub
gh repo create teeflow --private --source=. --push --remote=origin

# Verify
git log --oneline
```

Your GitHub repo URL: `https://github.com/YOUR_USERNAME/teeflow`

---

## ☁️ Step 6: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI (if needed)
npm install -g vercel

# Deploy
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: teeflow
# - Framework preset: Next.js
# - Root directory: ./
```

### Option B: Using GitHub Integration

1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Select your GitHub `teeflow` repo
4. Configure:
   - Framework: Next.js
   - Root directory: ./
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
6. Click **"Deploy"**

Your live URL will be: `https://teeflow.vercel.app`

---

## 🔧 Configuration Files Reference

### `.env.local` (development)
Local environment variables. Never commit to git.

### `next.config.ts`
Next.js configuration with Playwright support for serverless functions.

### `tailwind.config.ts`
Golf-themed color scheme:
- Primary: Golf Green (`#1f5a3d`)
- Accent: Gold (`#d4af37`)
- Secondary: White

### `supabase/migrations/*.sql`
Database schema with:
- `golf_courses` table
- `tee_times` table with real-time enabled
- `bookings` table with RLS policies
- Indexes for performance

---

## 📱 Using the App

### Home Screen
1. Select a date (defaults to tomorrow)
2. Choose time range:
   - **Presets**: Morning (6-10am), Midday (10am-2pm), Afternoon (2-6pm)
   - **Custom**: Use sliders for exact range
3. Click **"Find Real Tee Times"**

### Results
For each available tee time, you'll see:
- Course name and address
- Exact tee time (e.g., 7:00 AM)
- Distance from your location
- Price (if available)
- Available players needed
- "Book Now" button

### Booking
Click "Book Now" to reserve a tee time. The booking is saved to your Supabase bookings table.

---

## 🐛 Troubleshooting

### Scraper returns no results
- Check if Playwright is properly installed: `npm list playwright`
- Verify course URLs are still correct (golf courses may update their booking systems)
- Check browser console for errors
- Try different date/time ranges

### Google Maps API errors
- Verify API key is correct and has Distance Matrix enabled
- Check HTTP referrer restrictions (should include localhost:3000)
- Ensure API key is not revoked/deleted

### Supabase connection errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Check Supabase project is active (not paused)
- Verify RLS policies allow public access to `golf_courses` and `tee_times`

### Vercel deployment fails
- Check build logs: `vercel logs --tail`
- Ensure environment variables are set in Vercel dashboard
- Verify Playwright compatibility (should work with `@playwright/test`)

---

## 📚 API Routes

### `POST /api/scrape-tee-times`
Scrapes golf course websites using Playwright.

**Query params**:
- `date`: YYYY-MM-DD format
- `startHour`: 0-23
- `endHour`: 0-23

**Returns**: Array of `TeeTime` objects with course info

**Caching**: Runs every request (in production, add Redis caching)

### `POST /api/calculate-distance`
Calculates driving distance using Google Distance Matrix API.

**Body**:
```json
{
  "userLat": 44.9,
  "userLng": -93.2,
  "teeTimeIds": ["uuid1", "uuid2"]
}
```

**Returns**: Map of tee time IDs to distance data

### `POST /api/book-tee-time`
Creates a booking record.

**Body**:
```json
{
  "tee_time_id": "uuid"
}
```

**Returns**: Booking confirmation

---

## 🎯 Next Steps (Post-Deployment)

1. **Add Authentication**: Integrate Supabase Auth for user accounts
2. **Caching**: Add Redis caching for scraper results (avoid re-scraping within 5 min)
3. **Analytics**: Track user searches and popular tee times
4. **Notifications**: Email/SMS alerts for favorite courses
5. **Mobile App**: React Native version with push notifications

---

## 📞 Support

For issues:
1. Check this SETUP.md for troubleshooting
2. Review error logs: `npm run dev` in terminal
3. Check Vercel logs: `vercel logs --tail` (if deployed)
4. Supabase dashboard: Status, realtime, and data inspection

---

## 🎉 You're All Set!

TeeFlow is now live and scraping real golf course data. Go find some tee times! ⛳
