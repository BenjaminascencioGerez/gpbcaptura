-- Un previo puede traer varias facturas: cada partida guarda de cuál viene.
-- Se toma del nombre de la hoja del Excel (FACT-1456 -> 1456). Una partida se
-- identifica por factura + No. de partida (cada factura empieza en 1).
-- Las partidas existentes quedan con factura vacía y se ven como antes.
alter table partidas add column factura text;

-- La base tenía unique (previo_id, no_partida), que impide la partida 1 de una
-- segunda factura. Se reemplaza por previo + factura + No. de partida; las
-- partidas sin factura siguen sin poder repetir número (coalesce), y las sin
-- No. de partida (sin_factura) pueden ser varias porque no_partida es null.
-- Puede existir como constraint o como índice único según cómo se creó.
alter table partidas drop constraint if exists partidas_previo_no_partida_unique;
drop index if exists partidas_previo_no_partida_unique;
create unique index if not exists partidas_previo_factura_no_partida_unique
  on partidas (previo_id, coalesce(factura, ''), no_partida);
