-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (linked to Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student', 'parent')),
  linked_student_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Study records table
create table if not exists public.study_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  time_slots jsonb not null default '[]',
  daily_totals jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Categories table (custom subjects per user)
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- Auto-create public.users on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger study_records_updated_at
  before update on public.study_records
  for each row execute function public.handle_updated_at();

-- Row Level Security

alter table public.users enable row level security;
alter table public.study_records enable row level security;
alter table public.categories enable row level security;

-- Users policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Security definer function to avoid RLS recursion on users table
create or replace function public.is_parent_of(student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'parent'
      and linked_student_id = student_id
  );
$$;

-- Parents can view their linked student's profile (via security definer to avoid recursion)
create policy "Parents can view linked student profile"
  on public.users for select
  using (public.is_parent_of(id));

-- Study records policies
create policy "Students can manage own records"
  on public.study_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Parents can view linked student records"
  on public.study_records for select
  using (public.is_parent_of(user_id));

-- Categories policies
create policy "Users can manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
