-- Un previo puede traer varias facturas: cada partida guarda de cuál viene.
-- Se toma del nombre de la hoja del Excel (FACT-1456 -> 1456). Una partida se
-- identifica por factura + No. de partida (cada factura empieza en 1).
-- Las partidas existentes quedan con factura vacía y se ven como antes.
alter table partidas add column factura text;
