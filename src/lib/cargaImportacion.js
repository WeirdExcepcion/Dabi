import { supabase } from './supabaseClient'
import { pedirCatalogo, invalidarCatalogo } from './catalogos'
import { normalizarDocumento } from './importarMatriculas'
import {
  CAMPOS_CATALOGO,
  DIAS_VENTANA_GRUPOS,
  agruparNitsNuevos,
  indexarEmpresas,
  llavesPorCrear,
  sumarDias,
} from './planImportacion'

// Supabase devuelve como mucho mil filas por consulta y corta sin avisar.
const POR_PAGINA = 1000
// Valores por filtro .in(): van en la URL, y una URL demasiado larga falla.
const POR_LOTE = 150

const CAMPOS_APRENDIZ =
  'id, tipo_documento, numero_documento, nombres, apellidos, sexo, pais, fecha_nacimiento, nivel_educativo_id, rh'

async function traerTodo(consulta) {
  const filas = []
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await consulta().range(desde, desde + POR_PAGINA - 1)
    if (error) throw error
    filas.push(...data)
    if (data.length < POR_PAGINA) return filas
  }
}

async function cargarCatalogos() {
  const nombres = [...new Set(CAMPOS_CATALOGO.map((c) => c.catalogo))]
  const listas = await Promise.all(nombres.map(pedirCatalogo))
  return Object.fromEntries(nombres.map((n, i) => [n, listas[i]]))
}

// Los documentos guardados con puntos o espacios no aparecen al buscar el
// número limpio, así que se traen aparte y se comparan ya normalizados. Si una
// persona está de las dos formas, gana la que coincide exacto.
async function buscarAprendices(numeros) {
  const lotes = []
  for (let i = 0; i < numeros.length; i += POR_LOTE) lotes.push(numeros.slice(i, i + POR_LOTE))

  const [exactos, conSimbolos] = await Promise.all([
    Promise.all(lotes.map((lote) =>
      traerTodo(() => supabase.from('aprendices').select(CAMPOS_APRENDIZ).in('numero_documento', lote).order('id'))
    )).then((r) => r.flat()),
    traerTodo(() =>
      supabase.from('aprendices').select(CAMPOS_APRENDIZ).not('numero_documento', 'match', '^[0-9A-Za-z]+$').order('id')
    ),
  ])

  const buscados = new Set(numeros)
  const porDocumento = new Map()
  for (const a of [...exactos, ...conSimbolos]) {
    const numero = normalizarDocumento(a.numero_documento)
    const llave = `${a.tipo_documento}|${numero}`
    if (buscados.has(numero) && !porDocumento.has(llave)) porDocumento.set(llave, a)
  }
  return porDocumento
}

// Todo lo que construirPlan necesita de la base, en una sola pasada.
export async function cargarContexto(filas) {
  const validas = filas.filter((f) => f.estado !== 'error')
  // Todas las fechas que traiga el archivo, porque el grupo se puede buscar por
  // cualquiera de ellas.
  const fechas = validas
    .flatMap((f) => [f.datos.fecha_inicio, f.datos.fecha_fin, f.datos.fecha_ingreso])
    .filter(Boolean)
    .sort()
  const numeros = [...new Set(validas.map((f) => f.datos.numero_documento))]

  const [cursos, grupos, empresas, catalogos, aprendices] = await Promise.all([
    traerTodo(() => supabase.from('cursos').select('id, nombre, duracion_dias').eq('activo', true).order('id')),
    traerTodo(() =>
      supabase
        .from('grupos')
        .select('id, curso_id, fecha_inicio, fecha_fin, identificador')
        .gte('fecha_inicio', sumarDias(fechas[0], -DIAS_VENTANA_GRUPOS))
        .lte('fecha_inicio', sumarDias(fechas.at(-1), DIAS_VENTANA_GRUPOS))
        .order('id')
    ),
    // También las desactivadas: si el NIT es de una de ellas, crearla de
    // nuevo chocaría con el NIT único.
    traerTodo(() =>
      supabase.from('empresas').select('id, razon_social, nit, es_independiente, activo, arl_id, sector_id').order('id')
    ),
    cargarCatalogos(),
    buscarAprendices(numeros),
  ])

  // Para las empresas nuevas se piden parecidos con la misma función que usa
  // el formulario de empresas: una consulta por empresa, no por fila.
  const nuevas = new Set(agruparNitsNuevos(validas, indexarEmpresas(empresas)).values())
  const similaresEmpresa = {}
  await Promise.all([...nuevas].map(async (g) => {
    const { data, error } = await supabase.rpc('buscar_empresas_similares', {
      p_nit: g.nit,
      p_razon_social: g.nombre || null,
    })
    if (error) console.error(error.message)
    similaresEmpresa[g.llave] = data || []
  }))

  return { cursos, grupos, empresas, catalogos, aprendices, similaresEmpresa }
}

// Al cargar solo se crean cargos: no piden más dato que el nombre. Grupos y
// empresas se crean antes, desde su formulario, en la pantalla de resolución.
async function crearCargo(p) {
  // p_forzar porque la decisión ya se tomó en la pantalla de resolución.
  const { data, error } = await supabase.rpc('crear_o_encontrar_cargo', {
    p_nombre: p.crear.nombre,
    p_forzar: true,
  })
  if (error) {
    console.error(error.message)
    return { error: `No se pudo crear el cargo ${p.crear.nombre}` }
  }
  return { id: data.id }
}

async function registrar(f, creados) {
  const ids = {}
  // Avisos que nacen al cargar, aparte de los que ya se vieron antes.
  const avisosCarga = []

  for (const [clave, ref] of Object.entries(f.refs)) {
    if (ref.id) {
      ids[clave] = ref.id
      continue
    }
    // Lo que se crea al cargar es opcional: si falla, la matrícula entra con
    // ese dato vacío.
    const creado = creados[ref.crear]
    if (creado.id) ids[clave] = creado.id
    else avisosCarga.push(`${creado.error}: queda vacío`)
  }

  const a = f.aprendiz
  const d = f.datos
  const { error } = await supabase.rpc('registrar_matricula', {
    p_tipo_documento: a.tipo_documento,
    p_numero_documento: a.numero_documento,
    p_nombres: a.nombres,
    p_apellidos: a.apellidos,
    p_sexo: a.sexo,
    p_pais: a.pais,
    p_fecha_nacimiento: a.fecha_nacimiento,
    p_nivel_educativo_id: a.nivel_educativo_id,
    p_rh: a.rh,
    p_grupo_id: ids.grupo,
    p_empresa_id: ids.empresa,
    p_arl_id: ids.arl ?? null,
    p_eps_id: ids.eps ?? null,
    p_area_id: ids.area ?? null,
    p_cargo_id: ids.cargo ?? null,
    p_fecha_arl: d.fecha_arl || null,
    p_fecha_examen: d.fecha_examen || null,
    p_fecha_ingreso: d.fecha_ingreso,
    p_sector_id: ids.sector ?? null,
    p_observaciones: d.observaciones || null,
  })

  if (!error) return { resultado: 'cargada', avisosCarga }

  // Volver a subir un archivo ya cargado a medias es la forma de retomarlo:
  // lo que ya estaba no cuenta como fallo.
  if (error.code === '23505') {
    return { resultado: 'ya_estaba', motivo: 'Ya estaba matriculado en ese grupo', avisosCarga }
  }
  if (error.message.includes('fechas que se cruzan')) {
    return { resultado: 'error', motivo: 'Ya está en otro grupo con fechas que se cruzan', avisosCarga }
  }

  console.error(error.message)
  return { resultado: 'error', motivo: 'No se pudo registrar la matrícula', detalle: error.message, avisosCarga }
}

// Primero crea los cargos nuevos y después registra fila por fila, en orden:
// una misma persona en dos cursos del archivo necesita que la primera
// matrícula la haya creado antes de llegar a la segunda.
export async function ejecutarCarga(plan, alAvanzar) {
  const creados = {}
  for (const p of llavesPorCrear(plan)) {
    try {
      creados[p.llave] = await crearCargo(p)
    } catch (err) {
      console.error(err)
      creados[p.llave] = { error: `No se pudo crear el cargo ${p.texto}` }
    }
  }
  if (Object.keys(creados).length) invalidarCatalogo('cargos')

  const listas = plan.filas.filter((f) => f.estado === 'lista')
  const resultados = []

  for (const [i, f] of listas.entries()) {
    try {
      resultados.push({ ...f, ...(await registrar(f, creados)) })
    } catch (err) {
      console.error(err)
      resultados.push({ ...f, resultado: 'error', motivo: 'Se perdió la conexión al registrar esta fila' })
    }
    alAvanzar(i + 1, listas.length)
  }

  return resultados
}
