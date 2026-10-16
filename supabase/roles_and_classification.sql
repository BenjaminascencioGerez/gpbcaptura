-- Roles de usuario, catálogo de clasificación arancelaria por cliente,
-- adjuntos múltiples por partida, y flujo de clasificación/glosa.

create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('captura', 'clasificador', 'glosador', 'ejecutivo', 'administrador', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_roles enable row level security;

create policy "authenticated full access" on user_roles for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create trigger user_roles_set_updated_at
  before update on user_roles
  for each row execute function set_updated_at();

-- Catálogo de clasificación arancelaria, uno por cliente (campo "cliente" en previos).
create table clasificaciones_arancelarias (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  fraccion_arancelaria text not null,
  nico text,
  descripcion text not null,
  regulaciones text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on clasificaciones_arancelarias (cliente);

alter table clasificaciones_arancelarias enable row level security;

create policy "authenticated full access" on clasificaciones_arancelarias for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Adjuntos múltiples por partida (fotos y documentos), además del photo_url/photo_token
-- existentes que se mantienen como "foto principal" para la miniatura en la tabla.
create table partida_attachments (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references partidas(id) on delete cascade,
  file_url text not null,
  file_type text not null check (file_type in ('photo', 'document')),
  uploaded_via text not null check (uploaded_via in ('public_link', 'office')),
  uploaded_at timestamptz not null default now()
);

create index on partida_attachments (partida_id);

alter table partida_attachments enable row level security;

create policy "authenticated full access" on partida_attachments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Flujo de clasificación (Clasificador) y glosa (Glosador) sobre cada partida.
alter table partidas add column classification_status text not null default 'pendiente'
  check (classification_status in ('pendiente', 'clasificado'));
alter table partidas add column clasificado_by uuid references auth.users(id);
alter table partidas add column clasificado_at timestamptz;

alter table partidas add column glosado boolean not null default false;
alter table partidas add column glosado_by uuid references auth.users(id);
alter table partidas add column glosado_at timestamptz;
alter table partidas add column notas_glosa text;

-- Cola simple de notificaciones (para cuando se conecte un proveedor de correo real).
create table notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  partida_id uuid references partidas(id) on delete cascade,
  previo_id uuid references previos(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notification_events enable row level security;

create policy "authenticated full access" on notification_events for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
