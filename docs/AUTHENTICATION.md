# TeeFlow Authentication Guide

TeeFlow uses **Supabase Auth with SSR (Server-Side Rendering)** for secure, production-ready authentication.

## Architecture

### Files Overview

```
├── middleware.ts                    # Next.js middleware (runs on every request)
├── utils/supabase/
│   ├── server.ts                   # Server-side Supabase client
│   ├── client.ts                   # Browser-side Supabase client
│   └── middleware.ts               # Middleware helper
└── app/
    ├── api/                        # Use createClient from utils/supabase/server
    └── components/                 # Use createClient from utils/supabase/client
```

### Authentication Flow

1. **User Signs In**
   - Browser makes request to Supabase Auth endpoint
   - Supabase returns session with access + refresh tokens
   - Tokens stored in secure HTTP-only cookies

2. **Middleware Intercepts Request**
   - Every request goes through `middleware.ts`
   - Middleware checks token expiry
   - Automatically refreshes tokens before expiry
   - Sets new tokens in response cookies

3. **Server-Side Access**
   - Server Components/API routes use `utils/supabase/server.ts`
   - Reads cookies via Next.js `cookies()` API
   - No token management needed (middleware handles it)

4. **Client-Side Access**
   - Client Components use `utils/supabase/client.ts`
   - Makes requests to API routes or directly to Supabase
   - Real-time subscriptions work with Realtime API

## Implementation

### In Server Components

```typescript
import { createClient } from "@/utils/supabase/server";

export default async function MyComponent() {
  const supabase = await createClient();

  // Fetch data (automatically uses session cookies)
  const { data, error } = await supabase
    .from("tee_times")
    .select("*");

  return <div>{/* render data */}</div>;
}
```

### In Client Components

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function MyComponent() {
  const supabase = createClient();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("tee_times")
        .select("*");
      setData(data);
    };

    fetchData();
  }, []);

  return <div>{/* render data */}</div>;
}
```

### In API Routes

```typescript
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Queries automatically include session context
  const { data, error } = await supabase
    .from("tee_times")
    .select("*");

  return NextResponse.json({ data });
}
```

## Security Considerations

### ✅ What's Protected

- **Cookies**: HTTP-only cookies (not accessible to JavaScript)
- **CSRF Protection**: Built into Next.js middleware
- **Session Refresh**: Automatic before expiry
- **RLS Policies**: Database enforces row-level security

### ✅ Best Practices

1. **Use Server Components** for sensitive data queries
2. **Environment Variables**: Never expose service role key (only publishable key)
3. **RLS Policies**: Always define row-level security rules
4. **API Routes**: Use server-side client in API routes
5. **User ID**: Always verify `user_id` matches authenticated user

## User Identification

### Get Current User

**Server Component:**
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.id); // UUID of logged-in user
```

**Client Component:**
```typescript
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function UserProfile() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return <div>User: {user?.email}</div>;
}
```

## Common Tasks

### Sign In with Email/Password

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123",
});
```

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: "new@example.com",
  password: "password123",
});
```

### Sign Out

```typescript
await supabase.auth.signOut();
```

### Listen to Auth Changes

```typescript
"use client";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function AuthListener() {
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Auth event: ${event}`);
        console.log(`Session:`, session);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  return null;
}
```

## RLS Policies

All tables use Row-Level Security to ensure users can only access their own data:

### Example: Bookings Table

```sql
-- Users can only view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create bookings for themselves
CREATE POLICY "Users can create their own bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Testing

### In Development

Set up test user in Supabase:
1. Go to Supabase dashboard
2. Auth → Users
3. Click "Add user" and create test account
4. Use credentials to test sign-in

### In Vercel Production

1. Set same environment variables
2. Use Supabase dashboard for user management
3. Monitor Auth logs in Supabase

## Troubleshooting

### Cookies Not Persisting

- Check `middleware.ts` is at project root
- Verify `config.matcher` includes your routes
- Check browser dev tools → Application → Cookies

### User ID Always Null

- Verify middleware is running (add console.log)
- Check session exists: `await supabase.auth.getSession()`
- Confirm user is actually signed in

### "Unauthorized" Errors

- Verify RLS policies allow the operation
- Check `auth.uid()` matches user performing action
- Test with `SELECT auth.uid()` in SQL editor

## Next Steps

1. **Add Sign-In UI**: Create login form with email/password
2. **Add Sign-Up UI**: Create registration form
3. **User Profiles**: Store additional user data in `profiles` table
4. **Social Auth**: Add OAuth providers (Google, GitHub, etc.)
5. **Magic Links**: Email-based authentication without passwords
