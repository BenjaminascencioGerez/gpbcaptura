-- Etapa "Sin documentos": la mercancía está en bodega pero faltan documentos
-- comerciales (factura, packing list…). Mientras esté marcado, esa es la etapa
-- del previo; al recibirlos se desmarca y sigue su flujo normal.
alter table previos add column sin_documentos boolean not null default false;
alter table previos add column sin_documentos_nota text;
alter table previos add column sin_documentos_at timestamptz;
