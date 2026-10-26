-- Cruce del inventario físico en bodega (INVENTARIO.xlsx, 26/10/2026) contra previos.
-- Requiere haber corrido antes supabase/inventario_historial.sql.
--
-- Datos del Excel completados con Outlook (avisos de recepción y correos de revisión):
--   * GBI/TOIM/WSEM/ALSWIM/PRY: del asunto "AVISO DE RECEPCIÓN ... NO.: GERxxxx / <ref cliente>"
--   * Fecha de revisión / revisor: primer correo "REVISION ..." con la revisión adjunta.
-- Correcciones al Excel: GW10535 -> GER10535 (BMD / GBI3515), GBI35577 -> GBI3577,
-- fecha de arribo de GW0542 venía como 176.81 (era 22/10/2026 según el aviso).
--
-- Corre los pasos en orden. El paso 3 es solo vista previa; revísala antes del 4.

-- 1) Inventario en tabla temporal -------------------------------------------------
create temp table inventario (
  referencia text primary key,
  referencia_cliente text,
  cliente text,
  proveedor text,
  fecha_arribo date,
  fecha_revision date,
  revisor text,
  recibido_por text,
  bultos text,
  peso numeric(12,2)
);

insert into inventario values
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

-- Normaliza: mayúsculas, sin espacios y sin sufijo de parcialidad (-1, -2).
create or replace function pg_temp.ref_norm(t text) returns text
  language sql immutable as $$ select nullif(regexp_replace(upper(replace(coalesce(t, ''), ' ', '')), '-\d+$', ''), '') $$;

-- Previo <-> renglón de inventario, por cualquiera de las dos referencias.
create temp view cruce as
select p.id as previo_id, i.*
from previos p
join inventario i
  on pg_temp.ref_norm(i.referencia) in (pg_temp.ref_norm(p.reference), pg_temp.ref_norm(p.referencia_cliente))
  or (i.referencia_cliente is not null
      and pg_temp.ref_norm(i.referencia_cliente) in (pg_temp.ref_norm(p.reference), pg_temp.ref_norm(p.referencia_cliente)));

-- 2) Completa los previos que siguen en bodega (solo campos vacíos) --------------
update previos p set
  referencia_cliente = coalesce(p.referencia_cliente, c.referencia_cliente),
  cliente            = coalesce(p.cliente, c.cliente),
  proveedor          = coalesce(p.proveedor, c.proveedor),
  fecha_arribo       = coalesce(p.fecha_arribo, c.fecha_arribo),
  fecha_revision     = coalesce(p.fecha_revision, c.fecha_revision),
  revisor            = coalesce(p.revisor, c.revisor),
  recibido_por       = coalesce(p.recibido_por, c.recibido_por),
  bultos_inventario  = coalesce(p.bultos_inventario, c.bultos),
  peso_bruto         = coalesce(p.peso_bruto, c.peso)
from cruce c
where c.previo_id = p.id;

-- Si está en inventario y no se ha enviado a facturación, se queda en Previos.
update previos set estado = 'en_bodega', importado_at = null
where status = 'draft' and estado = 'importado' and id in (select previo_id from cruce);

-- 3) VISTA PREVIA: previos en bodega que NO aparecen en el inventario ------------
-- OJO: el Excel no trae GER10606, GER10607, GER10608 ni GER10610 (sus revisiones
-- llegaron el 26/10); si existen como previo saldrán aquí aunque sigan en bodega.
select p.reference, p.referencia_cliente, p.cliente, p.status, p.created_at
from previos p
where p.estado = 'en_bodega'
  and p.id not in (select previo_id from cruce)
order by p.created_at;

-- 4) Mover a Historial de previos (correr después de revisar el paso 3) ----------
-- Agrega en el NOT IN las referencias de la vista previa que sí sigan en bodega.
update previos set estado = 'importado', importado_at = now()
where estado = 'en_bodega'
  and id not in (select previo_id from cruce)
  and upper(reference) not in ('GER10606', 'GER10607', 'GER10608', 'GER10610');
