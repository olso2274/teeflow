-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Golf Courses table
create table if not exists golf_courses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  website text,
  booking_url text not null,
  created_at timestamp with time zone default now()
);

-- Tee Times table
create table if not exists tee_times (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references golf_courses(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  players_needed integer default 4,
  price_cents integer,
  status text default 'open' check (status in ('open', 'booked', 'closed')),
  created_at timestamp with time zone default now()
);

-- Bookings table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tee_time_id uuid references tee_times(id) on delete cascade not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index idx_tee_times_course_id on tee_times(course_id);
create index idx_tee_times_start_time on tee_times(start_time);
create index idx_tee_times_status on tee_times(status);
create index idx_bookings_user_id on bookings(user_id);
create index idx_bookings_tee_time_id on bookings(tee_time_id);

-- Enable Row Level Security
alter table golf_courses enable row level security;
alter table tee_times enable row level security;
alter table bookings enable row level security;

-- RLS Policies for golf_courses (public read)
create policy "Golf courses are publicly readable"
  on golf_courses
  for select
  using (true);

-- RLS Policies for tee_times (public read for open times)
create policy "Open tee times are publicly readable"
  on tee_times
  for select
  using (status = 'open');

-- RLS Policies for bookings (users can only see/manage their own)
create policy "Users can view their own bookings"
  on bookings
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own bookings"
  on bookings
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookings"
  on bookings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable realtime for live updates
alter publication supabase_realtime add table tee_times, bookings;

-- Insert initial golf courses
insert into golf_courses (name, address, lat, lng, website, booking_url)
values
  (
    'Chaska Town Course',
    '5500 Pioneer Trail, Chaska, MN 55318',
    44.5823,
    -93.5789,
    'https://chaska.cps.golf',
    'https://chaska.cps.golf/onlineresweb/m/search-teetime/default'
  ),
  (
    'Pioneer Creek Country Club',
    '2880 Valley View Lane, Lakeville, MN 55044',
    44.6372,
    -93.2689,
    'https://www.pioneercreek.com',
    'https://www.pioneercreek.com/pioneercreek.cps.golf'
  ),
  (
    'Braemar Golf Club',
    '6644 Stillwater Road, Edina, MN 55439',
    44.7889,
    -93.3456,
    'https://braemargolf.com',
    'https://foreupsoftware.com/index.php/booking/21445/7829'
  )
on conflict do nothing;
