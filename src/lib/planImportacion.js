// Con extensión, a diferencia del resto del proyecto: las pruebas corren este
// archivo con node directamente, y node no resuelve imports sin ella.
import { normalizar, digitoVerificacion } from './importarMatriculas.js'

// Campos opcionales que se cruzan con un catálogo. Solo cargo se puede crear:
// ARL y EPS son listas cerradas por ley, y las demás no tienen hoy forma de
// crearse desde la aplicación.
export const CAMPOS_CATALOGO = [
  { clave: 'nivel_educativo', catalogo: 'nivelesEducativos', etiqueta: 'Nivel educativo', crear: false },
  { clave: 'arl', catalogo: 'arls', etiqueta: 'ARL', crear: false },
  { clave: 'eps', catalogo: 'eps', etiqueta: 'EPS', crear: false },
  { clave: 'area', catalogo: 'areas', etiqueta: 'Área', crear: false },
  { clave: 'cargo', catalogo: 'cargos', etiqueta: 'Cargo', crear: true },
  { clave: 'sector', catalogo: 'sectores', etiqueta: 'Sector', crear: false },
]

const ORDEN_TIPOS = ['curso', 'grupo', 'empresa', ...CAMPOS_CATALOGO.map((c) => c.clave)]

const UMBRAL_SUGERENCIA = 0.4
// Solo se elige sola una sugerencia muy parecida y sin rival cercano: entre
// "ARL Sura" y "ARL Positiva" para un "ARL" a secas, no se adivina.
const UMBRAL_PRESELECCION = 0.85
const VENTAJA_PRESELECCION = 0.1

const DETALLE_COINCIDENCIA = {
  nit_exacto: ' · mismo NIT',
  nombre_exacto: ' · mismo nombre',
  nit_parecido: ' · NIT muy parecido',
}

// Margen para ofrecer grupos existentes cuando el del archivo no aparece: un
// día de diferencia en la fecha inicial es un error de digitación común.
export const DIAS_VENTANA_GRUPOS = 15

export function soloDigitos(texto) {
  return String(texto ?? '').replace(/\D/g, '')
}

// Indexa por los dígitos del NIT tal como estén guardados, con o sin dígito
// de verificación.
export function indexarEmpresas(empresas) {
  const indice = new Map()
  for (const e of empresas) {
    const digitos = soloDigitos(e.nit)
    if (digitos && !indice.has(digitos)) indice.set(digitos, e)
  }
  return indice
}

// Dos NIT son el mismo si coinciden, o si uno es el otro más su dígito de
// verificación correcto. Un dígito de más que no es el DV no cuenta.
// Recibe solo dígitos.
function mismoNit(a, b) {
  return a === b || b === a + digitoVerificacion(a) || a === b + digitoVerificacion(b)
}

export function buscarPorNit(indice, nit) {
  const x = soloDigitos(nit)
  if (!x) return null
  if (indice.has(x)) return indice.get(x)

  const conDv = x + digitoVerificacion(x)
  if (indice.has(conDv)) return indice.get(conDv)

  const sinUltimo = x.slice(0, -1)
  if (sinUltimo && mismoNit(sinUltimo, x)) return indice.get(sinUltimo) || null
  return null
}

// Los NIT del archivo que no están en la base, agrupados con la misma regla
// que buscarPorNit: "800200300" y "800.200.300-5" son una sola empresa nueva,
// no dos. De cada grupo se guarda el NIT más completo (con DV, si alguna fila
// lo trae) y el primer nombre que aparezca.
export function agruparNitsNuevos(filas, indice) {
  const grupos = []
  const porDigitos = new Map()

  for (const f of filas) {
    const d = f.datos
    if (f.estado === 'error' || d.independiente) continue

    if (buscarPorNit(indice, d.nit)) continue

    const x = soloDigitos(d.nit)
    let g = porDigitos.get(x) || grupos.find((otro) => otro.variantes.some((v) => mismoNit(v, x)))
    if (!g) {
      g = { llave: `empresa|${x}`, nit: d.nit, nombre: '', variantes: [] }
      grupos.push(g)
    }
    if (!g.variantes.includes(x)) g.variantes.push(x)
    if (x.length > soloDigitos(g.nit).length) g.nit = d.nit
    if (!g.nombre && d.empresa) g.nombre = d.empresa
    porDigitos.set(x, g)
  }

  return porDigitos
}

function bigramas(texto) {
  const t = ` ${texto} `
  const lista = []
  for (let i = 0; i < t.length - 1; i++) lista.push(t.slice(i, i + 2))
  return lista
}

// Coeficiente de Dice sobre pares de letras: 1 es idéntico, 0 nada en común.
// Si todas las palabras de uno están en el otro ("Sura" en "ARL Sura") se
// considera casi igual.
export function similitud(a, b) {
  const x = normalizar(a)
  const y = normalizar(b)
  if (!x || !y) return 0
  if (x === y) return 1

  const palabrasX = x.split(' ')
  const palabrasY = y.split(' ')
  const contenida =
    palabrasX.every((p) => palabrasY.includes(p)) ||
    palabrasY.every((p) => palabrasX.includes(p))

  const bx = bigramas(x)
  const restantes = new Map()
  for (const g of bigramas(y)) restantes.set(g, (restantes.get(g) || 0) + 1)

  let comunes = 0
  for (const g of bx) {
    const n = restantes.get(g)
    if (n) {
      comunes++
      restantes.set(g, n - 1)
    }
  }

  const dice = (2 * comunes) / (bx.length + bigramas(y).length)
  return contenida ? Math.max(dice, 0.9) : dice
}

export function sugerir(texto, opciones, campo = 'nombre') {
  return opciones
    .map((o) => ({ ...o, puntaje: similitud(texto, o[campo]) }))
    .filter((o) => o.puntaje >= UMBRAL_SUGERENCIA)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 5)
}

function preseleccion(sugerencias) {
  const [primera, segunda] = sugerencias
  if (!primera || primera.puntaje < UMBRAL_PRESELECCION) return null
  if (segunda && primera.puntaje - segunda.puntaje < VENTAJA_PRESELECCION) return null
  return primera.id
}

function buscarExacto(opciones, texto, campo = 'nombre') {
  const buscado = normalizar(texto)
  return opciones.find((o) => normalizar(o[campo]) === buscado) || null
}

export function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias))
  return fecha.toISOString().slice(0, 10)
}

function fechaCorta(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

export function etiquetaGrupo(g) {
  const fechas = `${fechaCorta(g.fecha_inicio)} – ${fechaCorta(g.fecha_fin)}`
  return g.identificador ? `${fechas} (${g.identificador})` : fechas
}

// Una decisión sin el dato que necesita cuenta como no tomada.
function resuelta(decision) {
  if (!decision) return null
  if (decision.accion === 'existente' && !decision.id) return null
  if (decision.accion === 'crear' && decision.nombre !== undefined && !decision.nombre.trim()) return null
  return decision
}

// Reúne en un solo lugar todo lo que hay que decidir antes de cargar, una
// entrada por valor distinto y no por fila, y calcula para cada fila con qué
// datos se registraría. Es pura: se vuelve a llamar con cada decisión nueva.
//
// filas: las de procesarArchivo.
// contexto: lo que hay en la base (cargarContexto).
// decisiones: { [llave]: { accion: 'existente' | 'crear' | 'vacio', id?, nombre? } }
// permisos: { crearGrupos, crearEmpresas }
export function construirPlan(filas, contexto, decisiones, permisos) {
  const pendientes = new Map()
  const resultado = []

  const indiceEmpresas = indexarEmpresas(contexto.empresas)
  const independiente = contexto.empresas.find((e) => e.es_independiente) || null
  const nitsNuevos = agruparNitsNuevos(filas, indiceEmpresas)

  function anotar(llave, crear, fila) {
    if (!pendientes.has(llave)) {
      const p = { llave, filas: [], ...crear() }
      // elegida es lo que muestra la pantalla; decision, lo que vale para
      // cargar: un "crear" sin nombre se ve elegido pero no resuelve nada.
      p.elegida = decisiones[llave] ?? p.porDefecto
      p.decision = resuelta(p.elegida)
      pendientes.set(llave, p)
    }
    const p = pendientes.get(llave)
    p.filas.push(fila)
    return p.decision
  }

  for (const f of filas) {
    if (f.estado === 'error') {
      resultado.push({ fila: f.fila, datos: f.datos, estado: 'omitida', motivos: f.errores, avisos: [] })
      continue
    }

    const d = f.datos
    const avisos = [...f.inconsistencias]
    const motivos = []
    const refs = {}

    // --- Curso: obligatorio y cerrado.

    let curso = buscarExacto(contexto.cursos, d.curso)
    if (!curso) {
      const llave = `curso|${normalizar(d.curso)}`
      const decision = anotar(llave, () => {
        const sugerencias = sugerir(d.curso, contexto.cursos)
        const id = preseleccion(sugerencias)
        return {
          tipo: 'curso',
          etiqueta: 'Curso',
          texto: d.curso,
          obligatorio: true,
          opciones: contexto.cursos,
          sugerencias,
          puedeCrear: false,
          puedeVaciar: false,
          porDefecto: id ? { accion: 'existente', id } : null,
        }
      }, f.fila)

      if (decision) curso = contexto.cursos.find((c) => c.id === decision.id)
      else motivos.push(`Falta decidir a qué curso corresponde "${d.curso}"`)
    }

    // --- Grupo: se identifica por curso y fecha de inicio.

    if (curso) {
      const delCurso = contexto.grupos.filter((g) => g.curso_id === curso.id)
      const mismoInicio = delCurso.filter((g) => g.fecha_inicio === d.fecha_inicio)

      if (mismoInicio.length === 1) {
        refs.grupo = { id: mismoInicio[0].id }
        if (mismoInicio[0].fecha_fin !== d.fecha_fin) {
          avisos.push(`El grupo existente termina el ${fechaCorta(mismoInicio[0].fecha_fin)}, no el ${fechaCorta(d.fecha_fin)} del archivo`)
        }
      } else {
        // Con varios grupos el mismo día (paralelos) la fecha final no
        // desempata, así que no entra en la llave.
        const llave = mismoInicio.length
          ? `grupo|${curso.id}|${d.fecha_inicio}`
          : `grupo|${curso.id}|${d.fecha_inicio}|${d.fecha_fin}`

        const decision = anotar(llave, () => {
          const paralelos = mismoInicio.length > 1
          const puedeCrear = !paralelos && permisos.crearGrupos
          return {
            tipo: 'grupo',
            etiqueta: 'Grupo',
            texto: `${curso.nombre} · ${fechaCorta(d.fecha_inicio)} – ${fechaCorta(d.fecha_fin)}`,
            nota: paralelos
              ? 'Hay varios grupos de este curso que empiezan ese día: elige cuál.'
              : 'No existe un grupo de este curso que empiece ese día.',
            obligatorio: true,
            opciones: (paralelos ? mismoInicio : delCurso).map((g) => ({ ...g, nombre: etiquetaGrupo(g) })),
            sugerencias: [],
            puedeCrear,
            puedeVaciar: false,
            crear: { curso_id: curso.id, fecha_inicio: d.fecha_inicio, fecha_fin: d.fecha_fin },
            porDefecto: puedeCrear ? { accion: 'crear' } : null,
          }
        }, f.fila)

        if (decision?.accion === 'existente') refs.grupo = { id: decision.id }
        else if (decision?.accion === 'crear') refs.grupo = { crear: llave }
        else motivos.push('Falta decidir el grupo')

        const finEsperado = sumarDias(d.fecha_inicio, curso.duracion_dias - 1)
        if (decision?.accion === 'crear' && d.fecha_fin !== finEsperado) {
          avisos.push(`La fecha final no corresponde a la duración del curso (${curso.duracion_dias} ${curso.duracion_dias === 1 ? 'día' : 'días'}): se crea el grupo con la del archivo`)
        }
      }
    }

    // --- Empresa: por NIT, nunca por nombre.

    let empresa = null
    if (d.independiente) {
      if (independiente) {
        empresa = independiente
        refs.empresa = { id: independiente.id }
      } else {
        motivos.push('No hay una empresa "independiente" configurada en Dabi')
      }
    } else {
      empresa = buscarPorNit(indiceEmpresas, d.nit)

      if (empresa) {
        refs.empresa = { id: empresa.id }
        if (!empresa.activo) avisos.push(`La empresa ${empresa.razon_social} está desactivada`)
      } else {
        const nueva = nitsNuevos.get(soloDigitos(d.nit))
        const llave = nueva.llave
        const decision = anotar(llave, () => {
          const nombre = nueva.nombre
          const similares = contexto.similaresEmpresa?.[llave] || []
          // La misma regla que el formulario de empresas: con el mismo nombre
          // o el mismo NIT ya registrados, no se deja crear otra.
          const bloqueante = similares.find(
            (s) => s.coincidencia === 'nit_exacto' || s.coincidencia === 'nombre_exacto'
          )
          const puedeCrear = permisos.crearEmpresas && !bloqueante

          let porDefecto = null
          if (bloqueante) porDefecto = { accion: 'existente', id: bloqueante.id }
          else if (puedeCrear && nombre) porDefecto = { accion: 'crear', nombre }

          return {
            tipo: 'empresa',
            etiqueta: 'Empresa',
            texto: nombre || `NIT ${nueva.nit}`,
            nit: nueva.nit,
            nota: bloqueante
              ? `Ya hay una empresa con ${bloqueante.coincidencia === 'nombre_exacto' ? 'ese nombre' : 'ese NIT'}: no se puede crear otra.`
              : 'Ninguna empresa en Dabi tiene ese NIT.',
            obligatorio: true,
            opciones: contexto.empresas
              .filter((e) => !e.es_independiente)
              .map((e) => ({ ...e, nombre: e.nit ? `${e.razon_social} · ${e.nit}` : e.razon_social })),
            sugerencias: similares.map((s) => ({
              ...s,
              nombre: s.razon_social + (DETALLE_COINCIDENCIA[s.coincidencia] || ''),
            })),
            puedeCrear,
            puedeVaciar: false,
            crear: { nit: nueva.nit },
            nombreSugerido: nombre,
            porDefecto,
          }
        }, f.fila)

        if (decision?.accion === 'existente') {
          empresa = contexto.empresas.find((e) => e.id === decision.id)
          refs.empresa = { id: decision.id }
        } else if (decision?.accion === 'crear') {
          refs.empresa = { crear: llave }
        } else {
          motivos.push(`Falta decidir la empresa del NIT ${d.nit}`)
        }
      }
    }

    // --- Catálogos opcionales: nunca frenan la fila.

    for (const campo of CAMPOS_CATALOGO) {
      const texto = d[campo.clave]
      if (!texto) continue

      const opciones = contexto.catalogos[campo.catalogo]
      const exacta = buscarExacto(opciones, texto)
      if (exacta) {
        refs[campo.clave] = { id: exacta.id }
        continue
      }

      const llave = `${campo.clave}|${normalizar(texto)}`
      const decision = anotar(llave, () => {
        const sugerencias = sugerir(texto, opciones)
        const id = preseleccion(sugerencias)
        return {
          tipo: campo.clave,
          etiqueta: campo.etiqueta,
          texto,
          obligatorio: false,
          opciones,
          sugerencias,
          puedeCrear: campo.crear,
          puedeVaciar: true,
          crear: { nombre: texto },
          porDefecto: id
            ? { accion: 'existente', id }
            : { accion: campo.crear ? 'crear' : 'vacio' },
        }
      }, f.fila)

      if (decision?.accion === 'existente') refs[campo.clave] = { id: decision.id }
      else if (decision?.accion === 'crear') refs[campo.clave] = { crear: llave }
    }

    // Igual que el formulario: sin ARL ni sector en la fila, se toman los de
    // la empresa.
    if (!refs.arl && empresa?.arl_id) refs.arl = { id: empresa.arl_id }
    if (!refs.sector && empresa?.sector_id) refs.sector = { id: empresa.sector_id }

    // --- Aprendiz ya registrado: lo de la base manda sobre el nombre, y el
    // archivo solo llena lo que falte. registrar_matricula reescribe los datos
    // personales con lo que recibe, así que una celda vacía borraría el RH o la
    // fecha de nacimiento que ya estaban.

    const existente = contexto.aprendices.get(`${d.tipo_documento}|${d.numero_documento}`) || null

    if (existente && (
      normalizar(existente.nombres) !== normalizar(d.nombres) ||
      normalizar(existente.apellidos) !== normalizar(d.apellidos)
    )) {
      avisos.push(`Ya está registrado como ${existente.apellidos} ${existente.nombres}: se conserva ese nombre`)
    }

    resultado.push({
      fila: f.fila,
      datos: d,
      estado: motivos.length ? 'bloqueada' : 'lista',
      motivos,
      avisos,
      refs,
      aprendiz: {
        tipo_documento: d.tipo_documento,
        numero_documento: existente?.numero_documento ?? d.numero_documento,
        nombres: existente?.nombres ?? d.nombres,
        apellidos: existente?.apellidos ?? d.apellidos,
        sexo: d.sexo || existente?.sexo || null,
        pais: d.pais || existente?.pais || 'Colombia',
        fecha_nacimiento: d.fecha_nacimiento || existente?.fecha_nacimiento || null,
        nivel_educativo_id: refs.nivel_educativo?.id ?? existente?.nivel_educativo_id ?? null,
        rh: d.rh || existente?.rh || null,
      },
    })
  }

  const listaPendientes = [...pendientes.values()].sort(
    (a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)
  )

  const conteo = { lista: 0, bloqueada: 0, omitida: 0 }
  for (const r of resultado) conteo[r.estado]++

  return { pendientes: listaPendientes, filas: resultado, conteo }
}

// Llaves de lo que hay que crear y que de verdad usa alguna fila lista. Un
// grupo nuevo cuyas filas quedaron todas bloqueadas por otra razón no se crea.
export function llavesPorCrear(plan) {
  const usadas = new Set()
  for (const f of plan.filas) {
    if (f.estado !== 'lista') continue
    for (const ref of Object.values(f.refs)) if (ref?.crear) usadas.add(ref.crear)
  }
  return plan.pendientes.filter((p) => usadas.has(p.llave))
}
