import Papa from 'papaparse'

// Columnas de la plantilla, en el orden en que se descarga. Empresa no es
// obligatoria aquí porque solo hace falta cuando el NIT no existe en la base,
// y eso se sabe al cruzar con la base, no al leer el archivo. Las fechas del
// curso tampoco: la que falte se calcula con la duración del curso.
export const COLUMNAS = [
  { clave: 'tipo_documento', encabezado: 'Tipo de documento', obligatoria: true },
  { clave: 'numero_documento', encabezado: 'Número de documento', obligatoria: true },
  { clave: 'nombres', encabezado: 'Nombres', obligatoria: true },
  { clave: 'apellidos', encabezado: 'Apellidos', obligatoria: true },
  { clave: 'curso', encabezado: 'Curso', obligatoria: true },
  { clave: 'fecha_inicio', encabezado: 'Fecha inicial' },
  { clave: 'fecha_fin', encabezado: 'Fecha final' },
  { clave: 'fecha_ingreso', encabezado: 'Fecha de ingreso', obligatoria: true },
  { clave: 'nit', encabezado: 'NIT', obligatoria: true },
  { clave: 'empresa', encabezado: 'Empresa' },
  { clave: 'sexo', encabezado: 'Sexo' },
  { clave: 'rh', encabezado: 'RH' },
  { clave: 'fecha_nacimiento', encabezado: 'Fecha de nacimiento' },
  { clave: 'pais', encabezado: 'País' },
  { clave: 'nivel_educativo', encabezado: 'Nivel educativo' },
  { clave: 'arl', encabezado: 'ARL' },
  { clave: 'fecha_arl', encabezado: 'Fecha ARL' },
  { clave: 'eps', encabezado: 'EPS' },
  { clave: 'fecha_examen', encabezado: 'Fecha examen médico' },
  { clave: 'area', encabezado: 'Área' },
  { clave: 'cargo', encabezado: 'Cargo' },
  { clave: 'sector', encabezado: 'Sector' },
  { clave: 'observaciones', encabezado: 'Observaciones' },
]

// Por encima de esto el navegador tarda en pintar la previa, y una carga a
// medias de miles de filas es difícil de retomar. Se parte el archivo.
export const MAXIMO_FILAS = 500

export const NIT_INDEPENDIENTE = 'independiente'

const TIPOS_DOCUMENTO = ['CC', 'CE', 'PPT', 'PA']
const TIPOS_SOLO_DIGITOS = ['CC', 'CE', 'PPT']
const TIPOS_RH = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

// Solo para comparar, nunca para guardar: "Peña", "PENA" y "pena " quedan
// iguales.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Los aprendices se buscan por número exacto: "1.023.456" y "1023456" serían
// dos personas distintas.
export function normalizarDocumento(numero) {
  return String(numero ?? '').toUpperCase().replace(/[.\s-]/g, '')
}

function limpiar(texto) {
  return String(texto ?? '').replace(/\s+/g, ' ').trim()
}

// Excel en español guarda el "CSV" clásico en Windows-1252, y el "CSV UTF-8"
// en UTF-8. Un archivo en Windows-1252 con tildes no es UTF-8 válido, así que
// el intento estricto falla justo cuando tiene que fallar.
export function decodificar(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

// Sin skipEmptyLines a propósito: si se saltaran las filas vacías, el número
// de fila dejaría de coincidir con el de Excel. Se descartan después, pero
// conservando su posición.
export function leerRegistros(texto) {
  return Papa.parse(texto).data
}

export function mapearEncabezados(encabezados) {
  const porNombre = new Map(COLUMNAS.map((c) => [normalizar(c.encabezado), c.clave]))
  const indices = {}
  const ignoradas = []

  encabezados.forEach((encabezado, i) => {
    const clave = porNombre.get(normalizar(encabezado))
    if (clave && indices[clave] === undefined) {
      indices[clave] = i
    } else if (normalizar(encabezado) !== '') {
      ignoradas.push(limpiar(encabezado))
    }
  })

  const faltantes = COLUMNAS
    .filter((c) => c.obligatoria && indices[c.clave] === undefined)
    .map((c) => c.encabezado)

  return { indices, faltantes, ignoradas }
}

// Devuelve aaaa-mm-dd, o null si no es una fecha real. Se espera dd/mm/aaaa,
// que es como Excel en español escribe las fechas al guardar en CSV; también
// se acepta aaaa-mm-dd por si el archivo sale de otro sistema.
export function parsearFecha(texto) {
  const t = String(texto).trim()
  const latina = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!latina && !iso) return null

  const [dia, mes, anio] = latina
    ? [latina[1], latina[2], latina[3]].map(Number)
    : [iso[3], iso[2], iso[1]].map(Number)

  if (anio < 1900 || anio > 2100) return null

  // El 31/02 no existe: Date lo corre al 3 de marzo, y la comparación lo
  // delata.
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null

  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Para fechas opcionales que vienen anotadas, como "PLANILLA 06/11/2026": si
// hay exactamente una fecha en el texto, es esa.
function extraerFecha(texto) {
  const encontradas = String(texto).match(/\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2}/g)
  return encontradas?.length === 1 ? parsearFecha(encontradas[0]) : null
}

function explicarFechaInvalida(nombre, texto) {
  // Una columna con formato de número guarda la fecha como su serial de Excel.
  if (/^\d{5}$/.test(String(texto).trim())) {
    return `${nombre}: "${texto}" es un número de Excel, no una fecha. Dale formato de fecha a esa columna antes de guardar.`
  }
  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2}$/.test(String(texto).trim())) {
    return `${nombre}: "${texto}" tiene el año en dos dígitos. Usa el año completo.`
  }
  return `${nombre}: "${texto}" no es una fecha válida (se espera dd/mm/aaaa).`
}

// Algoritmo de la DIAN: pesos fijos sobre los dígitos de derecha a izquierda,
// módulo 11.
const PESOS_DV = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

export function digitoVerificacion(nit) {
  const digitos = String(nit).replace(/\D/g, '')
  let suma = 0
  for (let i = 0; i < digitos.length; i++) {
    suma += Number(digitos[digitos.length - 1 - i]) * PESOS_DV[i]
  }
  const residuo = suma % 11
  return residuo > 1 ? 11 - residuo : residuo
}

function esSuDocumento(nit, documento) {
  const n = String(nit).replace(/\D/g, '')
  return n !== '' && (n === documento || n === documento + digitoVerificacion(documento))
}

function normalizarSexo(texto) {
  const t = normalizar(texto)
  if (['m', 'masculino', 'hombre'].includes(t)) return 'M'
  if (['f', 'femenino', 'mujer'].includes(t)) return 'F'
  return null
}

function normalizarRh(texto) {
  const t = String(texto)
    .toUpperCase()
    .replace(/POSITIVO/g, '+')
    .replace(/NEGATIVO/g, '-')
    .replace(/\s+/g, '')
    // Cero en vez de la letra O.
    .replace(/^0/, 'O')
  return TIPOS_RH.includes(t) ? t : null
}

function procesarFila(celdas, indices, fila) {
  const celda = (clave) =>
    indices[clave] === undefined ? '' : limpiar(celdas[indices[clave]])

  const datos = {}
  const errores = []
  const inconsistencias = []

  // --- Obligatorios: si fallan, la fila no entra.

  const tipo = celda('tipo_documento').toUpperCase().replace(/[^A-Z]/g, '')
  if (!tipo) errores.push('Falta el tipo de documento')
  else if (!TIPOS_DOCUMENTO.includes(tipo)) errores.push(`Tipo de documento "${celda('tipo_documento')}" no válido (CC, CE, PPT o PA)`)
  else datos.tipo_documento = tipo

  const numero = normalizarDocumento(celda('numero_documento'))
  if (!numero) errores.push('Falta el número de documento')
  else if (TIPOS_SOLO_DIGITOS.includes(datos.tipo_documento) && !/^\d+$/.test(numero)) {
    errores.push(`Número de documento "${celda('numero_documento')}" debe tener solo dígitos`)
  } else datos.numero_documento = numero

  datos.nombres = celda('nombres')
  if (!datos.nombres) errores.push('Faltan los nombres')

  datos.apellidos = celda('apellidos')
  if (!datos.apellidos) errores.push('Faltan los apellidos')

  datos.curso = celda('curso')
  if (!datos.curso) errores.push('Falta el curso')

  // Una fecha del curso que no viene se calcula después con la duración del
  // curso; una que viene mal escrita sí es error, porque define el grupo.
  for (const [clave, nombre, obligatoria] of [
    ['fecha_inicio', 'Fecha inicial', false],
    ['fecha_fin', 'Fecha final', false],
    ['fecha_ingreso', 'Fecha de ingreso', true],
  ]) {
    const texto = celda(clave)
    if (!texto) {
      if (obligatoria) errores.push(`Falta la ${nombre.toLowerCase()}`)
      continue
    }
    const iso = parsearFecha(texto)
    if (iso) datos[clave] = iso
    else errores.push(explicarFechaInvalida(nombre, texto))
  }

  if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) {
    errores.push('La fecha final es anterior a la inicial')
  }

  datos.empresa = celda('empresa')

  // Independiente se reconoce de tres formas, porque las tres aparecen en los
  // archivos reales: la palabra en el NIT, la palabra en Empresa, o el NIT
  // igual al documento del propio aprendiz.
  const nit = celda('nit')
  if (
    normalizar(nit) === NIT_INDEPENDIENTE ||
    normalizar(datos.empresa) === NIT_INDEPENDIENTE ||
    (nit && datos.numero_documento && esSuDocumento(nit, datos.numero_documento))
  ) {
    datos.independiente = true
  } else if (!nit) {
    errores.push('Falta el NIT (o la palabra "independiente")')
  } else if (!/\d/.test(nit)) {
    errores.push(`NIT "${nit}" no válido`)
  } else {
    datos.independiente = false
    datos.nit = nit
    // Solo se puede comprobar si viene separado con guion: sin él no se sabe
    // si el último dígito es el de verificación o parte del número.
    const conGuion = nit.match(/^([\d.\s]+)-\s*(\d)$/)
    if (conGuion && digitoVerificacion(conGuion[1]) !== Number(conGuion[2])) {
      errores.push(`El dígito de verificación del NIT ${nit} no corresponde: revisa el número`)
    }
  }

  // --- Opcionales: si vienen mal se dejan vacíos y se avisa. La matrícula
  // entra y el dato aparece en Faltantes, igual que al registrar a mano.

  const sexo = celda('sexo')
  if (sexo) {
    datos.sexo = normalizarSexo(sexo)
    if (!datos.sexo) inconsistencias.push(`Sexo "${sexo}" no reconocido (M o F): queda vacío`)
  }

  const rh = celda('rh')
  if (rh) {
    datos.rh = normalizarRh(rh)
    if (!datos.rh) inconsistencias.push(`RH "${rh}" no reconocido: queda vacío`)
  }

  for (const [clave, nombre] of [
    ['fecha_nacimiento', 'Fecha de nacimiento'],
    ['fecha_arl', 'Fecha ARL'],
    ['fecha_examen', 'Fecha examen médico'],
  ]) {
    const texto = celda(clave)
    if (!texto) continue
    datos[clave] = parsearFecha(texto) || extraerFecha(texto)
    if (!datos[clave]) inconsistencias.push(`${explicarFechaInvalida(nombre, texto)} Queda vacía.`)
  }

  for (const clave of ['pais', 'nivel_educativo', 'arl', 'eps', 'area', 'cargo', 'sector', 'observaciones']) {
    datos[clave] = celda(clave)
  }

  const estado = errores.length ? 'error' : inconsistencias.length ? 'inconsistencia' : 'valida'
  return { fila, datos, errores, inconsistencias, estado }
}

// La misma persona dos veces en el mismo curso y fechas es un copiar y pegar
// de más. La misma persona en dos cursos distintos sí es válida.
function marcarRepetidas(filas) {
  const vistas = new Map()

  for (const f of filas) {
    const d = f.datos
    const fecha = d.fecha_inicio || d.fecha_fin || d.fecha_ingreso
    if (!d.tipo_documento || !d.numero_documento || !d.curso || !fecha) continue

    const llave = [d.tipo_documento, d.numero_documento, normalizar(d.curso), fecha].join('|')
    if (vistas.has(llave)) {
      f.errores.push(`Repetida: es la misma persona y el mismo curso de la fila ${vistas.get(llave)}`)
      f.estado = 'error'
    } else {
      vistas.set(llave, f.fila)
    }
  }
}

export function procesarArchivo(buffer) {
  const registros = leerRegistros(decodificar(buffer))
  const [encabezados, ...resto] = registros

  if (!encabezados || encabezados.every((c) => !limpiar(c))) {
    return { error: 'El archivo está vacío.' }
  }

  const { indices, faltantes, ignoradas } = mapearEncabezados(encabezados)

  if (faltantes.length) {
    return {
      error: 'Al archivo le faltan columnas obligatorias. Usa la plantilla para ver los nombres exactos.',
      faltantes,
      ignoradas,
    }
  }

  // El índice + 2 es el número de fila en Excel: +1 por empezar en cero y +1
  // por el encabezado.
  const filas = resto
    .map((celdas, i) => ({ celdas, fila: i + 2 }))
    .filter(({ celdas }) => celdas.some((c) => limpiar(c)))
    .map(({ celdas, fila }) => procesarFila(celdas, indices, fila))

  if (filas.length === 0) {
    return { error: 'El archivo tiene encabezados pero ninguna fila con datos.' }
  }

  if (filas.length > MAXIMO_FILAS) {
    return {
      error: `El archivo tiene ${filas.length} filas y el máximo por carga es ${MAXIMO_FILAS}. Divídelo en varios archivos.`,
    }
  }

  marcarRepetidas(filas)

  return { filas, ignoradas }
}

// Con punto y coma porque es lo que Excel en español separa en columnas al
// abrir; la marca UTF-8 la pone descargarCsv. Solo encabezados, sin fila de
// ejemplo: una fila de ejemplo olvidada en el archivo terminaría importada como
// una persona real.
export function generarPlantilla() {
  return COLUMNAS.map((c) => c.encabezado).join(';') + '\r\n'
}
