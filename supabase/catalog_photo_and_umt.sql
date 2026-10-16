-- Foto de referencia en el catálogo de clasificación (para cross-reference visual),
-- y campos de Kilos por pieza / UMT en partidas (dato real de pedimento, distinto de
-- UM Comercial).

alter table clasificaciones_arancelarias add column photo_url text;

alter table partidas add column kilos_por_pieza numeric(12,4);
alter table partidas add column umt text;

-- Catálogo oficial de fracciones arancelarias (LIGIE), para validar/sugerir al clasificar.
create table fracciones_ligie (
  id uuid primary key default gen_random_uuid(),
  fraccion_arancelaria text not null,
  nico text not null,
  descripcion text not null,
  umt text,
  requiere_nom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fraccion_arancelaria, nico)
);

create index on fracciones_ligie (fraccion_arancelaria);

alter table fracciones_ligie enable row level security;

create policy "authenticated full access" on fracciones_ligie for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
