insert into public.permisos (codigo, nombre, descripcion, modulo)
values
  ('usuarios.suspender_administrador', 'Desactivar administradores', 'Permite al superusuario desactivar cuentas de administradores sin eliminar su historial.', 'usuarios'),
  ('usuarios.reactivar_administrador', 'Reactivar administradores', 'Permite al superusuario reactivar cuentas de administradores.', 'usuarios')
on conflict (codigo) do nothing;

insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join public.permisos p
where r.codigo = 'superusuario'
  and p.codigo in ('usuarios.suspender_administrador', 'usuarios.reactivar_administrador')
on conflict do nothing;;
