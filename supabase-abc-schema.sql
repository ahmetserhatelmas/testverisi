-- ABC Tracker: Supabase Schema
-- Mevcut schema'nın yanına ekle (SQL Editor'da çalıştır)

-- ABC Öğrenciler
create table if not exists students_abc (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  risk_level text not null default 'LOW' check (risk_level in ('LOW', 'HIGH')),
  self_injury boolean not null default false,
  aggression_level text not null default 'LOW' check (aggression_level in ('LOW', 'MEDIUM', 'HIGH')),
  regulation_level text not null default 'MEDIUM' check (regulation_level in ('LOW', 'MEDIUM', 'HIGH')),
  intervention_route text not null default 'STANDARD' check (intervention_route in ('SBT', 'FCT', 'STANDARD')),
  created_at timestamptz not null default now()
);

-- ABC Öğe Listesi (Antecedent / Behavior / Consequence)
create table if not exists abc_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students_abc(id) on delete cascade,
  category text not null check (category in ('antecedent', 'behavior', 'consequence')),
  label text not null,
  icon text,
  is_custom boolean not null default false,
  use_count integer not null default 0,
  function_hint text check (function_hint is null or function_hint in ('ESCAPE', 'ATTENTION', 'TANGIBLE', 'SENSORY', 'UNKNOWN')),
  created_at timestamptz not null default now()
);

-- ABC Seansları
create table if not exists abc_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students_abc(id) on delete cascade,
  student_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  event_count integer not null default 0,
  intervention_route text not null default 'STANDARD',
  created_at timestamptz not null default now()
);

-- ABC Olayları (Her kayıt bir A-B-C tripleti)
create table if not exists abc_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references abc_sessions(id) on delete cascade,
  student_id uuid references students_abc(id) on delete cascade,
  timestamp timestamptz not null default now(),
  session_minute integer not null default 0,
  antecedent_id uuid references abc_items(id),
  antecedent_label text not null,
  antecedent_unknown boolean not null default false,
  antecedent_function_hint text check (antecedent_function_hint is null or antecedent_function_hint in ('ESCAPE', 'ATTENTION', 'TANGIBLE', 'SENSORY', 'UNKNOWN')),
  behavior_id uuid references abc_items(id),
  behavior_label text not null,
  consequence_id uuid references abc_items(id),
  consequence_label text not null,
  behavior_duration_ms bigint,
  previous_event_id uuid references abc_events(id),
  notes text
);

-- RLS
alter table students_abc enable row level security;
alter table abc_items enable row level security;
alter table abc_sessions enable row level security;
alter table abc_events enable row level security;

create policy "Allow all" on students_abc for all using (true);
create policy "Allow all" on abc_items for all using (true);
create policy "Allow all" on abc_sessions for all using (true);
create policy "Allow all" on abc_events for all using (true);

-- Varsayılan ABC öğe listesi (global, student_id null = herkes için)
insert into abc_items (student_id, category, label, icon, is_custom) values
  -- Antecedents
  (null, 'antecedent', 'Zor Görev', '📚', false),
  (null, 'antecedent', 'Geçiş (Etkinlik Değişimi)', '🔄', false),
  (null, 'antecedent', 'Bekleme', '⏳', false),
  (null, 'antecedent', 'Sosyal İlgi Kesilmesi', '👥', false),
  (null, 'antecedent', 'Nesne Alındı', '🚫', false),
  (null, 'antecedent', 'Ortam Gürültüsü', '🔊', false),
  (null, 'antecedent', 'Yeni Kişi / Ortam', '👤', false),
  (null, 'antecedent', 'Bilinmiyor / Belirsiz', '❓', false),
  -- Behaviors
  (null, 'behavior', 'Ağlama / Bağırma', '😭', false),
  (null, 'behavior', 'Vurma (Kendine)', '🤜', false),
  (null, 'behavior', 'Vurma (Başkasına)', '👊', false),
  (null, 'behavior', 'Nesne Fırlatma', '🚀', false),
  (null, 'behavior', 'Masadan Kaçma', '🏃', false),
  (null, 'behavior', 'Zemine Uzanma', '⬇️', false),
  (null, 'behavior', 'Isırma', '😬', false),
  (null, 'behavior', 'Ekolali / Tekrar', '🔁', false),
  -- Consequences
  (null, 'consequence', 'FCT Uygulandı (İletişim Kartı)', '💬', false),
  (null, 'consequence', 'SBT - Talep Çekildi', '⬅️', false),
  (null, 'consequence', 'Sönme (Görmezden Gelindi)', '🙈', false),
  (null, 'consequence', 'Mola Verildi', '☕', false),
  (null, 'consequence', 'Alternatif Etkinlik', '🎯', false),
  (null, 'consequence', 'Fiziksel Rehberlik', '🤝', false),
  (null, 'consequence', 'Görsel Destek Gösterildi', '🖼️', false)
on conflict do nothing;

-- Mevcut veritabanına kolon eklemek için (zaten tablolar varsa SQL Editor'da çalıştır):
-- alter table abc_items add column if not exists function_hint text check (function_hint is null or function_hint in ('ESCAPE', 'ATTENTION', 'TANGIBLE', 'SENSORY', 'UNKNOWN'));
-- alter table abc_events add column if not exists antecedent_function_hint text check (antecedent_function_hint is null or antecedent_function_hint in ('ESCAPE', 'ATTENTION', 'TANGIBLE', 'SENSORY', 'UNKNOWN'));

-- Özel öğe silindiğinde geçmiş kayıtlar bozulmasın: abc_events'teki referanslar NULL yapılsın (metinler kalır).
-- Bu hatayı giderdikten sonra Admin'den öğe silebilirsiniz. SQL Editor'da aşağıdaki 6 satırı çalıştırın:
-- alter table abc_events drop constraint if exists abc_events_antecedent_id_fkey;
-- alter table abc_events drop constraint if exists abc_events_behavior_id_fkey;
-- alter table abc_events drop constraint if exists abc_events_consequence_id_fkey;
-- alter table abc_events add constraint abc_events_antecedent_id_fkey foreign key (antecedent_id) references abc_items(id) on delete set null;
-- alter table abc_events add constraint abc_events_behavior_id_fkey foreign key (behavior_id) references abc_items(id) on delete set null;
-- alter table abc_events add constraint abc_events_consequence_id_fkey foreign key (consequence_id) references abc_items(id) on delete set null;
