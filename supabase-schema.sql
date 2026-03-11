-- Modus App: Supabase Schema
-- Run this in your Supabase SQL Editor

-- Students table
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  last_successful_level smallint not null default 1 check (last_successful_level between 1 and 4),
  created_at timestamptz not null default now()
);

-- Sessions table
create table if not exists sessions (
  session_id uuid primary key,
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  initial_cab_level smallint not null,
  final_cab_level smallint,
  -- Timer snapshots (milliseconds)
  t1_session bigint not null default 0,
  t2_hre bigint not null default 0,
  t3_recovery bigint not null default 0,
  t4_latency bigint not null default 0,
  t5_crisis bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Trials table
create table if not exists trials (
  trial_id uuid primary key,
  session_id uuid references sessions(session_id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  timestamp timestamptz not null,
  state_at_start text not null check (state_at_start in ('GREEN', 'YELLOW', 'RED')),
  cab_level smallint not null check (cab_level between 1 and 4),
  input text not null check (input in ('SUCCESS', 'FAIL', 'ASSENT_WITHDRAWAL')),
  latency_ms bigint,
  result_state text not null check (result_state in ('GREEN', 'YELLOW'))
);

-- Recovery events table
create table if not exists recovery_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(session_id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  started_at bigint not null, -- epoch ms
  ended_at bigint,
  duration_ms bigint
);

-- Enable Row Level Security
alter table students enable row level security;
alter table sessions enable row level security;
alter table trials enable row level security;
alter table recovery_events enable row level security;

-- Policies (allow all for now - add auth later)
create policy "Allow all" on students for all using (true);
create policy "Allow all" on sessions for all using (true);
create policy "Allow all" on trials for all using (true);
create policy "Allow all" on recovery_events for all using (true);

-- Insert demo student
insert into students (id, name, last_successful_level)
values ('00000000-0000-0000-0000-000000000001', 'Uzay', 2)
on conflict (id) do nothing;
