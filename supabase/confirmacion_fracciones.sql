-- Confirmación de fracciones (antes "glosa") y envío a documentación.
-- Quien confirma puede pedir más información o regresar la partida al clasificador.
alter table partidas add column revision_estado text
  check (revision_estado in ('info_solicitada', 'devuelta'));
alter table partidas add column revision_nota text;
alter table partidas add column revision_by uuid references auth.users(id);
alter table partidas add column revision_at timestamptz;

alter table previos add column enviado_documentacion_at timestamptz;
alter table previos add column enviado_documentacion_by uuid references auth.users(id);
