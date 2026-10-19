-- ==============================================================================
-- GeoCam - Semana 8: Configuración completa de Backend as a Service en Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (supabase.com)
-- ==============================================================================

-- 1. Tabla remota 'photos'
create table if not exists public.photos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id text not null unique,        -- Identificador único creado en el teléfono local
  storage_path text not null unique,     -- Ruta del archivo en el bucket
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  note text,
  favorite boolean not null default false,
  source text not null check (source in ('camera', 'gallery')),
  taken_at timestamptz not null,
  updated_at timestamptz not null,       -- Última modificación (base de la sincronización)
  created_at timestamptz not null default now()
);

-- 2. Habilitar Row Level Security (RLS) en 'photos'
alter table public.photos enable row level security;

-- Políticas de RLS: Cada usuario solo ve, crea y borra sus propias filas
drop policy if exists "ver las mías" on public.photos;
create policy "ver las mías" on public.photos
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "crear las mías" on public.photos;
create policy "crear las mías" on public.photos
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "actualizar las mías" on public.photos;
create policy "actualizar las mías" on public.photos
  for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "borrar las mías" on public.photos;
create policy "borrar las mías" on public.photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 3. Publicación en tiempo real (Supabase Realtime)
alter publication supabase_realtime add table public.photos;

-- 4. Bucket privado 'geocam' en Supabase Storage
insert into storage.buckets (id, name, public)
values ('geocam', 'geocam', false)
on conflict (id) do nothing;

-- 5. Políticas de seguridad en storage.objects para el bucket 'geocam'
-- Convención: carpeta por usuario (<id del usuario>/<nombre>.jpg)
drop policy if exists "subir a mi carpeta" on storage.objects;
create policy "subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "leer mi carpeta" on storage.objects;
create policy "leer mi carpeta" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "actualizar mi carpeta" on storage.objects;
create policy "actualizar mi carpeta" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "borrar de mi carpeta" on storage.objects;
create policy "borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

