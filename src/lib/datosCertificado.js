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
        empresas ( razon_social, nit, representante_legal, es_independiente ),
        grupos (
          fecha_inicio,
          fecha_fin,
          cursos ( nombre, nombre_certificado, duracion_horas ),
          entrenador:entrenadores!grupos_entrenador_id_fkey (
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
  const firma = desglosarFecha(g.fecha_fin)

  const rutasFirmas = ['representante-legal.png']
  if (entrenador?.firma_path) rutasFirmas.push(entrenador.firma_path)

  const { data: urls } = await supabase.storage
    .from('firmas')
    .createSignedUrls(rutasFirmas, 300)

  const buscarUrl = (ruta) => urls?.find((u) => u.path === ruta)?.signedUrl || null

  return {
    folio: cert.codigo,
    estado: cert.estado,
    nombre: `${a.nombres} ${a.apellidos}`,
    tipoDocumento: a.tipo_documento,
    documento: a.numero_documento,
    curso: g.cursos.nombre_certificado || g.cursos.nombre,
    horas: g.cursos.duracion_horas ? `${g.cursos.duracion_horas} horas` : '—',
    empresa: m.empresas?.es_independiente
      ? `${a.nombres} ${a.apellidos}`
      : m.empresas?.razon_social || '—',
    empresaNit: m.empresas?.es_independiente
      ? a.numero_documento
      : m.empresas?.nit || '—',
    repLegal: m.empresas?.es_independiente
      ? `${a.nombres} ${a.apellidos}`
      : m.empresas?.representante_legal || '—',
    arl: m.arls?.nombre || '—',
    diaInicio: inicio.dia, mesInicio: inicio.mes, anioInicio: inicio.anio,
    diaFin: fin.dia, mesFin: fin.mes, anioFin: fin.anio,
    diaFirma: firma.dia, mesFirma: firma.mes, anioFirma: firma.anio,
    entrenador: entrenador?.nombre_completo || '—',
    licencia:
      entrenador?.licencia_numero && entrenador?.licencia_fecha
        ? `${entrenador.licencia_numero} de ${formatearFechaCorta(entrenador.licencia_fecha)}`
        : '—',
    firmaEntrenadorUrl: entrenador?.firma_path ? buscarUrl(entrenador.firma_path) : null,
    firmaRepLegalUrl: buscarUrl('representante-legal.png'),
  }
}