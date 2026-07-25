import { supabase } from './supabaseClient'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function desglosarFecha(iso) {
  if (!iso) return { dia: '—', mes: '—', anio: '—' }
  const [anio, mes, dia] = iso.split('-')
  return {
    dia: String(Number(dia)),
    mes: MESES[Number(mes) - 1] || '—',
    anio,
  }
}

function formatearFechaCorta(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

export async function obtenerDatosCertificado(codigo) {
  const { data: cert, error } = await supabase
    .from('certificados')
    .select(`
      codigo,
      estado,
      emitido_en,
      matriculas (
        arls ( nombre ),
        aprendices ( tipo_documento, numero_documento, nombres, apellidos ),
        empresas ( razon_social, nit, representante_legal ),
        grupos (
          fecha_inicio,
          fecha_fin,
          cursos ( nombre, duracion_horas ),
          entrenador:entrenador_id (
            nombre_completo, licencia_numero, licencia_fecha, firma_path
          )
        )
      )
    `)
    .eq('codigo', codigo)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!cert) throw new Error('Certificado no encontrado')

  const m = cert.matriculas
  const g = m.grupos
  const entrenador = g.entrenador
  const a = m.aprendices

  const inicio = desglosarFecha(g.fecha_inicio)
  const fin = desglosarFecha(g.fecha_fin)
  const firma = desglosarFecha(cert.emitido_en?.split('T')[0])

  let firmaUrl = null
  if (entrenador?.firma_path) {
    const { data: urlData } = await supabase.storage
      .from('firmas')
      .createSignedUrl(entrenador.firma_path, 120)
    firmaUrl = urlData?.signedUrl || null
  }

  return {
    folio: cert.codigo,
    estado: cert.estado,
    nombre: `${a.nombres} ${a.apellidos}`,
    documentoTipo: a.tipo_documento,
    documento: a.numero_documento,
    curso: g.cursos.nombre,
    horas: g.cursos.duracion_horas ? `${g.cursos.duracion_horas} horas` : '—',
    empresa: m.empresas.razon_social,
    empresaNit: m.empresas.nit || '—',
    repLegal: m.empresas.representante_legal || '—',
    arl: m.arls?.nombre || '—',
    diaInicio: inicio.dia, mesInicio: inicio.mes, anioInicio: inicio.anio,
    diaFin: fin.dia, mesFin: fin.mes, anioFin: fin.anio,
    diaFirma: firma.dia, mesFirma: firma.mes, anioFirma: firma.anio,
    entrenador: entrenador?.nombre_completo || '—',
    licencia:
      entrenador?.licencia_numero && entrenador?.licencia_fecha
        ? `${entrenador.licencia_numero} de ${formatearFechaCorta(entrenador.licencia_fecha)}`
        : '—',
    firmaUrl,
  }
}