-- Özel öğe silme hatasını giderir: abc_events referansları ON DELETE SET NULL yapılır.
-- Supabase SQL Editor'da bu dosyanın içeriğini yapıştırıp çalıştırın.

alter table abc_events drop constraint if exists abc_events_antecedent_id_fkey;
alter table abc_events drop constraint if exists abc_events_behavior_id_fkey;
alter table abc_events drop constraint if exists abc_events_consequence_id_fkey;
alter table abc_events add constraint abc_events_antecedent_id_fkey foreign key (antecedent_id) references abc_items(id) on delete set null;
alter table abc_events add constraint abc_events_behavior_id_fkey foreign key (behavior_id) references abc_items(id) on delete set null;
alter table abc_events add constraint abc_events_consequence_id_fkey foreign key (consequence_id) references abc_items(id) on delete set null;
