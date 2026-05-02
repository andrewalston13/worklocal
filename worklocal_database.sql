-- ============================================================
-- WORKLOCAL — DATABASE SETUP
-- ============================================================
-- HOW TO USE:
-- 1. Go to your Supabase project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire file and click "Run"
-- 4. All tables will be created instantly
-- ============================================================


-- ── TABLE 1: USERS ──────────────────────────────────────────
-- Extends Supabase's built-in auth.users table
-- Stores WorkLocal-specific profile data

create table public.users (
  id            uuid references auth.users(id) on delete cascade primary key,
  name          text,
  city          text,
  tier          text default 'Newcomer',
  total_points  integer default 0,
  checkin_count integer default 0,
  spots_added   integer default 0,
  reviews_count integer default 0,
  created_at    timestamp with time zone default now()
);

-- Auto-create user profile when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── TABLE 2: SPOTS ──────────────────────────────────────────
-- Every cafe, brewery, winery, co-working space etc.

create table public.spots (
  id              bigint generated always as identity primary key,
  name            text not null,
  type            text not null,         -- coffee, brewery, winery, cowork, bakery, other
  neighborhood    text,
  city            text not null,
  state           text,
  address         text,
  lat             numeric(10, 7),
  lng             numeric(10, 7),
  phone           text,
  website         text,
  hours           text,
  parking         text,

  -- Nomad essentials
  wifi_status     text default 'unknown', -- free, password, none, unknown
  outlets         text default 'unknown', -- plenty, some, few, none, unknown
  noise_level     text default 'unknown', -- quiet, moderate, lively, loud, unknown
  laptop_friendly text default 'unknown', -- welcome, neutral, limit, banned, unknown
  seating_size    text default 'unknown', -- small, medium, large

  -- Amenities (booleans)
  has_food        boolean default false,
  has_alcohol     boolean default false,
  natural_light   boolean default false,
  ada_accessible  boolean default false,
  dog_friendly    boolean default false,
  outdoor_seating boolean default false,

  -- Nomad score (recalculated automatically)
  nomad_score     integer default 0,
  wifi_avg_speed  numeric(6,1) default 0,
  checkin_count   integer default 0,

  -- External links
  google_place_id text,
  google_rating   numeric(2,1),
  google_reviews  integer,
  yelp_rating     numeric(2,1),
  yelp_reviews    integer,

  -- Admin fields
  status          text default 'pending', -- pending, live, hidden, closed
  featured        boolean default false,
  partner         boolean default false,
  admin_notes     text,
  submitted_by    uuid references public.users(id),

  created_at      timestamp with time zone default now(),
  updated_at      timestamp with time zone default now()
);

-- Add some starter spots (Austin, TX) so your map isn't empty
insert into public.spots
  (name, type, neighborhood, city, state, address, lat, lng,
   wifi_status, outlets, noise_level, laptop_friendly,
   nomad_score, wifi_avg_speed, checkin_count, status)
values
  ('Epoch Coffee', 'coffee', 'North Loop', 'Austin', 'TX',
   '2700 Anderson Ln', 30.3230, -97.7340,
   'free', 'plenty', 'moderate', 'welcome', 94, 87.0, 412, 'live'),

  ('Lazarus Brewing Co.', 'brewery', 'East 6th', 'Austin', 'TX',
   '1902 E 6th St', 30.2580, -97.7220,
   'free', 'some', 'moderate', 'welcome', 91, 72.0, 287, 'live'),

  ('Radio Coffee & Beer', 'coffee', 'South Lamar', 'Austin', 'TX',
   '4204 Menchaca Rd', 30.2490, -97.7700,
   'free', 'plenty', 'moderate', 'welcome', 89, 95.0, 203, 'live'),

  ('Cherrywood Coffeehouse', 'coffee', 'Cherrywood', 'Austin', 'TX',
   '1400 E 38th St', 30.2660, -97.7180,
   'free', 'some', 'quiet', 'welcome', 86, 58.0, 94, 'live'),

  ('Capital Factory', 'cowork', 'Downtown', 'Austin', 'TX',
   '701 Brazos St', 30.2685, -97.7404,
   'free', 'plenty', 'moderate', 'welcome', 97, 320.0, 184, 'live'),

  ('Cuvée Coffee', 'coffee', 'North Burnet', 'Austin', 'TX',
   '2000 E 6th St', 30.3380, -97.7300,
   'free', 'some', 'quiet', 'welcome', 83, 110.0, 67, 'live');


-- ── TABLE 3: CHECKINS ───────────────────────────────────────
-- Every time a nomad checks in to a spot

create table public.checkins (
  id              bigint generated always as identity primary key,
  user_id         uuid references public.users(id) on delete cascade,
  spot_id         bigint references public.spots(id) on delete cascade,

  -- Wifi test results
  wifi_download   numeric(6,1),          -- Mbps
  wifi_upload     numeric(6,1),
  wifi_ping       integer,               -- ms

  -- One-tap ratings
  rating_outlets  text,                  -- plenty, some, none
  rating_noise    text,                  -- quiet, moderate, loud
  rating_friendly text,                  -- welcome, neutral, bad
  rating_drink    text,                  -- great, decent, bad

  -- Vibe tags (array of strings)
  vibe_tags       text[],

  -- Points earned for this checkin
  points_earned   integer default 0,

  checked_in_at   timestamp with time zone default now()
);


-- ── TABLE 4: REVIEWS ────────────────────────────────────────
-- Written reviews left by nomads

create table public.reviews (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.users(id) on delete cascade,
  spot_id     bigint references public.spots(id) on delete cascade,
  checkin_id  bigint references public.checkins(id),
  body        text not null,
  helpful     integer default 0,
  created_at  timestamp with time zone default now()
);


-- ── TABLE 5: POINTS LOG ─────────────────────────────────────
-- Every point transaction — earned and redeemed

create table public.points_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.users(id) on delete cascade,
  action      text not null,  -- checkin, review, spot_added, city_pioneer, referral, redemption
  points      integer not null,
  spot_id     bigint references public.spots(id),
  note        text,
  created_at  timestamp with time zone default now()
);


-- ── NOMAD SCORE FUNCTION ────────────────────────────────────
-- Runs automatically every time a checkin is saved
-- Recalculates the nomad score for that spot

create or replace function recalculate_nomad_score(spot_id_input bigint)
returns void as $$
declare
  avg_wifi      numeric;
  avg_outlets   numeric;
  avg_noise     numeric;
  avg_friendly  numeric;
  avg_drink     numeric;
  total_score   numeric;
  checkin_ct    integer;
begin
  -- Count checkins
  select count(*) into checkin_ct
  from public.checkins
  where spot_id = spot_id_input;

  -- Score each rating category (good=100, mid=65, bad=20)
  select
    coalesce(avg(case rating_outlets  when 'plenty'  then 100 when 'some'     then 65 when 'none'     then 20 end), 50),
    coalesce(avg(case rating_noise    when 'quiet'   then 100 when 'moderate' then 65 when 'loud'     then 20 end), 50),
    coalesce(avg(case rating_friendly when 'welcome' then 100 when 'neutral'  then 65 when 'bad'      then 20 end), 50),
    coalesce(avg(case rating_drink    when 'great'   then 100 when 'decent'   then 65 when 'bad'      then 20 end), 50)
  into avg_outlets, avg_noise, avg_friendly, avg_drink
  from public.checkins
  where spot_id = spot_id_input;

  -- Wifi score from average speed (caps at 100 for 200+ Mbps)
  select coalesce(least(avg(wifi_download) / 2.0, 100), 50)
  into avg_wifi
  from public.checkins
  where spot_id = spot_id_input and wifi_download is not null;

  -- Apply weights (must add to 100%)
  -- Wifi: 30%, Friendly: 25%, Outlets: 22%, Drink: 13%, Noise: 6%, (seating 4% uses outlets proxy)
  total_score :=
    (avg_wifi      * 0.30) +
    (avg_friendly  * 0.25) +
    (avg_outlets   * 0.22) +
    (avg_drink     * 0.13) +
    (avg_noise     * 0.06) +
    (avg_outlets   * 0.04);  -- seating proxy

  -- Update the spot
  update public.spots
  set
    nomad_score    = round(total_score),
    checkin_count  = checkin_ct,
    wifi_avg_speed = coalesce((select avg(wifi_download) from public.checkins where spot_id = spot_id_input and wifi_download is not null), 0),
    updated_at     = now()
  where id = spot_id_input;
end;
$$ language plpgsql;


-- ── POINTS FUNCTION ─────────────────────────────────────────
-- Runs automatically after a checkin saves
-- Awards points and updates user total

create or replace function award_checkin_points()
returns trigger as $$
declare
  pts integer := 0;
begin
  pts := pts + 25;  -- base checkin points

  -- Extra for wifi test
  if new.wifi_download is not null then
    pts := pts + 10;
  end if;

  -- Extra for leaving a review (checked separately)
  -- Review trigger handles +20 pts on its own

  -- Update checkin with points earned
  new.points_earned := pts;

  -- Add to points log
  insert into public.points_log (user_id, action, points, spot_id, note)
  values (new.user_id, 'checkin', pts, new.spot_id, 'Check-in + wifi test');

  -- Update user total points and checkin count
  update public.users
  set
    total_points  = total_points + pts,
    checkin_count = checkin_count + 1,
    tier = case
      when total_points + pts >= 5000 then 'Founding Nomad'
      when total_points + pts >= 2000 then 'Roaster'
      when total_points + pts >= 500  then 'Local Legend'
      when total_points + pts >= 200  then 'Regular'
      else 'Newcomer'
    end
  where id = new.user_id;

  -- Recalculate nomad score for this spot
  perform recalculate_nomad_score(new.spot_id);

  return new;
end;
$$ language plpgsql;

create trigger on_checkin_created
  before insert on public.checkins
  for each row execute procedure award_checkin_points();


-- ── REVIEW POINTS TRIGGER ───────────────────────────────────
-- Awards +20 pts when a review is written

create or replace function award_review_points()
returns trigger as $$
begin
  insert into public.points_log (user_id, action, points, spot_id, note)
  values (new.user_id, 'review', 20, new.spot_id, 'Written review');

  update public.users
  set
    total_points  = total_points + 20,
    reviews_count = reviews_count + 1
  where id = new.user_id;

  return new;
end;
$$ language plpgsql;

create trigger on_review_created
  after insert on public.reviews
  for each row execute procedure award_review_points();


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
-- Controls who can read and write what
-- (Anyone can read spots and reviews, only owners can edit their own data)

alter table public.users    enable row level security;
alter table public.spots    enable row level security;
alter table public.checkins enable row level security;
alter table public.reviews  enable row level security;
alter table public.points_log enable row level security;

-- Spots: anyone can read live spots, only admins can write
create policy "Anyone can view live spots"
  on public.spots for select
  using (status = 'live');

create policy "Authenticated users can submit spots"
  on public.spots for insert
  with check (auth.role() = 'authenticated');

-- Users: can only read/edit their own profile
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Checkins: anyone can read, only owner can write
create policy "Anyone can read checkins"
  on public.checkins for select using (true);

create policy "Users can insert their own checkins"
  on public.checkins for insert
  with check (auth.uid() = user_id);

-- Reviews: anyone can read, only owner can write
create policy "Anyone can read reviews"
  on public.reviews for select using (true);

create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- Points log: only owner can read their own
create policy "Users can view their own points"
  on public.points_log for select
  using (auth.uid() = user_id);


-- ── DONE ────────────────────────────────────────────────────
-- You now have:
--   ✓ users table (with auto-create on signup)
--   ✓ spots table (with 6 starter spots in Austin)
--   ✓ checkins table
--   ✓ reviews table
--   ✓ points_log table
--   ✓ nomad score auto-recalculates on every checkin
--   ✓ points auto-award on every checkin and review
--   ✓ tier auto-updates as points accumulate
--   ✓ row level security on all tables
