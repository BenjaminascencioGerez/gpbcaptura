-- Roles del flujo nuevo. Correr primero la consulta de vista previa.
-- Vista previa: quién tiene qué rol hoy.
select u.email, r.role from user_roles r join auth.users u on u.id = r.user_id order by r.role, u.email;

-- Ana Cruz y Jorge Zarate confirman fracciones: rol Clasificador (igual que Jorge Garza).
update user_roles set role = 'clasificador'
where role not in ('administrador', 'super_admin')
  and user_id in (
    select id from auth.users
    where email ilike 'ana.cruz@%' or email ilike '%zarate%@%' or email ilike 'jorge.garza@%'
  );

-- Los demás Glosadores pasan a Ejecutivo (documentación); Jazmín es la única Glosadora.
update user_roles set role = 'ejecutivo'
where role = 'glosador'
  and user_id not in (select id from auth.users where email = 'jazmin.garnica@grupogerez.com');

insert into user_roles (user_id, role)
select id, 'glosador' from auth.users where email = 'jazmin.garnica@grupogerez.com'
on conflict (user_id) do update set role = 'glosador';
