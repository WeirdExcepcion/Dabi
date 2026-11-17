import assert from 'node:assert/strict'
import { procesarArchivo, COLUMNAS } from '../src/lib/importarMatriculas.js'
import {
  buscarPorNit, indexarEmpresas, similitud, construirPlan, llavesPorCrear, sumarDias,
} from '../src/lib/planImportacion.js'

let pasadas = 0
function prueba(nombre, fn) {
  fn()
  pasadas++
  console.log('ok -', nombre)
}

const ENC = COLUMNAS.map((c) => c.encabezado).join(';')
const leer = (...filas) => procesarArchivo(new TextEncoder().encode([ENC, ...filas].join('\n')).buffer).filas

// Una base pequeña e inventada, con lo justo para cada caso.
function base(extra = {}) {
  return {
    cursos: [
      { id: 1, nombre: 'Trabajo en alturas avanzado', duracion_dias: 5 },
      { id: 2, nombre: 'Trabajo en alturas básico', duracion_dias: 1 },
    ],
    grupos: [
      { id: 10, curso_id: 1, fecha_inicio: '2026-11-03', fecha_fin: '2026-11-07', identificador: null },
      { id: 11, curso_id: 2, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10', identificador: 'A' },
      { id: 12, curso_id: 2, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10', identificador: 'B' },
    ],
    empresas: [
      { id: 35, razon_social: 'INDEPENDIENTE', nit: null, es_independiente: true, activo: true },
      { id: 40, razon_social: 'Bancolombia', nit: '890903938', es_independiente: false, activo: true, arl_id: 3, sector_id: 7 },
      { id: 41, razon_social: 'Constructora Vieja', nit: '900111222-1', es_independiente: false, activo: false },
    ],
    catalogos: {
      nivelesEducativos: [{ id: 1, nombre: 'Bachiller' }],
      arls: [{ id: 3, nombre: 'ARL Sura' }, { id: 4, nombre: 'Positiva' }],
      eps: [{ id: 5, nombre: 'Nueva EPS' }],
      areas: [{ id: 6, nombre: 'Operaciones' }],
      cargos: [{ id: 8, nombre: 'Técnico electricista' }],
      sectores: [{ id: 7, nombre: 'Financiero' }, { id: 9, nombre: 'Construcción' }],
    },
    aprendices: new Map(),
    similaresEmpresa: {},
    ...extra,
  }
}

const TODOS = { crearGrupos: true, crearEmpresas: true }
const RECEPCION = { crearGrupos: false, crearEmpresas: false }

prueba('NIT con y sin dígito de verificación es la misma empresa', () => {
  const indice = indexarEmpresas(base().empresas)
  assert.equal(buscarPorNit(indice, '890903938')?.id, 40)
  assert.equal(buscarPorNit(indice, '890.903.938-8')?.id, 40)
  assert.equal(buscarPorNit(indice, '8909039388')?.id, 40)
  // Guardada con DV, buscada sin él.
  assert.equal(buscarPorNit(indice, '900111222')?.id, 41)
  // Un dígito de más que no es el DV correcto no cuenta.
  assert.equal(buscarPorNit(indice, '8909039387'), null)
  assert.equal(buscarPorNit(indice, ''), null)
})

prueba('similitud', () => {
  assert.equal(similitud('SURA', 'sura'), 1)
  assert.ok(similitud('Sura', 'ARL Sura') >= 0.9)
  assert.ok(similitud('Tecnico electricista', 'Técnico electricista') === 1)
  assert.ok(similitud('Positiva', 'Nueva EPS') < 0.4)
})

prueba('sumar días cruza meses y años', () => {
  assert.equal(sumarDias('2026-11-03', 4), '2026-11-07')
  assert.equal(sumarDias('2026-12-30', 3), '2027-01-02')
  assert.equal(sumarDias('2026-11-03', -15), '2026-10-19')
})

prueba('una fila que coincide con todo queda lista sin preguntar nada', () => {
  const filas = leer('CC;111;Ana;Ruiz;trabajo en alturas AVANZADO;03/11/2026;07/11/2026;03/11/2026;890.903.938-8;;F;O+;;;bachiller;arl sura;;nueva eps;;operaciones;tecnico electricista;construccion;')
  const plan = construirPlan(filas, base(), {}, TODOS)
  assert.equal(plan.pendientes.length, 0)
  const [f] = plan.filas
  assert.equal(f.estado, 'lista', JSON.stringify(f))
  assert.deepEqual(f.refs.grupo, { id: 10 })
  assert.deepEqual(f.refs.empresa, { id: 40 })
  assert.deepEqual(f.refs.arl, { id: 3 })
  assert.deepEqual(f.refs.sector, { id: 9 })
  assert.equal(f.aprendiz.nivel_educativo_id, 1)
  assert.equal(f.aprendiz.pais, 'Colombia')
})

prueba('sin ARL ni sector en la fila se toman los de la empresa, como en el formulario', () => {
  const filas = leer('CC;111;Ana;Ruiz;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;890903938')
  const [f] = construirPlan(filas, base(), {}, TODOS).filas
  assert.deepEqual(f.refs.arl, { id: 3 })
  assert.deepEqual(f.refs.sector, { id: 7 })
})

prueba('independiente va a la empresa compartida', () => {
  const filas = leer('CC;111;Ana;Ruiz;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;Independiente')
  const [f] = construirPlan(filas, base(), {}, TODOS).filas
  assert.deepEqual(f.refs.empresa, { id: 35 })
})

prueba('curso desconocido: una sola decisión para todas sus filas, y bloquea hasta tomarla', () => {
  const filas = leer(
    'CC;1;A;B;Alturas avanzadoo;03/11/2026;07/11/2026;03/11/2026;independiente',
    'CC;2;C;D;alturas avanzadoo;03/11/2026;07/11/2026;03/11/2026;independiente',
  )
  let plan = construirPlan(filas, base(), {}, TODOS)
  const cursos = plan.pendientes.filter((p) => p.tipo === 'curso')
  assert.equal(cursos.length, 1)
  assert.deepEqual(cursos[0].filas, [2, 3])
  assert.equal(cursos[0].puedeCrear, false)
  assert.equal(plan.conteo.bloqueada, 2)

  plan = construirPlan(filas, base(), { [cursos[0].llave]: { accion: 'existente', id: 1 } }, TODOS)
  assert.equal(plan.conteo.lista, 2)
  assert.deepEqual(plan.filas[0].refs.grupo, { id: 10 })
})

prueba('grupo nuevo: se propone crearlo, una vez, y avisa si la fecha final no cuadra', () => {
  const filas = leer(
    'CC;1;A;B;Trabajo en alturas avanzado;17/11/2026;21/11/2026;17/11/2026;independiente',
    'CC;2;C;D;Trabajo en alturas avanzado;17/11/2026;21/11/2026;17/11/2026;independiente',
    'CC;3;E;F;Trabajo en alturas avanzado;24/11/2026;30/11/2026;24/11/2026;independiente',
  )
  const plan = construirPlan(filas, base(), {}, TODOS)
  const grupos = plan.pendientes.filter((p) => p.tipo === 'grupo')
  assert.equal(grupos.length, 2)
  assert.equal(grupos[0].decision.accion, 'crear')
  assert.deepEqual(grupos[0].crear, { curso_id: 1, fecha_inicio: '2026-11-17', fecha_fin: '2026-11-21' })
  assert.equal(plan.conteo.lista, 3)
  assert.equal(plan.filas[0].avisos.length, 0)
  // Del 24 al 30 son 7 días y el curso dura 5.
  assert.match(plan.filas[2].avisos.at(-1), /duración del curso \(5 días\)/)
  assert.equal(llavesPorCrear(plan).length, 2)
})

prueba('recepción no puede crear grupos: elige uno existente o la fila queda bloqueada', () => {
  const filas = leer('CC;1;A;B;Trabajo en alturas avanzado;04/11/2026;08/11/2026;04/11/2026;independiente')
  const plan = construirPlan(filas, base(), {}, RECEPCION)
  const [g] = plan.pendientes
  assert.equal(g.puedeCrear, false)
  assert.equal(g.decision, null)
  // Se ofrece el grupo del día anterior, que está dentro de la ventana.
  assert.deepEqual(g.opciones.map((o) => o.id), [10])
  assert.equal(plan.conteo.bloqueada, 1)
})

prueba('grupos paralelos el mismo día: hay que elegir, no se adivina', () => {
  const filas = leer('CC;1;A;B;Trabajo en alturas básico;10/11/2026;10/11/2026;10/11/2026;independiente')
  const plan = construirPlan(filas, base(), {}, TODOS)
  const [g] = plan.pendientes
  assert.equal(g.puedeCrear, false)
  assert.deepEqual(g.opciones.map((o) => o.nombre), ['10/11/2026 – 10/11/2026 (A)', '10/11/2026 – 10/11/2026 (B)'])
  assert.equal(plan.conteo.bloqueada, 1)
})

prueba('empresa nueva: una sola aunque el NIT venga con y sin DV, con el nombre que aparezca', () => {
  const filas = leer(
    'CC;1;A;B;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;800200300;',
    'CC;2;C;D;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;800.200.300-5;Andamios del Sur',
    'CC;3;E;F;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;8002003005;',
  )
  const plan = construirPlan(filas, base(), {}, TODOS)
  assert.equal(plan.pendientes.length, 1)
  const [e] = plan.pendientes
  assert.equal(e.tipo, 'empresa')
  assert.deepEqual(e.decision, { accion: 'crear', nombre: 'Andamios del Sur' })
  assert.deepEqual(e.filas, [2, 3, 4])
  // Se guarda el NIT más completo, con su dígito de verificación.
  assert.equal(e.crear.nit, '800.200.300-5')
  assert.equal(plan.conteo.lista, 3)

  // Borrar el nombre deja la decisión elegida en pantalla pero sin resolver.
  const sinNombre = construirPlan(filas, base(), { [e.llave]: { accion: 'crear', nombre: '  ' } }, TODOS)
  assert.equal(sinNombre.pendientes[0].elegida.accion, 'crear')
  assert.equal(sinNombre.pendientes[0].decision, null)
  assert.equal(sinNombre.conteo.bloqueada, 3)
})

prueba('empresa con el mismo nombre ya registrado: no deja crear otra', () => {
  const filas = leer('CC;1;A;B;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;800200300;Bancolombia')
  const contexto = base({
    similaresEmpresa: { 'empresa|800200300': [{ id: 40, razon_social: 'Bancolombia', nit: '890903938', coincidencia: 'nombre_exacto' }] },
  })
  const [e] = construirPlan(filas, contexto, {}, TODOS).pendientes
  assert.equal(e.puedeCrear, false)
  assert.deepEqual(e.decision, { accion: 'existente', id: 40 })
  assert.match(e.sugerencias[0].nombre, /mismo nombre/)
})

prueba('empresa desactivada se usa, con aviso', () => {
  const filas = leer('CC;1;A;B;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;900111222')
  const [f] = construirPlan(filas, base(), {}, TODOS).filas
  assert.deepEqual(f.refs.empresa, { id: 41 })
  assert.match(f.avisos[0], /desactivada/)
})

prueba('catálogos opcionales: sugerencia clara se elige sola, si no se crea o queda vacío', () => {
  const filas = leer('CC;1;A;B;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;independiente;;;;;;;Sura;;Compensar;;;Soldador')
  const plan = construirPlan(filas, base(), {}, TODOS)
  const por = Object.fromEntries(plan.pendientes.map((p) => [p.tipo, p]))
  assert.deepEqual(por.arl.decision, { accion: 'existente', id: 3 })
  assert.deepEqual(por.eps.decision, { accion: 'vacio' })
  assert.equal(por.eps.puedeCrear, false)
  assert.deepEqual(por.cargo.decision, { accion: 'crear' })
  // Nunca bloquean.
  assert.equal(plan.conteo.lista, 1)
  assert.equal(plan.filas[0].refs.eps, undefined)
})

prueba('aprendiz ya registrado: se conserva su nombre y no se borran sus datos', () => {
  const aprendices = new Map([['CC|1023456789', {
    id: 99, tipo_documento: 'CC', numero_documento: '1.023.456.789',
    nombres: 'José Andrés', apellidos: 'Peña Muñoz', sexo: 'M', pais: 'Venezuela',
    fecha_nacimiento: '1990-05-12', nivel_educativo_id: 1, rh: 'O+',
  }]])
  const filas = leer('CC;1023456789;Jose;Pena;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;independiente;;;A+')
  const [f] = construirPlan(filas, base({ aprendices }), {}, TODOS).filas
  // El número como está guardado, para que registrar_matricula lo encuentre.
  assert.equal(f.aprendiz.numero_documento, '1.023.456.789')
  assert.equal(f.aprendiz.nombres, 'José Andrés')
  assert.equal(f.aprendiz.pais, 'Venezuela')
  assert.equal(f.aprendiz.fecha_nacimiento, '1990-05-12')
  assert.equal(f.aprendiz.sexo, 'M')
  // Lo que sí trae el archivo, manda.
  assert.equal(f.aprendiz.rh, 'A+')
  assert.match(f.avisos[0], /se conserva ese nombre/)
})

prueba('las filas con error del archivo se omiten y no generan decisiones', () => {
  const filas = leer('CC;;A;B;Curso inventado;03/11/2026;07/11/2026;03/11/2026;independiente')
  const plan = construirPlan(filas, base(), {}, TODOS)
  assert.equal(plan.pendientes.length, 0)
  assert.equal(plan.filas[0].estado, 'omitida')
})

prueba('no se crea lo que solo usan filas bloqueadas', () => {
  // Grupo nuevo, pero la empresa queda sin resolver para recepción.
  const filas = leer('CC;1;A;B;Trabajo en alturas avanzado;17/11/2026;21/11/2026;17/11/2026;800200300;Andamios')
  const plan = construirPlan(filas, base(), {}, { crearGrupos: true, crearEmpresas: false })
  assert.equal(plan.conteo.bloqueada, 1)
  assert.equal(llavesPorCrear(plan).length, 0)
})

console.log(`\n${pasadas} pruebas pasadas`)
