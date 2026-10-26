-- Flujo: revisión física → clasificación → confirmación de fracciones →
-- documentación (Ejecutivos) → glosa (Glosador) → facturación.

-- Glosa final del pedimento (después de documentación).
alter table previos add column glosa_final_id uuid references auth.users(id);
alter table previos add column glosa_final_nombre text;
alter table previos add column enviado_glosa_final_at timestamptz;
alter table previos add column enviado_glosa_final_by uuid references auth.users(id);
alter table previos add column glosado_final_at timestamptz;
alter table previos add column glosado_final_by uuid references auth.users(id);

-- El Super Admin puede adelantar o regresar la etapa de un previo aunque no
-- esté completo. Mientras etapa_manual tenga valor, esa es la etapa del previo;
-- cualquier envío normal del flujo la limpia.
alter table previos add column etapa_manual text
  check (etapa_manual in ('revision_fisica', 'clasificacion', 'glosa', 'documentacion', 'glosa_final'));
