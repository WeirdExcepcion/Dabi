import { supabase } from './supabaseClient'

const CAMPOS = `
  aprendices (
    tipo_documento, numero_documento, nombres, apellidos,
    sexo, pais, fecha_nacimiento,
    niveles_educativos ( nombre )
  ),
  empresas ( razon_social, sectores ( nombre ) ),
  sectores ( nombre ),
  arls ( nombre ),
  areas ( nombre ),
  cargos ( nombre )
`

const SEXO = { M: 'MASCULINO', F: 'FEMENINO' }

function separarNombres(texto) {
  const limpio = (texto || '').trim().replace(/\s+/g, ' ')
  if (!limpio) return { primero: '', segundo: '', dudoso: false }

  const partes = limpio.split(' ')

  if (partes.length === 1) {
    return { primero: partes[0], segundo: '', dudoso: false }
  }

  if (partes.length === 2) {
    return { primero: partes[0], segundo: partes[1], dudoso: false }
  }

  return {
    primero: partes[0],
    segundo: partes.slice(1).join(' '),
    dudoso: true,
  }
}

function fechaMMDDYYYY(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${mes}/${dia}/${anio}`
}

export async function obtenerFilasGrupo(grupoId) {
  const { data, error } = await supabase
    .from('matriculas')
    .select(CAMPOS)
    .eq('grupo_id', grupoId)
    .neq('estado', 'anulado')
    .order('id')

  if (error) throw new Error(error.message)

  return (data || []).map((m) => {
    const a = m.aprendices
    const nom = separarNombres(a.nombres)
    const ape = separarNombres(a.apellidos)

    return {
      tipoDocumento: a.tipo_documento || '',
      documento: a.numero_documento || '',
      primerNombre: nom.primero,
      segundoNombre: nom.segundo,
      primerApellido: ape.primero,
      segundoApellido: ape.segundo,
      sexo: SEXO[a.sexo] || '',
      pais: a.pais || '',
      fechaNacimiento: fechaMMDDYYYY(a.fecha_nacimiento),
      nivelEducativo: a.niveles_educativos?.nombre || '',
      sectorLaboral: m.areas?.nombre || '',
      cargo: m.cargos?.nombre || '',
      sectorEconomico: m.sectores?.nombre || m.empresas?.sectores?.nombre || '',
      razonSocial: m.empresas?.razon_social || '',
      arl: m.arls?.nombre || '',
      dudoso: nom.dudoso || ape.dudoso,
      faltantes: [
        !a.sexo && 'sexo',
        !a.pais && 'país',
        !a.fecha_nacimiento && 'fecha de nacimiento',
        !a.niveles_educativos?.nombre && 'nivel educativo',
        !m.areas?.nombre && 'sector laboral',
        !m.cargos?.nombre && 'cargo',
        !(m.sectores?.nombre || m.empresas?.sectores?.nombre) && 'sector económico',
        !m.arls?.nombre && 'ARL',
      ].filter(Boolean),
    }
  })
}

function escapar(valor) {
  const texto = String(valor ?? '').toUpperCase()
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export function generarCsv(filas) {
  const lineas = filas.map((f) =>
    [
      f.tipoDocumento,
      f.documento,
      f.primerNombre,
      f.segundoNombre,
      f.primerApellido,
      f.segundoApellido,
      f.sexo,
      f.pais,
      f.fechaNacimiento,
      f.nivelEducativo,
      f.sectorLaboral,
      f.cargo,
      f.sectorEconomico,
      f.razonSocial,
      f.arl,
    ]
      .map(escapar)
      .join(';')
  )

  return lineas.join('\r\n')
}

export function descargarCsv(contenido, nombreArchivo) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}