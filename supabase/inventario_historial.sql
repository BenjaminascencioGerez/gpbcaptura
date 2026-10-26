-- Datos del inventario de material físico en bodega + estado del previo.
-- "En bodega" se lista en Previos; "Importado" (al enviar a facturación o
-- marcado a mano cuando ya salió de inventario) se lista en Historial de previos
-- y puede regresarse a Previos.

alter table previos add column referencia_cliente text; -- GBI / TOIM / TPIM
alter table previos add column proveedor text;
alter table previos add column fecha_arribo date;
alter table previos add column fecha_revision date;
alter table previos add column revisor text;
alter table previos add column recibido_por text;
alter table previos add column bultos_inventario text; -- tal cual viene en inventario ("3", "1 DE 3")
alter table previos add column estado text not null default 'en_bodega'
  check (estado in ('en_bodega', 'importado'));
alter table previos add column importado_at timestamptz;

-- Los que ya se enviaron a facturación pasan directo al historial.
update previos set estado = 'importado', importado_at = sent_to_facturacion_at
  where status = 'sent';

create index on previos (estado);
create index on previos (referencia_cliente);
