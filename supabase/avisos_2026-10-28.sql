-- Avisos de recepción y de salida de Outlook del 26 al 28/10/2026.
-- Requiere ref_keys() de supabase/cruce_inventario_2026-10-26.sql.
-- Se corre completo en el SQL Editor de Supabase (un solo Run).

-- 1) Recepciones nuevas que siguen en bodega: se crean si no existe el previo
--    (por RT o referencia del cliente); si ya existe, solo se llenan campos vacíos.
drop table if exists avisos_recepcion, avisos_salida;
create temp table avisos_recepcion (
  reference text, referencia_cliente text, cliente text, proveedor text,
  fecha_arribo date, fecha_revision date, revisor text, recibido_por text, bultos text
);

insert into avisos_recepcion values
  ('GER10610', 'GBI3561',     'CONSTRUCTORA SICIM, S.A. DE C.V.',     'PIPING TECHNOLOGY & PRODUCTS',     '2026-10-26', null,         null,                'Alejandra Gonzalez', '2 PALLETS'),
  ('GW0553',   'TPIM-0959',   'TP OIL & GAS MEXICO S DE RL DE CV',    'FISHER CONTROLS',                  '2026-10-26', null,         null,                'Alejandra Gonzalez', '2 CAJAS'),
  ('GER10613', 'GBI3619',     'MEXICO FLNG S DE RL DE CV',            'NFE FAST LNG OPERATIONS LLC-DE',   '2026-10-26', '2026-10-27', 'Antonio Plasencia', 'Brenda Moral',       '1'),
  ('GER10615', 'GBI3621',     'MEXICO FLNG S DE RL DE CV',            'NFE FAST LNG OPERATIONS LLC-DE',   '2026-10-26', '2026-10-27', 'Antonio Plasencia', 'Brenda Moral',       '1'),
  ('GER10616', 'GBI3622',     'MEXICO FLNG S DE RL DE CV',            'NFE FAST LNG OPERATIONS LLC-DE',   '2026-10-26', '2026-10-27', 'Antonio Plasencia', 'Brenda Moral',       '3'),
  ('GW0554',   'GBI3638',     'SUBSEA 7 MEXICO S DE RL DE CV',        'INSTRUMENT REPAIR & CALIBRATION',  '2026-10-27', null,         null,                'Alejandra Gonzalez', '1 BOX'),
  ('GER10623', 'GBI3643',     'PROPLASTIKS MANUFACTURING SA DE CV',   'COMPOSITES ONE',                   '2026-10-27', null,         null,                'Alejandra Gonzalez', '1 PALLET'),
  ('GER10633', 'ALSWIM-0028', 'ALLSEAS MARINE CONTRACTOR',            'BLUEMARINE OFFSHORE YARD',         '2026-10-28', null,         null,                'Alejandra Gonzalez', '1 PALLET'),
  ('GER10634', 'ALSWIM-0029', 'ALLSEAS MARINE CONTRACTOR',            'BLUEMARINE OFFSHORE',              '2026-10-28', null,         null,                'Alejandra Gonzalez', '1 PALLET');

update previos p set
  referencia_cliente = coalesce(p.referencia_cliente, a.referencia_cliente),
  cliente            = coalesce(p.cliente, a.cliente),
  proveedor          = coalesce(p.proveedor, a.proveedor),
  fecha_arribo       = coalesce(p.fecha_arribo, a.fecha_arribo),
  fecha_revision     = coalesce(p.fecha_revision, a.fecha_revision),
  revisor            = coalesce(p.revisor, a.revisor),
  recibido_por       = coalesce(p.recibido_por, a.recibido_por),
  bultos_inventario  = coalesce(p.bultos_inventario, a.bultos)
from avisos_recepcion a
where (ref_keys(a.reference) || ref_keys(a.referencia_cliente))
   && (ref_keys(p.reference) || ref_keys(p.referencia_cliente));

insert into previos (reference, referencia_cliente, cliente, proveedor, fecha, fecha_arribo,
                     fecha_revision, revisor, recibido_por, bultos_inventario)
select a.reference, a.referencia_cliente, a.cliente, a.proveedor, a.fecha_arribo, a.fecha_arribo,
       a.fecha_revision, a.revisor, a.recibido_por, a.bultos
from avisos_recepcion a
where not exists (
  select 1 from previos p
  where (ref_keys(a.reference) || ref_keys(a.referencia_cliente))
     && (ref_keys(p.reference) || ref_keys(p.referencia_cliente)));

-- 2) Avisos de salida: pasan a Historial de previos (importado) con la fecha de salida.
create temp table avisos_salida (reference text, referencia_cliente text, orden text, fecha_salida date);

insert into avisos_salida values
  ('GER10542', 'GBI3573',     '2527',   '2026-10-26'),
  ('GER10558', null,          '2527',   '2026-10-26'),
  ('GER10569', 'GBI3573',     '2527',   '2026-10-26'),
  ('GER10608', 'GBI3308',     '2528',   '2026-10-26'),
  ('GER10609', 'GBI3308',     '2529',   '2026-10-26'),
  ('GER10607', 'GBI3628',     '2530',   '2026-10-26'),
  ('GW0551',   'TOIM-0204I',  '819',    '2026-10-26'),
  ('GER10606', null,          '2531',   '2026-10-26'),
  ('GER10618', 'GBI3640',     '2532',   '2026-10-26'),
  ('GW0507',   'WSEM-0085I',  '820',    '2026-10-27'),
  ('GW0555',   'TOIM-0205I',  '822',    '2026-10-27'),
  ('GER10628', 'ALSWIM-0006', '2533',   '2026-10-27'),
  ('GER10544', 'ALSWIM-0011', '2533',   '2026-10-27'),
  ('GER10611', 'ALSWIM-0021', '2533',   '2026-10-27'),
  ('GER10611-1', 'ALSWIM-0021-1', '2533', '2026-10-27'),
  ('GER10590', 'ALSWIM-0023', '2533',   '2026-10-27'),
  ('GER10590-1', 'ALSWIM-0023-1', '2533', '2026-10-27'),
  ('GER10561', 'GBI3596',     'Border', '2026-10-27');

update previos p set estado = 'importado', importado_at = s.fecha_salida::timestamptz
from avisos_salida s
where p.estado = 'en_bodega'
  and (ref_keys(s.reference) || ref_keys(s.referencia_cliente))
   && (ref_keys(p.reference) || ref_keys(p.referencia_cliente));

-- 3) Resultado: cada salida con el previo que movió (vacío = no había previo en el sistema).
select s.orden, s.reference, s.referencia_cliente, p.reference as previo, p.estado
from avisos_salida s
left join previos p
  on (ref_keys(s.reference) || ref_keys(s.referencia_cliente))
  && (ref_keys(p.reference) || ref_keys(p.referencia_cliente))
order by s.fecha_salida, s.orden;
