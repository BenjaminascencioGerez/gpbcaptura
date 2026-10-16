-- Reglas de negocio y trazabilidad para comercio exterior.

-- Evita duplicar el mismo No. de Referencia (GBI) entre previos.
alter table previos add constraint previos_reference_unique unique (reference);

-- Historial de cambios a clasificación arancelaria después de que una partida
-- ya fue clasificada o glosada (trazabilidad exigida en comercio exterior).
create table partida_audit_log (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references partidas(id) on delete cascade,
  changed_by uuid references auth.users(id),
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index on partida_audit_log (partida_id);

alter table partida_audit_log enable row level security;

create policy "authenticated full access" on partida_audit_log for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function log_partida_classification_change()
returns trigger as $$
begin
  if old.classification_status = 'clasificado' or old.glosado = true then
    if old.fraccion_arancelaria is distinct from new.fraccion_arancelaria then
      insert into partida_audit_log (partida_id, changed_by, field, old_value, new_value)
      values (new.id, new.clasificado_by, 'fraccion_arancelaria', old.fraccion_arancelaria, new.fraccion_arancelaria);
    end if;
    if old.nico is distinct from new.nico then
      insert into partida_audit_log (partida_id, changed_by, field, old_value, new_value)
      values (new.id, new.clasificado_by, 'nico', old.nico, new.nico);
    end if;
    if old.aplica_ma is distinct from new.aplica_ma then
      insert into partida_audit_log (partida_id, changed_by, field, old_value, new_value)
      values (new.id, new.clasificado_by, 'aplica_ma', old.aplica_ma, new.aplica_ma);
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger partidas_log_classification_change
  before update on partidas
  for each row execute function log_partida_classification_change();
