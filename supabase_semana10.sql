-- supabase_semana10.sql
-- Semana 10: IA Generativa Multimodal y Edge AI (GeoCam ve + Asistente IA)

-- 1. Columna ai_description en la tabla photos (Requisito T3)
alter table public.photos
add column if not exists ai_description text;

-- 2. Tabla uso_ia para control de límite diario por usuario (Reto C5)
create table if not exists public.uso_ia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tipo text not null default 'general',
  created_at timestamptz not null default now()
);

-- Habilitar Row Level Security (RLS)
alter table public.uso_ia enable row level security;

-- Política de lectura: los usuarios solo ven sus propios registros de uso
drop policy if exists "Los usuarios pueden ver su propio uso de IA" on public.uso_ia;
create policy "Los usuarios pueden ver su propio uso de IA"
  on public.uso_ia for select
  using (auth.uid() = user_id);

-- Política de inserción: los usuarios solo pueden insertar registros para sí mismos
drop policy if exists "Los usuarios pueden registrar su propio uso de IA" on public.uso_ia;
create policy "Los usuarios pueden registrar su propio uso de IA"
  on public.uso_ia for insert
  with check (auth.uid() = user_id);

-- Índices para optimizar el conteo de peticiones en las últimas 24 horas
create index if not exists idx_uso_ia_user_created
  on public.uso_ia (user_id, created_at desc);

-- Comentario explicativo
comment on table public.uso_ia is 'Registro de peticiones de IA por usuario para controlar el límite de 24 horas (C5)';
