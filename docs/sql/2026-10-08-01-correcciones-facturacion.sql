-- Dabi · Correcciones al modelo de facturación
-- Encontradas al versionar el SQL del 2026-08-27. Pendientes de correr en
-- Supabase: lo de abajo es lo único de los cuatro archivos que la base todavía
-- no tiene.
--
-- El contenido ya está incorporado en 2026-08-27-02-contabilidad-modelo.sql
-- para que ese archivo sirva para reconstruir la base desde cero. Este existe
-- para dejar claro qué falta aplicar sobre la base que está viva.


-- ---------------------------------------------------------------------------
-- 1. auditar_factura referencia una columna que ya no existe
-- ---------------------------------------------------------------------------
-- El trigger comparaba new.valor_sin_iva con old.valor_sin_iva, pero esa
-- columna se quitó de facturas cuando el valor pasó al renglón. En un INSERT no
-- se nota, porque ese camino no la toca; el primer UPDATE de una factura
-- —marcarla como pagada, por ejemplo— habría fallado con "record new has no
-- field valor_sin_iva".
--
-- Queda sin auditar el cambio de valor. Eso ahora vive en factura_matriculas y
-- necesita su propio trigger, que no se escribió todavía.

create or replace function auditar_factura()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_cambios jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_cambios := jsonb_build_object(
      'numero', jsonb_build_object('antes', null, 'despues', new.numero)
    );
  else
    if new.estado is distinct from old.estado then
      v_cambios := v_cambios || jsonb_build_object(
        'estado', jsonb_build_object('antes', old.estado, 'despues', new.estado));
    end if;
    if new.estado_pago is distinct from old.estado_pago then
      v_cambios := v_cambios || jsonb_build_object(
        'estado_pago', jsonb_build_object('antes', old.estado_pago, 'despues', new.estado_pago));
    end if;
    if new.numero is distinct from old.numero then
      v_cambios := v_cambios || jsonb_build_object(
        'numero', jsonb_build_object('antes', old.numero, 'despues', new.numero));
    end if;
  end if;

  if v_cambios <> '{}'::jsonb then
    insert into auditoria (tabla, registro_id, accion, cambios, realizado_por)
    values ('facturas', new.id, 'facturacion', v_cambios, auth.uid());
  end if;

  return null;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. factura_matriculas no tiene política de UPDATE — a propósito
-- ---------------------------------------------------------------------------
-- Se crearon select, insert y delete, nunca update. Eso habría hecho que
-- corregir el valor de un renglón ya guardado fallara en silencio (0 filas
-- afectadas, sin error).
--
-- No se agrega: desde 2026-10-08-02 todas las escrituras de facturación pasan
-- por diligenciar_matricula(), que es security definer y escribe como dueña. La
-- política sobraría. Queda anotado aquí para que nadie lo lea como un olvido.
