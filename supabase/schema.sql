-- GPBCaptura: tablas de previos y partidas.
-- Vive en el mismo proyecto Supabase "GPB" que GPBFacturacion (comparten auth.users),
-- así que cualquier usuario que ya tenga cuenta en GPBFacturacion puede entrar aquí.

create table previos (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  cliente text,
  fecha date not null default current_date,
  bultos_tarimas int,
  bultos_cajas_madera int,
  bultos_otros int,
  bultos_otros_tipo text,
  peso_bruto numeric(12,2),
  status text not null check (status in ('draft', 'sent')) default 'draft',
  sent_to_facturacion_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table partidas (
  id uuid primary key default gen_random_uuid(),
  previo_id uuid not null references previos(id) on delete cascade,
  no_partida int not null,
  fraccion_arancelaria text,
  nico text,
  cant_factura numeric(12,2),
  um_comercial text,
  descripcion_aa text,
  marca text,
  modelo text,
  submodelo text,
  numserie text,
  pais_origen text,
  observaciones text,
  peso numeric(12,3),
  precio_unitario numeric(12,2),
  total numeric(12,2),
  id_cat_no_art_no text,
  aplica_ma text,
  photo_url text,
  photo_token uuid not null default gen_random_uuid() unique,
  photo_uploaded_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on partidas (previo_id);
create index on partidas (photo_token);

alter table previos enable row level security;
alter table partidas enable row level security;

create policy "authenticated full access" on previos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on partidas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger previos_set_updated_at
  before update on previos
  for each row execute function set_updated_at();

-- Storage bucket para las fotos de partidas (subida pública vía token, sin login).
insert into storage.buckets (id, name, public)
values ('partida-photos', 'partida-photos', true)
on conflict (id) do nothing;
