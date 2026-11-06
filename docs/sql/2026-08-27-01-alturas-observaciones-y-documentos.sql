-- Dabi · Alturas — observaciones, documento "Otro" y limpieza de cargos
-- Aplicado en Supabase el 2026-08-27. Reconstruido desde la conversación.
--
-- Orden de ejecución del día: 01 (este) → 02 (contabilidad) → 03 (seguridad).
-- Todo el archivo es idempotente: se puede volver a correr completo.
--
-- Origen: revisión de un operario (sexo en el CSV del ministerio, semántica
-- del certificado SENA, falta de un espacio "Otro" para archivos) más la
-- necesidad de un campo libre de observaciones por matrícula.


-- ---------------------------------------------------------------------------
-- 1. Enum de tipos de documento de matrícula
-- ---------------------------------------------------------------------------
-- Agregar valores a un enum tiene reglas propias sobre transacciones: va solo,
-- en su propia ejecución, antes que el resto del archivo.

alter type tipo_documento_matricula add value if not exists 'otro';


-- ---------------------------------------------------------------------------
-- 2. Observaciones de la matrícula
-- ---------------------------------------------------------------------------

alter table matriculas add column if not exists observaciones text;


-- ---------------------------------------------------------------------------
-- 3. crear_o_encontrar_cargo — sobra la versión de un parámetro
-- ---------------------------------------------------------------------------
-- Existían las dos firmas, (text) y (text, boolean), así que la llamada desde
-- el frontend era ambigua. La de dos es estrictamente mejor: corta la búsqueda
-- de similares cuando p_forzar viene en true, que es lo que hace funcionar el
-- botón "Aun así, crear".
--
-- Ojo: el umbral de similitud de la que queda es 0.55, no el 0.62 de la vieja.

drop function if exists public.crear_o_encontrar_cargo(text);

revoke execute on function public.crear_o_encontrar_cargo(text, boolean) from public, anon;
grant execute on function public.crear_o_encontrar_cargo(text, boolean) to authenticated;


-- ---------------------------------------------------------------------------
-- 4. faltantes_matriculas — la marca de SENA justifica el archivo ausente
-- ---------------------------------------------------------------------------

create or replace function public.faltantes_matriculas(p_ids bigint[])
 returns table(matricula_id bigint, faltantes text[])
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare
  r record;
  v_faltan text[];
begin
  for r in
    select
      m.id,
      m.aprendiz_id,
      m.empresa_id, m.arl_id, m.eps_id, m.area_id, m.cargo_id, m.sector_id,
      m.fecha_arl, m.fecha_examen,
      a.sexo, a.rh, a.fecha_nacimiento, a.nivel_educativo_id, a.pais,
      c.requiere_certificado_previo
    from matriculas m
    join aprendices a on a.id = m.aprendiz_id
    join grupos g on g.id = m.grupo_id
    join cursos c on c.id = g.curso_id
    where m.id = any(p_ids)
  loop
    v_faltan := array[]::text[];

    if r.empresa_id is null then v_faltan := array_append(v_faltan, 'Empresa'); end if;
    if r.area_id is null then v_faltan := array_append(v_faltan, 'Área'); end if;
    if r.cargo_id is null then v_faltan := array_append(v_faltan, 'Cargo'); end if;
    if r.sector_id is null then v_faltan := array_append(v_faltan, 'Sector'); end if;
    if r.arl_id is null then v_faltan := array_append(v_faltan, 'ARL'); end if;
    if r.fecha_arl is null then v_faltan := array_append(v_faltan, 'Fecha de ARL'); end if;
    if r.eps_id is null then v_faltan := array_append(v_faltan, 'EPS'); end if;
    if r.fecha_examen is null then v_faltan := array_append(v_faltan, 'Examen médico'); end if;

    if r.sexo is null then v_faltan := array_append(v_faltan, 'Sexo'); end if;
    if r.rh is null then v_faltan := array_append(v_faltan, 'RH'); end if;
    if r.fecha_nacimiento is null then v_faltan := array_append(v_faltan, 'Fecha de nacimiento'); end if;
    if r.nivel_educativo_id is null then v_faltan := array_append(v_faltan, 'Nivel educativo'); end if;
    if r.pais is null or r.pais = '' then v_faltan := array_append(v_faltan, 'País'); end if;

    if not exists (
      select 1 from documentos_aprendiz da
      where da.aprendiz_id = r.aprendiz_id and da.tipo = 'cedula' and da.archivo_path is not null
    ) then
      v_faltan := array_append(v_faltan, 'Archivo: cédula');
    end if;

    -- es_sena justifica la ausencia del archivo: el certificado del SENA no se
    -- entrega como documento, marcarlo es la constancia de por qué no está.
    if r.requiere_certificado_previo and not exists (
      select 1 from documentos_aprendiz da
      where da.aprendiz_id = r.aprendiz_id
        and da.tipo = 'certificado_previo'
        and (da.archivo_path is not null or da.matricula_respaldo_id is not null or da.es_sena)
    ) then
      v_faltan := array_append(v_faltan, 'Archivo: certificado previo');
    end if;

    if not exists (
      select 1 from documentos_matricula dm where dm.matricula_id = r.id and dm.tipo = 'arl'
    ) then
      v_faltan := array_append(v_faltan, 'Archivo: ARL');
    end if;

    if not exists (
      select 1 from documentos_matricula dm where dm.matricula_id = r.id and dm.tipo = 'eps'
    ) then
      v_faltan := array_append(v_faltan, 'Archivo: EPS');
    end if;

    if not exists (
      select 1 from documentos_matricula dm where dm.matricula_id = r.id and dm.tipo = 'examen_medico'
    ) then
      v_faltan := array_append(v_faltan, 'Archivo: examen médico');
    end if;

    if array_length(v_faltan, 1) > 0 then
      matricula_id := r.id;
      faltantes := v_faltan;
      return next;
    end if;
  end loop;

  return;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 5. aprendices_por_empresa — búsqueda por apellido primero
-- ---------------------------------------------------------------------------
-- nombre_invertido va antes de "cursos", y create or replace view no permite
-- insertar una columna en medio: hay que borrar la vista primero.

drop view if exists aprendices_por_empresa;

create view aprendices_por_empresa
with (security_invoker = on) as
select
  m.empresa_id,
  a.id as aprendiz_id,
  a.tipo_documento,
  a.numero_documento,
  a.nombres,
  a.apellidos,
  a.nombres || ' ' || a.apellidos as nombre_completo,
  a.apellidos || ' ' || a.nombres as nombre_invertido,
  count(*) as cursos
from matriculas m
join aprendices a on a.id = m.aprendiz_id
group by
  m.empresa_id, a.id, a.tipo_documento,
  a.numero_documento, a.nombres, a.apellidos;


-- ---------------------------------------------------------------------------
-- 6. aplicar_cambios_matricula — observaciones en la lista blanca
-- ---------------------------------------------------------------------------
-- El update enumera las columnas a mano: sin agregarla aquí, editar_matricula
-- habría devuelto "aplicado" sin guardar nada.
--
-- Los permisos de esta función se cierran en el archivo 03: es interna y solo
-- la deben invocar editar_matricula y aprobar_cambio.

create or replace function public.aplicar_cambios_matricula(p_matricula_id bigint, p_cambios jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  perform set_config('dabi.editando_certificada', 'on', true);

  update matriculas set
    empresa_id = coalesce((p_cambios ->> 'empresa_id')::bigint, empresa_id),
    arl_id = case when p_cambios ? 'arl_id'
                  then nullif(p_cambios ->> 'arl_id', '')::bigint
                  else arl_id end,
    eps_id = case when p_cambios ? 'eps_id'
                  then nullif(p_cambios ->> 'eps_id', '')::bigint
                  else eps_id end,
    area_id = case when p_cambios ? 'area_id'
                   then nullif(p_cambios ->> 'area_id', '')::bigint
                   else area_id end,
    cargo_id = case when p_cambios ? 'cargo_id'
                    then nullif(p_cambios ->> 'cargo_id', '')::bigint
                    else cargo_id end,
    sector_id = case when p_cambios ? 'sector_id'
                     then nullif(p_cambios ->> 'sector_id', '')::bigint
                     else sector_id end,
    fecha_arl = case when p_cambios ? 'fecha_arl'
                     then nullif(p_cambios ->> 'fecha_arl', '')::date
                     else fecha_arl end,
    fecha_examen = case when p_cambios ? 'fecha_examen'
                        then nullif(p_cambios ->> 'fecha_examen', '')::date
                        else fecha_examen end,
    observaciones = case when p_cambios ? 'observaciones'
                         then nullif(p_cambios ->> 'observaciones', '')
                         else observaciones end,
    grupo_id = coalesce((p_cambios ->> 'grupo_id')::bigint, grupo_id),
    estado = coalesce((p_cambios ->> 'estado')::estado_matricula, estado)
  where id = p_matricula_id;

  perform set_config('dabi.editando_certificada', 'off', true);
end;
$function$;


-- ---------------------------------------------------------------------------
-- 7. editar_matricula — separa lo que sale en el certificado de lo que no
-- ---------------------------------------------------------------------------
-- Antes, cambiar solo las observaciones de una matrícula certificada mandaba
-- la matrícula entera a la cola de aprobación. Las observaciones son una nota
-- interna: no invalidan el certificado, así que se aplican directo y se
-- auditan con su propia acción.

create or replace function public.editar_matricula(p_matricula_id bigint, p_cambios jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_certificada boolean;
  v_actual jsonb;
  v_clave text;
  v_valor_nuevo text;
  v_valor_viejo text;
  v_puede_directo boolean;

  -- Campos que no salen en el certificado: se aplican siempre directo, sin
  -- importar el rol ni si la matrícula está certificada. Se auditan igual.
  v_neutros constant text[] := array['observaciones'];

  v_diff_neutros jsonb := '{}'::jsonb;
  v_nuevos_neutros jsonb := '{}'::jsonb;
  v_diff_sensibles jsonb := '{}'::jsonb;
  v_nuevos_sensibles jsonb := '{}'::jsonb;
begin
  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null then
    raise exception 'No se pudo determinar tu rol';
  end if;

  if v_rol not in ('admin','gerente-general','coordinador','supervisor','auxiliar-admin') then
    raise exception 'Tu rol no permite editar matrículas';
  end if;

  select to_jsonb(m) into v_actual from matriculas m where m.id = p_matricula_id;

  if v_actual is null then
    raise exception 'La matrícula no existe';
  end if;

  select exists(
    select 1 from certificados
    where matricula_id = p_matricula_id and estado = 'vigente'
  ) into v_certificada;

  for v_clave in select jsonb_object_keys(p_cambios)
  loop
    v_valor_nuevo := p_cambios ->> v_clave;
    v_valor_viejo := v_actual ->> v_clave;

    if v_valor_nuevo is distinct from v_valor_viejo then
      if v_clave = any(v_neutros) then
        v_diff_neutros := v_diff_neutros || jsonb_build_object(
          v_clave, jsonb_build_object('antes', v_valor_viejo, 'despues', v_valor_nuevo)
        );
        v_nuevos_neutros := v_nuevos_neutros || jsonb_build_object(v_clave, p_cambios -> v_clave);
      else
        v_diff_sensibles := v_diff_sensibles || jsonb_build_object(
          v_clave, jsonb_build_object('antes', v_valor_viejo, 'despues', v_valor_nuevo)
        );
        v_nuevos_sensibles := v_nuevos_sensibles || jsonb_build_object(v_clave, p_cambios -> v_clave);
      end if;
    end if;
  end loop;

  if v_diff_neutros = '{}'::jsonb and v_diff_sensibles = '{}'::jsonb then
    return jsonb_build_object('resultado', 'sin_cambios');
  end if;

  if v_diff_neutros <> '{}'::jsonb then
    perform aplicar_cambios_matricula(p_matricula_id, v_nuevos_neutros);

    insert into auditoria (tabla, registro_id, accion, cambios, realizado_por)
    values ('matriculas', p_matricula_id, 'edicion_observaciones', v_diff_neutros, auth.uid());
  end if;

  if v_diff_sensibles = '{}'::jsonb then
    return jsonb_build_object('resultado', 'aplicado');
  end if;

  if not v_certificada then
    perform aplicar_cambios_matricula(p_matricula_id, v_nuevos_sensibles);
    return jsonb_build_object('resultado', 'aplicado');
  end if;

  v_puede_directo := v_rol in ('admin','gerente-general','coordinador','supervisor');

  if v_puede_directo then
    perform aplicar_cambios_matricula(p_matricula_id, v_nuevos_sensibles);

    insert into auditoria (tabla, registro_id, accion, cambios, realizado_por, aprobado_por)
    values ('matriculas', p_matricula_id, 'edicion_certificada', v_diff_sensibles, auth.uid(), auth.uid());

    return jsonb_build_object('resultado', 'aplicado_con_auditoria');
  else
    insert into cambios_pendientes (matricula_id, cambios, solicitado_por)
    values (p_matricula_id, v_nuevos_sensibles, auth.uid());

    return jsonb_build_object('resultado', 'pendiente_aprobacion');
  end if;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 8. registrar_matricula — parámetro 20: observaciones
-- ---------------------------------------------------------------------------
-- Cambia la firma, así que hay que borrar antes de crear: con las dos
-- versiones vivas la llamada se vuelve ambigua, igual que pasó con
-- crear_o_encontrar_cargo. Corre el drop y el create en la misma ejecución —
-- mientras la función no exista, registrar matrículas queda roto.

drop function if exists public.registrar_matricula(
  tipo_documento, text, text, text, sexo_aprendiz, text, date, bigint, rh_sangre,
  bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, bigint
);

create or replace function public.registrar_matricula(
  p_tipo_documento tipo_documento,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_sexo sexo_aprendiz,
  p_pais text,
  p_fecha_nacimiento date,
  p_nivel_educativo_id bigint,
  p_rh rh_sangre,
  p_grupo_id bigint,
  p_empresa_id bigint,
  p_arl_id bigint,
  p_eps_id bigint,
  p_area_id bigint,
  p_cargo_id bigint,
  p_fecha_arl date,
  p_fecha_examen date,
  p_fecha_ingreso date,
  p_sector_id bigint default null,
  p_observaciones text default null
)
 returns bigint
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_aprendiz_id bigint;
  v_matricula_id bigint;
begin
  select id into v_aprendiz_id
  from aprendices
  where tipo_documento = p_tipo_documento
    and numero_documento = p_numero_documento;

  if v_aprendiz_id is null then
    insert into aprendices (
      tipo_documento, numero_documento, nombres, apellidos,
      sexo, pais, fecha_nacimiento, nivel_educativo_id, rh
    )
    values (
      p_tipo_documento, p_numero_documento, p_nombres, p_apellidos,
      p_sexo, p_pais, p_fecha_nacimiento, p_nivel_educativo_id, p_rh
    )
    returning id into v_aprendiz_id;
  else
    update aprendices set
      nombres = p_nombres,
      apellidos = p_apellidos,
      sexo = p_sexo,
      pais = p_pais,
      fecha_nacimiento = p_fecha_nacimiento,
      nivel_educativo_id = p_nivel_educativo_id,
      rh = p_rh
    where id = v_aprendiz_id;
  end if;

  insert into matriculas (
    grupo_id, aprendiz_id, empresa_id,
    arl_id, eps_id, area_id, cargo_id, sector_id,
    fecha_arl, fecha_examen, fecha_ingreso, observaciones
  )
  values (
    p_grupo_id, v_aprendiz_id, p_empresa_id,
    p_arl_id, p_eps_id, p_area_id, p_cargo_id, p_sector_id,
    p_fecha_arl, p_fecha_examen, p_fecha_ingreso, nullif(p_observaciones, '')
  )
  returning id into v_matricula_id;

  return v_matricula_id;
end;
$function$;

revoke execute on function public.registrar_matricula(
  tipo_documento, text, text, text, sexo_aprendiz, text, date, bigint, rh_sangre,
  bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, bigint, text
) from public, anon;

grant execute on function public.registrar_matricula(
  tipo_documento, text, text, text, sexo_aprendiz, text, date, bigint, rh_sangre,
  bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, bigint, text
) to authenticated;
