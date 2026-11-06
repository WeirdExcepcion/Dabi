-- Dabi · Contabilidad — modelo de facturación y tarifas
-- Aplicado en Supabase el 2026-08-27. Reconstruido desde la conversación.
--
-- Orden de ejecución del día: 01 (alturas) → 02 (este) → 03 (seguridad).
-- El archivo está escrito como estado final, no como la secuencia de intentos:
-- facturas nunca llega a tener valor_sin_iva ni valor_total, porque el valor
-- quedó en el renglón. Es idempotente: se puede volver a correr completo.
--
-- Incluye dos correcciones que la base viva todavía no tiene, para que este
-- archivo sirva para reconstruir desde cero: ver
-- 2026-10-08-01-correcciones-facturacion.sql, que es lo que falta correr.
--
-- Qué es y qué no: Dabi NO factura. La facturación real se hace en el software
-- contable de la empresa; aquí se guarda el rastro para poder cruzarlo con las
-- matrículas que registra Alturas.


-- ---------------------------------------------------------------------------
-- 1. Estados
-- ---------------------------------------------------------------------------
-- Dos ejes independientes: una factura está emitida o anulada, y además pagada
-- o no. "Pendiente por facturar" no se guarda: es la ausencia de factura, y se
-- deriva en la vista.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_factura') then
    create type estado_factura as enum ('emitida', 'anulada');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_pago') then
    create type estado_pago as enum ('no_pago', 'pago');
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- 2. Facturas y sus renglones
-- ---------------------------------------------------------------------------
-- El valor va en el renglón, no en la factura: el contable lo llena aprendiz
-- por aprendiz desde el registro diario, así que un total propio en la factura
-- se descuadraría al agregar el segundo aprendiz. El total es la suma de los
-- renglones y se calcula en la vista.

create table if not exists facturas (
  id bigint generated always as identity primary key,
  numero text not null unique,
  empresa_id bigint not null references empresas(id),
  fecha_emision date not null default current_date,
  estado estado_factura not null default 'emitida',
  estado_pago estado_pago not null default 'no_pago',
  fecha_pago date,
  entidad_bancaria text,
  observaciones text,
  creada_por uuid references auth.users(id),
  creada_en timestamptz not null default now()
);

comment on table facturas is
  'Registro de las facturas emitidas en el software contable. Dabi no factura: '
  'guarda el rastro para poder cruzarlo con las matrículas.';

create table if not exists factura_matriculas (
  factura_id bigint not null references facturas(id) on delete cascade,
  matricula_id bigint not null references matriculas(id) on delete restrict,
  valor_sin_iva numeric(14, 2) not null default 0,
  primary key (factura_id, matricula_id)
);

comment on table factura_matriculas is
  'Qué matrículas cubre cada factura y por cuánto. El IVA (19%) se calcula '
  'sobre la suma, en contabilidad_facturas.';


-- ---------------------------------------------------------------------------
-- 3. Una matrícula, una factura vigente
-- ---------------------------------------------------------------------------
-- Puede volver a facturarse si la anterior se anuló, así que no es un índice
-- único: depende del estado de la factura padre.

create or replace function validar_matricula_no_facturada()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $$
begin
  if exists (
    select 1
    from factura_matriculas fm
    join facturas f on f.id = fm.factura_id
    where fm.matricula_id = new.matricula_id
      and fm.factura_id <> new.factura_id
      and f.estado <> 'anulada'
  ) then
    raise exception 'Este aprendiz ya está incluido en una factura vigente';
  end if;

  return new;
end;
$$;

drop trigger if exists factura_matricula_sin_duplicar on factura_matriculas;
create trigger factura_matricula_sin_duplicar
  before insert on factura_matriculas
  for each row execute function validar_matricula_no_facturada();


-- ---------------------------------------------------------------------------
-- 4. Auditoría de facturas
-- ---------------------------------------------------------------------------
-- PENDIENTE: el valor ya no está en facturas sino en factura_matriculas, así
-- que hoy un cambio de valor no se audita. Falta un trigger equivalente sobre
-- los renglones; no se escribió todavía para no inventar comportamiento sin
-- acordarlo.
--
-- Nota: la acción 'facturacion' entra en auditoria.accion. Si esa columna
-- llegara a tener enum o check, hay que admitirla antes de insertar la primera
-- factura; a la fecha de este archivo nunca se ejecutó una inserción real.

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

-- Las funciones de trigger las invoca el motor, no el usuario: nadie necesita
-- permiso de ejecución.
revoke all on function public.auditar_factura() from public, anon, authenticated;

drop trigger if exists facturas_auditoria on facturas;
create trigger facturas_auditoria
  after insert or update on facturas
  for each row execute function auditar_factura();


-- ---------------------------------------------------------------------------
-- 5. Tarifas
-- ---------------------------------------------------------------------------
-- El precio de la empresa manda sobre el del curso. Se cargan desde la ficha
-- de empresa, igual que la ARL en Alturas, pero desde el área contable.

create table if not exists precios_curso (
  curso_id bigint primary key references cursos(id) on delete cascade,
  valor_sin_iva numeric(14, 2) not null,
  actualizado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now()
);

create table if not exists precios_empresa (
  empresa_id bigint not null references empresas(id) on delete cascade,
  curso_id bigint not null references cursos(id) on delete cascade,
  valor_sin_iva numeric(14, 2) not null,
  actualizado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now(),
  primary key (empresa_id, curso_id)
);

comment on table precios_curso is 'Tarifa base por curso. Se usa cuando la empresa no tiene precio propio.';
comment on table precios_empresa is 'Tarifa negociada de una empresa para un curso. Manda sobre precios_curso.';


-- ---------------------------------------------------------------------------
-- 6. Permisos — los seis roles del módulo
-- ---------------------------------------------------------------------------

alter table facturas enable row level security;
alter table factura_matriculas enable row level security;
alter table precios_curso enable row level security;
alter table precios_empresa enable row level security;

drop policy if exists "Contabilidad ve facturas" on facturas;
create policy "Contabilidad ve facturas" on facturas for select
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad crea facturas" on facturas;
create policy "Contabilidad crea facturas" on facturas for insert
  with check (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad edita facturas" on facturas;
create policy "Contabilidad edita facturas" on facturas for update
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad ve renglones" on factura_matriculas;
create policy "Contabilidad ve renglones" on factura_matriculas for select
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad arma facturas" on factura_matriculas;
create policy "Contabilidad arma facturas" on factura_matriculas for insert
  with check (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad quita renglones" on factura_matriculas;
create policy "Contabilidad quita renglones" on factura_matriculas for delete
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

-- OJO: no hay política de UPDATE sobre factura_matriculas, así que corregir el
-- valor de un renglón ya guardado falla en silencio (0 filas afectadas). Hay
-- que agregarla cuando Diligenciar permita editar lo ya diligenciado.

-- En las tarifas quien puede ver puede editar, así que una política por tabla
-- en vez de cuatro.
drop policy if exists "Contabilidad ve tarifas base" on precios_curso;
create policy "Contabilidad ve tarifas base" on precios_curso for all
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]))
  with check (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));

drop policy if exists "Contabilidad gestiona tarifas por empresa" on precios_empresa;
create policy "Contabilidad gestiona tarifas por empresa" on precios_empresa for all
  using (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]))
  with check (mi_rol() = any (array['admin','gerente-general','director-operaciones','coordinador-procesos','contable','auxiliar-cont']::rol_usuario[]));


-- ---------------------------------------------------------------------------
-- 7. Vistas
-- ---------------------------------------------------------------------------
-- Las dos van sin security_invoker a propósito: leen con los privilegios del
-- dueño y se filtran solas por rol, lo que permite unir con aprendices y
-- empresas sin darle select sobre esas tablas al área contable. Son la
-- excepción a la regla de security_invoker = on del resto del proyecto.
--
-- Siempre drop antes de create cuando cambie la lista de columnas:
-- create or replace view no deja insertar una columna en medio ni reordenar.

drop view if exists contabilidad_matriculas;

create view contabilidad_matriculas as
select
  m.id as matricula_id,
  m.fecha_ingreso,
  m.empresa_id,
  g.curso_id,
  a.nombres,
  a.apellidos,
  a.nombres || ' ' || a.apellidos as nombre_completo,
  a.tipo_documento,
  a.numero_documento,
  split_part(a.nombres, ' ', 1) || ' ' ||
    split_part(a.apellidos, ' ', 1) || ' ' ||
    lower(a.tipo_documento::text) || ' ' ||
    a.numero_documento as identificacion,
  c.nombre as curso,
  e.razon_social as empresa,
  e.nit,
  fac.id as factura_id,
  fac.numero as numero_factura,
  -- Derivado: sin factura vigente, la matrícula está pendiente por facturar.
  case when fac.id is null then 'pendiente' else 'facturado' end as estado_facturacion,
  coalesce(fac.estado_pago, 'no_pago'::estado_pago) as estado_pago,
  fac.valor_sin_iva,
  -- El precio de la empresa manda; si no tiene, el del curso.
  coalesce(pe.valor_sin_iva, pc.valor_sin_iva) as valor_sugerido
from matriculas m
join aprendices a on a.id = m.aprendiz_id
join grupos g on g.id = m.grupo_id
join cursos c on c.id = g.curso_id
left join empresas e on e.id = m.empresa_id
left join precios_empresa pe on pe.empresa_id = m.empresa_id and pe.curso_id = g.curso_id
left join precios_curso pc on pc.curso_id = g.curso_id
left join lateral (
  select f.id, f.numero, f.estado_pago, fm.valor_sin_iva
  from factura_matriculas fm
  join facturas f on f.id = fm.factura_id
  where fm.matricula_id = m.id
    and f.estado <> 'anulada'
  limit 1
) fac on true
where m.estado <> 'anulado'
  and mi_rol() = any (array[
    'admin', 'gerente-general', 'director-operaciones',
    'coordinador-procesos', 'contable', 'auxiliar-cont'
  ]::rol_usuario[]);

comment on view contabilidad_matriculas is
  'Sin security_invoker a propósito: se filtra sola por rol para poder unir con '
  'aprendices y empresas sin dar select sobre esas tablas al área contable.';

revoke all on contabilidad_matriculas from public, anon;
grant select on contabilidad_matriculas to authenticated;

drop view if exists contabilidad_facturas;

create view contabilidad_facturas as
select
  f.id,
  f.numero,
  f.empresa_id,
  e.razon_social as empresa,
  e.nit,
  f.fecha_emision,
  f.estado,
  f.estado_pago,
  f.fecha_pago,
  f.entidad_bancaria,
  f.observaciones,
  -- Contado y sumado sobre los renglones: el total no puede descuadrarse de
  -- lo que la factura realmente cubre.
  coalesce(r.total_aprendices, 0) as total_aprendices,
  coalesce(r.valor_sin_iva, 0) as valor_sin_iva,
  round(coalesce(r.valor_sin_iva, 0) * 1.19, 2) as valor_total
from facturas f
left join empresas e on e.id = f.empresa_id
left join lateral (
  select count(*) as total_aprendices, sum(fm.valor_sin_iva) as valor_sin_iva
  from factura_matriculas fm
  where fm.factura_id = f.id
) r on true
where mi_rol() = any (array[
  'admin', 'gerente-general', 'director-operaciones',
  'coordinador-procesos', 'contable', 'auxiliar-cont'
]::rol_usuario[]);

comment on view contabilidad_facturas is
  'Como contabilidad_matriculas: sin security_invoker a propósito.';

revoke all on contabilidad_facturas from public, anon;
grant select on contabilidad_facturas to authenticated;
