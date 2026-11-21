import assert from 'node:assert/strict'
import {
  procesarArchivo, parsearFecha, digitoVerificacion, generarPlantilla, COLUMNAS, decodificar,
} from '../src/lib/importarMatriculas.js'

const utf8 = (s) => new TextEncoder().encode(s).buffer
// Windows-1252 a mano: solo hace falta para las letras con tilde y la ñ.
const MAPA_1252 = { 'á': 0xE1, 'é': 0xE9, 'í': 0xED, 'ó': 0xF3, 'ú': 0xFA, 'ñ': 0xF1, 'Ñ': 0xD1, 'Á': 0xC1, 'É': 0xC9, 'Í': 0xCD, 'Ó': 0xD3, 'Ú': 0xDA }
const win1252 = (s) => new Uint8Array([...s].map((c) => MAPA_1252[c] ?? c.charCodeAt(0))).buffer

let pasadas = 0
function prueba(nombre, fn) {
  fn()
  pasadas++
  console.log('ok -', nombre)
}

const ENC = COLUMNAS.map((c) => c.encabezado)

prueba('dígito de verificación DIAN (Bancolombia 890903938-8)', () => {
  assert.equal(digitoVerificacion('890903938'), 8)
  assert.equal(digitoVerificacion('890.903.938'), 8)
})

prueba('fechas', () => {
  assert.equal(parsearFecha('03/11/2026'), '2026-11-03')
  assert.equal(parsearFecha('3/11/2026'), '2026-11-03')
  assert.equal(parsearFecha('3-11-2026'), '2026-11-03')
  assert.equal(parsearFecha('2026-11-03'), '2026-11-03')
  assert.equal(parsearFecha('31/02/2026'), null)
  assert.equal(parsearFecha('29/02/2024'), '2024-02-29')
  assert.equal(parsearFecha('29/02/2026'), null)
  assert.equal(parsearFecha('45967'), null)
  assert.equal(parsearFecha('3/11/26'), null)
})

prueba('punto y coma + Windows-1252 + encabezados con otras mayúsculas y sin tildes', () => {
  const csv = [
    'TIPO DE DOCUMENTO;numero de documento;Nombres;Apellidos;Curso;Fecha inicial;Fecha final;Fecha de ingreso;Nit;Empresa;Pais',
    'CC;1.023.456.789;José;Peña Muñoz;Trabajo en alturas avanzado;03/11/2026;07/11/2026;03/11/2026;890.903.938-8;Bancolombia;',
  ].join('\r\n')
  const r = procesarArchivo(win1252(csv))
  assert.equal(r.error, undefined)
  const [f] = r.filas
  assert.equal(f.fila, 2)
  assert.equal(f.estado, 'valida', JSON.stringify(f))
  assert.equal(f.datos.nombres, 'José')
  assert.equal(f.datos.apellidos, 'Peña Muñoz')
  assert.equal(f.datos.numero_documento, '1023456789')
  assert.equal(f.datos.pais, '')
  assert.equal(f.datos.independiente, false)
})

prueba('coma + BOM UTF-8 + campo entre comillas con comas y salto de línea', () => {
  const csv = '﻿' + [
    ENC.join(','),
    'CC,123,Ana,Ruiz,Básico,01/11/2026,01/11/2026,01/11/2026,independiente,,F,O+,,,,,,,,,,,"Llegó tarde, sin casco,\nse le prestó uno"',
  ].join('\n')
  const r = procesarArchivo(utf8(csv))
  const [f] = r.filas
  assert.equal(f.estado, 'valida', JSON.stringify(f))
  assert.equal(f.datos.independiente, true)
  assert.equal(f.datos.observaciones, 'Llegó tarde, sin casco, se le prestó uno')
})

prueba('el texto con tildes en UTF-8 no se confunde con Windows-1252', () => {
  assert.equal(decodificar(utf8('Peña')), 'Peña')
  assert.equal(decodificar(win1252('Peña')), 'Peña')
})

prueba('filas vacías en medio conservan el número de fila de Excel', () => {
  const csv = [
    ENC.join(';'),
    'CC;1;A;B;Curso;01/11/2026;02/11/2026;01/11/2026;independiente',
    ';;;;;;;;',
    '',
    'CC;2;C;D;Curso;01/11/2026;02/11/2026;01/11/2026;independiente',
  ].join('\n')
  const r = procesarArchivo(utf8(csv))
  assert.deepEqual(r.filas.map((f) => f.fila), [2, 5])
})

prueba('errores y avisos de cada tipo', () => {
  const csv = [
    ENC.join(';'),
    // 2: DV del NIT mal
    'CC;10;A;B;Curso;01/11/2026;05/11/2026;01/11/2026;890903938-7',
    // 3: fecha imposible y serial de Excel
    'CC;11;A;B;Curso;31/02/2026;45967;01/11/2026;independiente',
    // 4: ingreso después del curso: aquí no se marca, se marca al cruzar con
    // la base, cuando ya se conocen las fechas reales del grupo.
    'CC;12;A;B;Curso;01/11/2026;05/11/2026;10/11/2026;independiente',
    // 5: opcionales mal escritos -> avisos, y RH con cero y en palabras
    'CC;13;A;B;Curso;01/11/2026;05/11/2026;01/11/2026;independiente;;Masculino;0 positivo;30/02/1990',
    // 6: obligatorios vacíos
    ';;;;;;;;',
    // 7: NIT vacío, tipo raro, letras en una cédula
    'C.C;12a;A;B;Curso;01/11/2026;05/11/2026;01/11/2026;',
    // 8: final antes que la inicial
    'CE;14;A;B;Curso;05/11/2026;01/11/2026;05/11/2026;independiente',
    // 9: repetida de la fila 4
    'CC;12;Otro;Nombre;CURSO;01/11/2026;05/11/2026;01/11/2026;independiente',
  ].join('\n')
  const r = procesarArchivo(utf8(csv))
  const porFila = Object.fromEntries(r.filas.map((f) => [f.fila, f]))

  assert.equal(porFila[2].estado, 'error')
  assert.match(porFila[2].errores[0], /dígito de verificación/)

  assert.equal(porFila[3].estado, 'error')
  assert.ok(porFila[3].errores.some((e) => /número de Excel/.test(e)))
  assert.ok(porFila[3].errores.some((e) => /31\/02\/2026/.test(e)))

  assert.equal(porFila[4].estado, 'valida')

  assert.equal(porFila[5].estado, 'inconsistencia', JSON.stringify(porFila[5]))
  assert.equal(porFila[5].datos.sexo, 'M')
  assert.equal(porFila[5].datos.rh, 'O+')
  assert.equal(porFila[5].datos.fecha_nacimiento, null)

  // La fila 6 es solo punto y coma: se descarta como vacía.
  assert.equal(porFila[6], undefined)

  assert.equal(porFila[7].estado, 'error')
  assert.equal(porFila[7].datos.tipo_documento, 'CC')
  assert.ok(porFila[7].errores.some((e) => /solo dígitos/.test(e)))
  assert.ok(porFila[7].errores.some((e) => /Falta el NIT/.test(e)))

  assert.equal(porFila[8].estado, 'error')
  assert.ok(porFila[8].errores.some((e) => /anterior a la inicial/.test(e)))

  assert.equal(porFila[9].estado, 'error')
  assert.match(porFila[9].errores.at(-1), /fila 4/)
})

prueba('así llegan los archivos reales', () => {
  const csv = [
    ENC.join(';'),
    // 2: sin ninguna fecha del curso: se calcula después.
    'CC;101;A;B;Curso;;;20/11/2026;900560647-1;Eficiencia',
    // 3: solo la final.
    'CC;102;A;B;Curso;;20/11/2026;20/11/2026;900560647-1;Eficiencia',
    // 4: independiente escrito en la columna Empresa, con la cédula en el NIT.
    'CC;1023967653;A;B;Curso;;;20/11/2026;1023967653;INDEPENDIENTE',
    // 5: el NIT es la cédula del aprendiz, y la empresa su propio nombre.
    'CC;1036630032;A;B;Curso;;;20/11/2026;1036630032;A B',
    // 6: independiente en Empresa y sin NIT.
    'CC;104;A;B;Curso;;;20/11/2026;;Independiente',
    // 7: NIT con espacios entre los dígitos y fechas opcionales anotadas.
    'CC;105;A;B;Curso;;;20/11/2026;9 0 0 5 4 5 9 6 0 1;Procom;;;;;;SURA;PLANILLA 06/11/2026;;GLOBAL',
    // 8: una fecha del curso mal escrita sí es error.
    'CC;106;A;B;Curso;20-11;;20/11/2026;independiente',
  ].join('\n')
  const porFila = Object.fromEntries(procesarArchivo(utf8(csv)).filas.map((f) => [f.fila, f]))

  assert.equal(porFila[2].estado, 'valida', JSON.stringify(porFila[2]))
  assert.equal(porFila[2].datos.fecha_inicio, undefined)
  assert.equal(porFila[3].datos.fecha_fin, '2026-11-20')

  for (const n of [4, 5, 6]) {
    assert.equal(porFila[n].estado, 'valida', JSON.stringify(porFila[n]))
    assert.equal(porFila[n].datos.independiente, true, `fila ${n}`)
  }

  assert.equal(porFila[7].datos.independiente, false)
  assert.equal(porFila[7].datos.fecha_arl, '2026-11-06')
  assert.equal(porFila[7].datos.fecha_examen, null)
  assert.equal(porFila[7].estado, 'inconsistencia')
  assert.match(porFila[7].inconsistencias[0], /GLOBAL/)

  assert.equal(porFila[8].estado, 'error')
  assert.match(porFila[8].errores[0], /Fecha inicial/)
})

prueba('columnas obligatorias faltantes e ignoradas', () => {
  const csv = 'Tipo de documento;Número de documento;Nombres;Fecha de ingresso;Columna rara\nCC;1;A;01/11/2026;x'
  const r = procesarArchivo(utf8(csv))
  assert.ok(r.error)
  assert.ok(r.faltantes.includes('Fecha de ingreso'))
  assert.ok(r.faltantes.includes('NIT'))
  assert.deepEqual(r.ignoradas, ['Fecha de ingresso', 'Columna rara'])
})

prueba('archivo vacío y sin filas', () => {
  assert.match(procesarArchivo(utf8('')).error, /vacío/)
  assert.match(procesarArchivo(utf8(ENC.join(';') + '\n')).error, /ninguna fila/)
})

prueba('límite de filas', () => {
  const fila = 'CC;1;A;B;Curso;01/11/2026;02/11/2026;01/11/2026;independiente'
  const csv = [ENC.join(';'), ...Array(501).fill(fila)].join('\n')
  assert.match(procesarArchivo(utf8(csv)).error, /501 filas/)
})

// Tal como la escribe descargarCsv: marca UTF-8 delante.
const comoSeDescarga = '﻿' + generarPlantilla()
const r = procesarArchivo(utf8(comoSeDescarga + 'CC;1;A;B;Curso;01/11/2026;02/11/2026;01/11/2026;independiente\r\n'))
assert.equal(r.error, undefined)
assert.equal(r.filas[0].estado, 'valida')
assert.deepEqual(r.ignoradas, [])
console.log('ok - la plantilla, con una fila, se lee completa y sin columnas ignoradas')

console.log(`\n${pasadas + 1} pruebas pasadas`)
