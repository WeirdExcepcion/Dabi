-- Dabi · Contabilidad — función diligenciar_matricula
-- Pendiente de correr en Supabase (va después de 2026-10-08-01).
--
-- Es el corazón del flujo: Alturas registra al aprendiz, Contabilidad lo ve
-- aparecer en su registro diario y lo "diligencia" — número de factura, valor,
-- estado de pago.
--
-- Por qué una función y no escribir desde el cliente: diligenciar son tres o
-- cuatro escrituras (buscar o crear la factura, poner el renglón, actualizar el
-- pago) que tienen que pasar todas o ninguna. Hechas una por una desde el
-- navegador, un corte de red a mitad deja una factura creada sin aprendiz, o un
-- aprendiz facturado con el pago a medias. Aquí van en una sola transacción, con
-- una sola lista de roles y mensajes de error que la pantalla puede mostrar tal
-- cual.


create or replace function public.diligenciar_matricula(
  p_matricula_id bigint,
  p_numero text,
  p_valor_sin_iva numeric,
  p_estado_pago estado_pago default 'no_pago',
  p_fecha_pago date default null,
  p_entidad_bancaria text default null,
  p_observaciones text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol rol_usuario;
  v_numero text;
  v_empresa_id bigint;
  v_estado_matricula estado_matricula;
  v_factura record;
  v_anterior record;
  v_creada boolean := false;
  v_fecha_pago date;
  v_total integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select rol into v_rol from profiles where id = auth.uid();

  if v_rol is null or v_rol not in (
    'admin','gerente-general','director-operaciones',
    'coordinador-procesos','contable','auxiliar-cont'
  ) then
    raise exception 'Tu rol no permite diligenciar facturación';
  end if;

  v_numero := trim(coalesce(p_numero, ''));

  if v_numero = '' then
    raise exception 'El número de factura es obligatorio';
  end if;

  if p_valor_sin_iva is null or p_valor_sin_iva < 0 then
    raise exception 'El valor sin IVA debe ser un número positivo';
  end if;

  select empresa_id, estado into v_empresa_id, v_estado_matricula
  from matriculas where id = p_matricula_id;

  if not found then
    raise exception 'La matrícula no existe';
  end if;

  if v_estado_matricula = 'anulado' then
    raise exception 'Esta matrícula está anulada: no se puede facturar';
  end if;

  if v_empresa_id is null then
    raise exception 'Esta matrícula no tiene empresa asignada. Alturas debe completarla antes de facturar.';
  end if;

  -- El pago es de la factura, no del aprendiz. Sin pago no hay fecha de pago.
  if p_estado_pago = 'pago' then
    v_fecha_pago := coalesce(p_fecha_pago, current_date);
  else
    v_fecha_pago := null;
  end if;

  select * into v_factura from facturas where numero = v_numero;

  if found then
    -- El número es único en toda la base, así que una factura de otra empresa
    -- con ese número es un error de digitación, no una factura compartida.
    if v_factura.empresa_id <> v_empresa_id then
      raise exception 'La factura % es de otra empresa', v_numero;
    end if;

    if v_factura.estado = 'anulada' then
      raise exception 'La factura % está anulada. Usa otro número.', v_numero;
    end if;

    update facturas set
      estado_pago = p_estado_pago,
      fecha_pago = v_fecha_pago,
      entidad_bancaria = nullif(trim(coalesce(p_entidad_bancaria, '')), ''),
      observaciones = nullif(trim(coalesce(p_observaciones, '')), '')
    where id = v_factura.id;
  else
    insert into facturas (
      numero, empresa_id, estado_pago, fecha_pago,
      entidad_bancaria, observaciones, creada_por
    )
    values (
      v_numero, v_empresa_id, p_estado_pago, v_fecha_pago,
      nullif(trim(coalesce(p_entidad_bancaria, '')), ''),
      nullif(trim(coalesce(p_observaciones, '')), ''),
      auth.uid()
    )
    returning * into v_factura;

    v_creada := true;
  end if;

  -- Si venía de otra factura vigente, esto es una corrección: se mueve. El
  -- trigger factura_matricula_sin_duplicar no deja insertar sin quitar antes.
  select f.id, f.numero into v_anterior
  from factura_matriculas fm
  join facturas f on f.id = fm.factura_id
  where fm.matricula_id = p_matricula_id
    and f.estado <> 'anulada'
    and f.id <> v_factura.id
  limit 1;

  if v_anterior.id is not null then
    delete from factura_matriculas
    where matricula_id = p_matricula_id and factura_id = v_anterior.id;
  end if;

  insert into factura_matriculas (factura_id, matricula_id, valor_sin_iva)
  values (v_factura.id, p_matricula_id, p_valor_sin_iva)
  on conflict (factura_id, matricula_id)
    do update set valor_sin_iva = excluded.valor_sin_iva;

  select count(*) into v_total
  from factura_matriculas where factura_id = v_factura.id;

  return jsonb_build_object(
    'factura_id', v_factura.id,
    'numero', v_factura.numero,
    'creada', v_creada,
    'total_aprendices', v_total,
    'movida_desde', v_anterior.numero
  );
end;
$function$;

revoke all on function public.diligenciar_matricula(
  bigint, text, numeric, estado_pago, date, text, text
) from public, anon;

grant execute on function public.diligenciar_matricula(
  bigint, text, numeric, estado_pago, date, text, text
) to authenticated;


-- ---------------------------------------------------------------------------
-- Nota sobre permisos de tabla
-- ---------------------------------------------------------------------------
-- Con esta función, el cliente no escribe nunca en facturas ni en
-- factura_matriculas: lo hace ella, como dueña. Por eso NO se agrega la
-- política de UPDATE que faltaba en factura_matriculas — no hace falta mientras
-- todas las escrituras pasen por aquí. Las de insert y delete que ya existen
-- quedan, pero tampoco se usan hoy.
