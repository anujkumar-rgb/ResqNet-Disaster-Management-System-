-- ResqNet Supabase Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enum Types
create type user_role as enum ('citizen', 'admin', 'rescue_team');
create type incident_type as enum ('fire', 'accident', 'medical', 'flood', 'earthquake', 'other');
create type report_status as enum ('pending', 'assigned', 'resolved');
create type priority_level as enum ('low', 'medium', 'high', 'critical');
create type team_type as enum ('ambulance', 'fire_brigade', 'police', 'relief_truck');
create type team_status as enum ('idle', 'en_route', 'on_scene', 'rescue_in_progress', 'completed', 'refueling');
create type resource_type as enum ('hospital_beds', 'oxygen_cylinders', 'blood_units', 'rescue_vehicles');
create type sender_type as enum ('admin', 'rescue_unit');

-- Users Table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role user_role not null default 'citizen',
  display_name text,
  phone_number text,
  date_of_birth text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports Table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  type incident_type not null,
  title text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  media_urls text[] default '{}',
  status report_status not null default 'pending',
  priority priority_level not null default 'medium',
  reporter_id uuid references public.users(id) not null,
  reporter_name text,
  ai_optimization jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Teams Table
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type team_type not null,
  status team_status not null default 'idle',
  leader_id uuid references public.users(id) not null,
  latitude double precision not null,
  longitude double precision not null,
  assigned_report_id uuid references public.reports(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Resources Table
create table public.resources (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type resource_type not null,
  available_count integer not null default 0,
  total_count integer not null default 0,
  latitude double precision,
  longitude double precision,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Broadcasts Table
create table public.broadcasts (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) not null,
  sender_id uuid references public.users(id) not null,
  sender_name text not null,
  sender_type sender_type not null,
  target_facility_types text[] not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_reports_updated_at
  before update on public.reports
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_teams_updated_at
  before update on public.teams
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_resources_updated_at
  before update on public.resources
  for each row
  execute procedure public.handle_updated_at();


-- Row Level Security (RLS)

-- Users: Read by all authenticated users, update by owner or admin
alter table public.users enable row level security;
create policy "Users are viewable by everyone" on public.users for select to authenticated using (true);
create policy "Users can insert own profile" on public.users for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update to authenticated using (auth.uid() = id);

-- Reports: Viewable by everyone, insert by authenticated, update by owner or admin/assigned team
alter table public.reports enable row level security;
create policy "Reports are viewable by everyone" on public.reports for select to authenticated using (true);
create policy "Anyone can insert a report" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users can update own reports" on public.reports for update to authenticated using (auth.uid() = reporter_id);
create policy "Admins and assigned teams can update reports" on public.reports for update to authenticated using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  or
  exists (select 1 from public.teams where leader_id = auth.uid() and assigned_report_id = public.reports.id)
);

-- Teams: Viewable by everyone, update by owner or admin
alter table public.teams enable row level security;
create policy "Teams are viewable by everyone" on public.teams for select to authenticated using (true);
create policy "Teams can be updated by leaders" on public.teams for update to authenticated using (auth.uid() = leader_id);
create policy "Admins can manage teams" on public.teams for all to authenticated using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Resources: Viewable by everyone, manage by admin
alter table public.resources enable row level security;
create policy "Resources are viewable by everyone" on public.resources for select to authenticated using (true);
create policy "Admins can manage resources" on public.resources for all to authenticated using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Broadcasts: Viewable by everyone, insert by authenticated
alter table public.broadcasts enable row level security;
create policy "Broadcasts are viewable by everyone" on public.broadcasts for select to authenticated using (true);
create policy "Anyone can insert a broadcast" on public.broadcasts for insert to authenticated with check (auth.uid() = sender_id);


-- Seed Data (Resources)
insert into public.resources (name, type, available_count, total_count, latitude, longitude)
values 
  ('Mumbai City Hospital', 'hospital_beds', 14, 250, 19.0760, 72.8777),
  ('BKC Oxygen Hub', 'oxygen_cylinders', 482, 500, 19.0607, 72.8633),
  ('South Mumbai Blood Bank', 'blood_units', 12, 50, 18.9219, 72.8347),
  ('Western Express Garage', 'rescue_vehicles', 8, 10, 19.2185, 72.8631);
