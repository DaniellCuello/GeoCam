-- ==============================================================================
-- GeoCam - Semana 9: Backend as a Service con TanStack Query y Sincronización
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (supabase.com)
-- ==============================================================================

-- 1. Reloj del servidor: cuándo llegó cada cambio a Supabase (cursor de bajada)
alter table public.photos
  add column if not exists server_updated_at timestamptz not null default now();

-- Función para actualizar server_updated_at automáticamente al insertar o editar
create or replace function public.touch_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

-- Trigger sobre la tabla photos
drop trigger if exists photos_touch_server_updated_at on public.photos;
create trigger photos_touch_server_updated_at
  before insert or update on public.photos
  for each row execute function public.touch_server_updated_at();

-- Índice para optimizar consultas de bajada por usuario ordenadas por server_updated_at
create index if not exists photos_user_server_updated_idx
  on public.photos (user_id, server_updated_at);

-- 2. Política RLS de actualización requerida para upsert
drop policy if exists "editar las mías" on public.photos;
create policy "editar las mías" on public.photos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. C1: Borrado lógico sincronizado (Trabajo para la casa)
-- Permite que los borrados no sean destructivos de inmediato, sino que se sincronicen
-- hacia otros teléfonos antes de remover el archivo del bucket.
alter table public.photos
  add column if not exists deleted_at timestamptz;

create index if not exists photos_user_deleted_idx
  on public.photos (user_id, deleted_at);
