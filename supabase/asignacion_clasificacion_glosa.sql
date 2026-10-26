-- Envío del previo a clasificación y a glosa con la persona asignada.
-- Se guarda también el nombre para mostrarlo en listas sin consultar auth.users.
alter table previos add column clasificador_id uuid references auth.users(id);
alter table previos add column clasificador_nombre text;
alter table previos add column enviado_clasificacion_at timestamptz;
alter table previos add column enviado_clasificacion_by uuid references auth.users(id);
alter table previos add column glosador_id uuid references auth.users(id);
alter table previos add column glosador_nombre text;
alter table previos add column enviado_glosa_at timestamptz;
alter table previos add column enviado_glosa_by uuid references auth.users(id);
