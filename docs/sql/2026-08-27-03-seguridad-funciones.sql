-- Dabi · Seguridad de funciones security definer
-- Aplicado en Supabase el 2026-08-27. Reconstruido desde la conversación.
--
-- Orden de ejecución del día: 01 (alturas) → 02 (contabilidad) → 03 (este).
-- Va al final porque eliminar_matricula consulta facturas y factura_matriculas.
-- plpgsql no valida esas referencias al crear la función, así que crearla antes
-- no da error: falla al ejecutarse.
--
-- Nada de esto era visible desde la aplicación: son agujeros que solo se ven
-- llamando la API directamente. Lo que se encontró:
--
--   1. aplicar_cambios_matricula era invocable por cualquier usuario con sesión
--      y permitía editar matrículas certificadas saltándose la cola de
--      aprobación. Ahora es privada.
--   2. Siete funciones con la trampa del NULL: `v_rol not in (...)` con v_rol
--      nulo devuelve NULL, no true, así que no lanzaba la excepción y seguía de
--      largo. Una cuenta sin fila en profiles pasaba el control de rol.
--   3. aprobar_cambio y rechazar_cambio excluían a director-operaciones y
--      coordinador-procesos, que sí ven los botones en la interfaz (están en
--      PUEDE_APROBAR). Alineados a los seis.
--   4. auditar_factura quedó sin revoke al escribirla — corregido en el 02.
--
-- Pendiente anotado, no hecho: las listas de roles están copiadas en cada
-- función y ya se desincronizaron dos veces. Lo mismo que permisos.js en el
-- frontend se puede hacer en SQL con funciones tipo puede_aprobar().


-- ---------------------------------------------------------------------------
-- 1. aplicar_cambios_matricula — privada
-- ---------------------------------------------------------------------------
-- Es interna: solo deben invocarla editar_matricula y aprobar_cambio, que sí
-- validan rol. No rompe nada porque esas dos son security definer y la llaman
-- con los privilegios del dueño. Lo único que deja de funcionar es llamarla
-- directo desde la API, que es justo lo que se quiere.
--
-- El cuerpo de esta función está en el archivo 01.

revoke all on function public.aplicar_cambios_matricula(bigint, jsonb)
  from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. eliminar_matricula — guardas + bloqueo por factura vigente
-- ---------------------------------------------------------------------------
-- Además de las guardas, aquí se resuelve lo que traía el modelo de facturas:
-- el on delete restrict de factura_matriculas hacía reventar el borrado con un
-- error de clave foránea sin explicación.
--
-- Decisión: si la matrícula solo aparece en facturas anuladas, sí se deja
-- borrar, y esos enlaces se eliminan. Se pierde saber a quiénes cubría aquella
-- factura anulada; la factura, con su número y su rastro en auditoria, queda.

create or replace function public.eliminar_matricula(p_matricula_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_tiene_certificado boolean;
  v_aprendiz_id bigint;
  v_otras_matriculas integer;
  v_factura text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite eliminar matrículas';
  end if;

  select exists(
    select 1 from certificados where matricula_id = p_matricula_id
  ) into v_tiene_certificado;

  if v_tiene_certificado then
    raise exception 'No se puede eliminar: esta matrícula tiene un certificado emitido. Anúlala en su lugar.';
  end if;

  select f.numero into v_factura
  from factura_matriculas fm
  join facturas f on f.id = fm.factura_id
  where fm.matricula_id = p_matricula_id
    and f.estado <> 'anulada'
  limit 1;

  if v_factura is not null then
    raise exception 'No se puede eliminar: este aprendiz está incluido en la factura %. Anula la factura o quítalo de ella primero.', v_factura;
  end if;

  select aprendiz_id into v_aprendiz_id from matriculas where id = p_matricula_id;

  if not found then
    raise exception 'La matrícula no existe';
  end if;

  -- Solo quedan enlaces a facturas anuladas, que ya no cobran nada.
  delete from factura_matriculas where matricula_id = p_matricula_id;

  delete from documentos_matricula where matricula_id = p_matricula_id;
  delete from cambios_pendientes where matricula_id = p_matricula_id;
  delete from matriculas where id = p_matricula_id;

  select count(*) into v_otras_matriculas
  from matriculas where aprendiz_id = v_aprendiz_id;

  return jsonb_build_object(
    'resultado', 'eliminada',
    'aprendiz_sin_matriculas', v_otras_matriculas = 0,
    'aprendiz_id', v_aprendiz_id
  );
end;
$function$;


-- ---------------------------------------------------------------------------
-- 3. eliminar_aprendiz_huerfano
-- ---------------------------------------------------------------------------

create or replace function public.eliminar_aprendiz_huerfano(p_aprendiz_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_matriculas integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite eliminar aprendices';
  end if;

  select count(*) into v_matriculas from matriculas where aprendiz_id = p_aprendiz_id;

  if v_matriculas > 0 then
    raise exception 'No se puede eliminar: este aprendiz tiene % matrícula(s) registrada(s)', v_matriculas;
  end if;

  delete from documentos_aprendiz where aprendiz_id = p_aprendiz_id;
  delete from aprendices where id = p_aprendiz_id;

  return jsonb_build_object('resultado', 'eliminado');
end;
$function$;


-- ---------------------------------------------------------------------------
-- 4. eliminar_empresa
-- ---------------------------------------------------------------------------

create or replace function public.eliminar_empresa(p_empresa_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_matriculas integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite eliminar empresas';
  end if;

  select count(*) into v_matriculas from matriculas where empresa_id = p_empresa_id;

  if v_matriculas > 0 then
    update empresas set activo = false where id = p_empresa_id;
    return jsonb_build_object(
      'resultado', 'desactivada',
      'matriculas', v_matriculas
    );
  end if;

  delete from empresas where id = p_empresa_id;

  if not found then
    raise exception 'La empresa no existe';
  end if;

  return jsonb_build_object('resultado', 'eliminada');
end;
$function$;


-- ---------------------------------------------------------------------------
-- 5. eliminar_grupo
-- ---------------------------------------------------------------------------

create or replace function public.eliminar_grupo(p_grupo_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_matriculas integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite eliminar grupos';
  end if;

  select count(*) into v_matriculas from matriculas where grupo_id = p_grupo_id;

  if v_matriculas > 0 then
    raise exception 'No se puede eliminar: el grupo tiene % aprendiz(ces) matriculado(s). Elimínalos primero.', v_matriculas;
  end if;

  delete from grupos where id = p_grupo_id;

  if not found then
    raise exception 'El grupo no existe';
  end if;

  return jsonb_build_object('resultado', 'eliminado');
end;
$function$;


-- ---------------------------------------------------------------------------
-- 6. reactivar_empresa
-- ---------------------------------------------------------------------------
-- Guardar mi_rol() en variable no solo permite la guarda del nulo: también
-- evita ejecutar la función dos veces.

create or replace function public.reactivar_empresa(p_empresa_id bigint)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  v_rol := mi_rol();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite esta acción';
  end if;

  update empresas set activo = true where id = p_empresa_id;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 7. registrar_cargue_mintrabajo
-- ---------------------------------------------------------------------------

create or replace function public.registrar_cargue_mintrabajo(p_grupo_id bigint, p_id_curso text, p_fecha_cargue date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_id_anterior text;
  v_fecha_anterior date;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','supervisor'
  ) then
    raise exception 'Tu rol no permite registrar cargues';
  end if;

  if p_id_curso is null or trim(p_id_curso) = '' then
    raise exception 'El ID del curso es obligatorio';
  end if;

  select mintrabajo_id_curso, mintrabajo_fecha_cargue
  into v_id_anterior, v_fecha_anterior
  from grupos where id = p_grupo_id;

  if not found then
    raise exception 'El grupo no existe';
  end if;

  perform set_config('dabi.registrando_cargue', 'on', true);

  update grupos set
    mintrabajo_id_curso = trim(p_id_curso),
    mintrabajo_fecha_cargue = coalesce(p_fecha_cargue, current_date),
    mintrabajo_id_anulado = case
      when v_id_anterior is not null and v_id_anterior <> trim(p_id_curso)
      then v_id_anterior else mintrabajo_id_anulado end,
    mintrabajo_fecha_anulado = case
      when v_id_anterior is not null and v_id_anterior <> trim(p_id_curso)
      then v_fecha_anterior else mintrabajo_fecha_anulado end
  where id = p_grupo_id;

  perform set_config('dabi.registrando_cargue', 'off', true);

  return jsonb_build_object(
    'resultado', 'registrado',
    'reemplazo', v_id_anterior is not null and v_id_anterior <> trim(p_id_curso)
  );
end;
$function$;


-- ---------------------------------------------------------------------------
-- 8. aprobar_cambio y rechazar_cambio — los mismos seis roles
-- ---------------------------------------------------------------------------
-- Antes admitían solo cuatro, así que un director de operaciones veía el botón
-- en la pantalla de Aprobación y al pulsarlo recibía "Tu rol no permite...".

create or replace function public.aprobar_cambio(p_cambio_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_cambio record;
  v_actual jsonb;
  v_diff jsonb := '{}'::jsonb;
  v_clave text;
  v_valor_nuevo text;
  v_valor_viejo text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  -- Los mismos seis de PUEDE_APROBAR, iguales a los de rechazar_cambio.
  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite aprobar cambios';
  end if;

  select * into v_cambio from cambios_pendientes where id = p_cambio_id;

  if not found then
    raise exception 'La solicitud de cambio no existe';
  end if;

  if v_cambio.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue resuelta';
  end if;

  select to_jsonb(m) into v_actual from matriculas m where m.id = v_cambio.matricula_id;

  for v_clave in select jsonb_object_keys(v_cambio.cambios)
  loop
    v_valor_nuevo := v_cambio.cambios ->> v_clave;
    v_valor_viejo := v_actual ->> v_clave;

    if v_valor_nuevo is distinct from v_valor_viejo then
      v_diff := v_diff || jsonb_build_object(
        v_clave,
        jsonb_build_object('antes', v_valor_viejo, 'despues', v_valor_nuevo)
      );
    end if;
  end loop;

  perform aplicar_cambios_matricula(v_cambio.matricula_id, v_cambio.cambios);

  update cambios_pendientes set
    estado = 'aprobado',
    resuelto_por = auth.uid(),
    resuelto_en = now()
  where id = p_cambio_id;

  insert into auditoria (tabla, registro_id, accion, cambios, realizado_por, aprobado_por)
  values (
    'matriculas',
    v_cambio.matricula_id,
    'edicion_certificada_aprobada',
    v_diff,
    v_cambio.solicitado_por,
    auth.uid()
  );

  return jsonb_build_object('resultado', 'aprobado');
end;
$function$;

create or replace function public.rechazar_cambio(p_cambio_id bigint, p_motivo text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_estado estado_cambio;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  -- Los mismos seis de PUEDE_APROBAR: quien puede aprobar puede rechazar.
  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','coordinador','supervisor'
  ) then
    raise exception 'Tu rol no permite rechazar cambios';
  end if;

  select estado into v_estado from cambios_pendientes where id = p_cambio_id;

  if not found then
    raise exception 'La solicitud de cambio no existe';
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue resuelta';
  end if;

  update cambios_pendientes set
    estado = 'rechazado',
    resuelto_por = auth.uid(),
    resuelto_en = now(),
    motivo_rechazo = p_motivo
  where id = p_cambio_id;

  return jsonb_build_object('resultado', 'rechazado');
end;
$function$;


-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
-- Lista las security definer que NO tienen la guarda de rol nulo. Marca falsos
-- positivos: mi_rol y verificar_certificado (pública a propósito) y las de
-- trigger no la necesitan.
--
--   select p.proname
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.prosecdef
--     and pg_get_functiondef(p.oid) not like '%v_rol is null%'
--   order by p.proname;
--
-- Y para comparar las listas de roles de dos funciones sin leerlas completas:
--
--   select p.proname,
--          substring(pg_get_functiondef(p.oid) from 'not in \(([^)]*)\)') as roles
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('aprobar_cambio', 'rechazar_cambio');
