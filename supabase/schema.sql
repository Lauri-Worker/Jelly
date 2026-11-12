-- Jelly Notes: Datenbank für Benutzerkonten.
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.

-- Notizbücher: eine Zeile pro Notizbuch, jeder Nutzer sieht nur seine eigenen.
create table if not exists public.notebooks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meta jsonb not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists notebooks_user_id_idx on public.notebooks (user_id);

alter table public.notebooks enable row level security;

drop policy if exists "notebooks_select_own" on public.notebooks;
drop policy if exists "notebooks_insert_own" on public.notebooks;
drop policy if exists "notebooks_update_own" on public.notebooks;
drop policy if exists "notebooks_delete_own" on public.notebooks;
create policy "notebooks_select_own" on public.notebooks for select using (auth.uid() = user_id);
create policy "notebooks_insert_own" on public.notebooks for insert with check (auth.uid() = user_id);
create policy "notebooks_update_own" on public.notebooks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notebooks_delete_own" on public.notebooks for delete using (auth.uid() = user_id);

-- Bilder und PDF-Seiten: privater Speicher-Bucket, Pfad beginnt mit der Nutzer-ID.
insert into storage.buckets (id, name, public) values ('assets', 'assets', false)
on conflict (id) do nothing;

drop policy if exists "assets_select_own" on storage.objects;
drop policy if exists "assets_insert_own" on storage.objects;
drop policy if exists "assets_update_own" on storage.objects;
drop policy if exists "assets_delete_own" on storage.objects;
create policy "assets_select_own" on storage.objects for select
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "assets_insert_own" on storage.objects for insert
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "assets_update_own" on storage.objects for update
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "assets_delete_own" on storage.objects for delete
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
