# docs/sql

Historial de los cambios de base de datos de Dabi, en archivos con fecha. No es
una herramienta de migraciones: el cambio se aplica a mano en el editor SQL de
Supabase y el archivo queda como registro de qué se corrió y por qué.

## Convenciones

- Nombre: `AAAA-MM-DD-NN-tema.sql`. El `NN` es el orden dentro del día.
- Cada archivo es idempotente: se puede volver a correr completo sin romper
  nada (`if not exists`, `drop ... if exists` antes de crear).
- Los archivos reflejan el **estado final** acordado, no la secuencia de
  intentos y correcciones. Si en el camino se creó una columna y luego se
  quitó, el archivo simplemente no la crea.
- Las decisiones y los descartes van comentados en el propio archivo, que es
  donde se van a leer.

## Trampas que ya costaron tiempo

- `create or replace view` **no** permite insertar una columna en medio,
  reordenarlas ni renombrarlas: solo añadir al final. Si cambia la lista de
  columnas, `drop view` primero.
- Una vista que depende de una tabla o columna bloquea su `drop`. Quitar la
  vista primero, y **no** usar `cascade` para que nada desaparezca en silencio.
- `create or replace function` con otra lista de parámetros crea una **segunda**
  sobrecarga, no reemplaza. Hay que borrar la vieja o la llamada queda ambigua.
- `NULL not in (...)` devuelve `NULL`, no `true`. Toda guarda de rol necesita
  `v_rol is null or v_rol not in (...)`.
- Postgres concede `EXECUTE` a `PUBLIC` por defecto: cada función nueva lleva su
  `revoke` + `grant to authenticated`.
- El `GRANT` por columna no sirve en Supabase: todos los usuarios con sesión
  comparten el rol `authenticated`. Para exponer solo ciertas columnas se usa
  una vista **sin** `security_invoker` que se filtra sola por `mi_rol()`.

## Orden de los archivos de 2026-08-27

1. `01-alturas-observaciones-y-documentos.sql`
2. `02-contabilidad-modelo.sql`
3. `03-seguridad-funciones.sql`

El 03 va al final porque `eliminar_matricula` consulta las tablas de facturas
que crea el 02. `plpgsql` no valida esas referencias al crear la función, así
que invertir el orden no da error: falla al ejecutarse.

`2026-10-08-01-correcciones-facturacion.sql` es lo único que la base viva
todavía no tiene: dos fallos que salieron al escribir estos archivos.
