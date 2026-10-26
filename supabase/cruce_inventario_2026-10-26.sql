-- Cruce del inventario físico en bodega (INVENTARIO.xlsx, 26/10/2026) contra previos.
-- Requiere haber corrido antes supabase/inventario_historial.sql.
-- Se corre en el SQL Editor de Supabase en DOS partes (cada una con su Run).
--
-- Datos del Excel completados con Outlook (avisos de recepción y correos de revisión).
-- Correcciones al Excel: GW10535 -> GER10535 (BMD / GBI3515), GBI35577 -> GBI3577,
-- fecha de arribo de GW0542 venía como 176.81 (era 22/10/2026 según el aviso).

-- ===================== PARTE 1: cargar, completar y vista previa =====================

-- Claves comparables de una referencia: separa por "/" (p. ej. "GW0514 / TPIM-0947"),
-- quita espacios, el sufijo de parcialidad (GW0502-1 -> GW0502) y los guiones
-- (PRY-0229 -> PRY0229), en mayúsculas.
create or replace function ref_keys(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(k), '{}') from (
    select replace(regexp_replace(upper(regexp_replace(part, '\s', '', 'g')), '^([A-Z]+[0-9]+)-[0-9]{1,2}$', '\1'), '-', '') k
    from unnest(string_to_array(coalesce(t, ''), '/')) part) s
  where k <> '' $$;

create table inventario_fisico (
  referencia text primary key,
  referencia_cliente text,
  cliente text,
  proveedor text,
  fecha_arribo date,
  fecha_revision date,
  revisor text,
  recibido_por text,
  bultos text,
  peso numeric(12,2),
  fecha_corte date not null default '2026-10-26'
);
alter table inventario_fisico enable row level security;
create policy "authenticated full access" on inventario_fisico for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into inventario_fisico (referencia, referencia_cliente, cliente, proveedor, fecha_arribo, fecha_revision, revisor, recibido_por, bultos, peso) values
  ('GW0543',     'TOIM-0202I',   'CWL MEXICO S DE RL DE CV',         'TRANSOCEAN OFFSHORE DEEPWATER',      '2026-10-22', '2026-10-23', 'Saul Garcia',      'Alejandra Gonzalez', '3',      1572.15),
  ('GW0541',     'TOIM-0200I',   'CWL MEXICO S DE RL DE CV',         'TRANSOCEAN OFFSHORE DEEPWATER',      '2026-10-22', '2026-10-23', 'Saul Garcia',      'Alejandra Gonzalez', '1 DE 3', 2271),
  ('GW0542',     'TOIM-0201I',   'CWL MEXICO S DE RL DE CV',         'TRANSOCEAN OFFSHORE DEEPWATER',      '2026-10-22', null,         null,               'Alejandra Gonzalez', '2',      176.81),
  ('GW0507',     'WSEM-0085I',   'WOODSIDE PETROLEOS',               'WOODSIDE ENERGY (DEEPWATER) INC.',   '2026-10-15', '2026-10-15', null,               'Mayra Treviño',      '7',      5355),
  ('GER10272-1', null,           'HOOL ENERGY DE MEXICO S DE RL',    null,                                 '2026-09-10', null,         null,               'Jorge Duarte',       '5',      null),
  ('GW0493',     'WSEM-00791-2', 'WOODSIDE PETROLEOS',               null,                                 '2026-10-12', null,         null,               'Mayra Treviño',      '1',      3),
  ('GW0441',     'GBI3410-1',    'SSI SUPRIME SERVICE & SPECIALTY',  null,                                 '2026-09-29', null,         null,               'Mayra Treviño',      '1',      600),
  ('GER10292',   null,           'LOS FERTRES AGROINDUSTRIAS',       null,                                 '2026-10-21', null,         null,               'Jorge Duarte',       '2',      1632.93),
  ('GER10544',   'ALSWIM-0011',  'ALLSEAS MARINE CONTRACTOR',        null,                                 '2026-10-15', null,         null,               'Carlos Rueda',       '9',      1484.15),
  ('GER9803',    null,           null,                               null,                                 null,         null,         null,               null,                 '1',      null),
  ('GER8367',    null,           'PROPLASTIKS',                      null,                                 null,         null,         null,               null,                 '1',      null),
  ('GER9200',    null,           'PROPLASTIKS',                      null,                                 null,         null,         null,               null,                 '20',     null),
  ('GBI0727',    null,           'PROPLASTIKS',                      null,                                 null,         null,         null,               null,                 '1',      null),
  ('GER6444',    null,           'PROPLASTIKS',                      null,                                 null,         null,         null,               null,                 '1',      null),
  ('GER10557',   'PRY-0229',     'MANANTIAL PEÑAFIEL',               'DR PEPPER',                          '2026-10-19', null,         null,               'Jorge Duarte',       '3',      1085.45),
  ('GW0502-1',   'GBI3560-1',    'SUBSEA 7 MEXICO',                  null,                                 '2026-10-14', '2026-10-19', 'Guillermo Molina', null,                 '9',      null),
  ('GER10572',   'GBI3577',      'NEW FORTRESS ENERGY',              null,                                 '2026-10-21', '2026-10-23', 'Ricardo Mata',     null,                 null,     null),
  ('GER10589',   'GBI3582',      'MEXICO FLNG S DE RL DE CV',        null,                                 '2026-10-21', '2026-10-26', 'Moises Mendoza',   'Jorge Duarte',       '1',      null),
  ('GER10604',   'GBI3617',      'MEXICO FLNG S DE RL DE CV',        null,                                 null,         null,         null,               'Jorge Duarte',       '14',     null),
  ('GER10590',   'ALSWIM-0023',  'ALLSEAS MARINE CONTRACTOR',        null,                                 '2026-10-21', '2026-10-22', 'Ricardo Mata',     'Alejandra Gonzalez', '4',      785),
  ('GW0437',     null,           'ALLSEAS MARINE CONTRACTOR',        null,                                 '2026-09-28', null,         null,               null,                 '4',      6524),
  ('GW0546',     'WSEM-0091I',   'WOODSIDE PETROLEOS',               'CENTERGENICS LLC',                   '2026-10-23', null,         null,               'Mayra Treviño',      '5',      1587.57),
  ('GER10535',   'GBI3515',      'BMD SERVICES LLC',                 'AZCUE PUMPS & SPARES',               '2026-10-14', null,         null,               'Jorge Duarte',       '1',      116),
  ('GER10542',   'GBI3573',      'AEL ELECTRICAL MEXICO',            'AEL (AMERICAS) INC.',                '2026-10-15', null,         'Moises Mendoza',   'Jorge Duarte',       '4',      null),
  ('GER10477-2', null,           'MEXICO FLNG S DE RL DE CV',        null,                                 '2026-10-16', null,         null,               'Jorge Duarte',       '1',      null),
  ('GER10344',   null,           'OCEANEERING INTERNATIONAL',        null,                                 '2026-09-17', null,         null,               'Mayra Treviño',      '1',      55.79),
  ('GER10605',   'GBI3618',      'MEXICO FLNG S DE RL DE CV',        null,                                 '2026-10-23', null,         null,               'Jorge Duarte',       '1',      null),
  ('GER10600',   'GBI3600',      'LOGISTICA Y SUMINISTROS TRITON',   null,                                 '2026-10-22', '2026-10-26', 'Saul Garcia',      'Mayra Treviño',      '5',      2066);

-- Completa los previos que siguen en bodega (solo campos vacíos).
update previos p set
  referencia_cliente = coalesce(p.referencia_cliente, i.referencia_cliente),
  cliente            = coalesce(p.cliente, i.cliente),
  proveedor          = coalesce(p.proveedor, i.proveedor),
  fecha_arribo       = coalesce(p.fecha_arribo, i.fecha_arribo),
  fecha_revision     = coalesce(p.fecha_revision, i.fecha_revision),
  revisor            = coalesce(p.revisor, i.revisor),
  recibido_por       = coalesce(p.recibido_por, i.recibido_por),
  bultos_inventario  = coalesce(p.bultos_inventario, i.bultos),
  peso_bruto         = coalesce(p.peso_bruto, i.peso)
from inventario_fisico i
where (ref_keys(i.referencia) || ref_keys(i.referencia_cliente))
   && (ref_keys(p.reference) || ref_keys(p.referencia_cliente));

-- VISTA PREVIA: previos en bodega que NO aparecen en el inventario (irían al historial).
-- El Excel no trae GER10606, GER10607, GER10608 ni GER10610 (revisados el 26/10): se excluyen.
select p.reference, p.referencia_cliente, p.cliente, p.status, p.created_at
from previos p
where p.estado = 'en_bodega'
  and upper(p.reference) not in ('GER10606', 'GER10607', 'GER10608', 'GER10610')
  and not exists (
    select 1 from inventario_fisico i
    where (ref_keys(i.referencia) || ref_keys(i.referencia_cliente))
       && (ref_keys(p.reference) || ref_keys(p.referencia_cliente)))
order by p.created_at;

-- ===================== PARTE 2: mover a Historial de previos =====================
-- De la vista previa del 26/10 solo pasan los que tienen aviso de salida en Outlook:
--   TOIM-0196I (orden 804, 16/10), GBI3576, GBI3528 y GER10525 (orden 2521, 22/10).
-- Se quedan en Previos aunque no vengan en el Excel:
--   GW0513 / GW0514 (revisión enviada el 26/10), GBI3571 Stahl (revisión 23/10, sin
--   salida) y GBI3587 Oceaneering (salida parcial; parte se resguarda en bodega).
update previos set estado = 'importado', importado_at = now()
where estado = 'en_bodega'
  and upper(reference) in ('TOIM-0196I', 'GBI3576', 'GBI3528', 'GER10525');
