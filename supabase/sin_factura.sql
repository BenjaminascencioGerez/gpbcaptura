-- Partidas físicamente presentes pero sin cobertura de factura todavía
-- (se capturan sin No. de Partida, se alinean 1-N contra la factura antes
-- de enviar a facturación; las que quedan sin número necesitan una factura
-- nueva y deben quedar claramente alertadas al final de la lista).

alter table partidas alter column no_partida drop not null;
alter table partidas add column sin_factura boolean not null default false;
