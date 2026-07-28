import QRCode from 'qrcode'
import { PLANTILLA_CERTIFICADO } from './plantillaCertificado'
import { obtenerDatosCertificado } from './datosCertificado'
import isotipoBlanco from '../assets/isotipo-ss-p.png'
import logoOficial from '../assets/logo-oficial.png'

const URL_BASE = import.meta.env.VITE_URL_BASE || window.location.origin

async function rutaAbsoluta(rutaRelativa) {
  const respuesta = await fetch(rutaRelativa)
  const blob = await respuesta.blob()
  return new Promise((resolver) => {
    const lector = new FileReader()
    lector.onloadend = () => resolver(lector.result)
    lector.readAsDataURL(blob)
  })
}

async function urlAImagenBase64(url) {
  if (!url) return null
  try {
    const respuesta = await fetch(url)
    const blob = await respuesta.blob()
    return new Promise((resolver) => {
      const lector = new FileReader()
      lector.onloadend = () => resolver(lector.result)
      lector.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('No se pudo cargar la firma:', e)
    return null
  }
}

export async function armarHtmlCertificado(codigo) {
  const datos = await obtenerDatosCertificado(codigo)

  const urlVerificacion = `${URL_BASE}/verificar/${datos.folio}`

  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
    margin: 0,
    width: 400,
    color: { dark: '#0F0F29', light: '#FFFFFF' },
  })

  const [isotipoB64, logoB64, firmaEntB64, firmaRepB64] = await Promise.all([
    rutaAbsoluta(isotipoBlanco),
    rutaAbsoluta(logoOficial),
    urlAImagenBase64(datos.firmaEntrenadorUrl),
    urlAImagenBase64(datos.firmaRepLegalUrl),
  ])

  const dominioLimpio = URL_BASE.replace(/^https?:\/\//, '')

  const reemplazos = {
    ISOTIPO_BLANCO: isotipoB64,
    ISOTIPO_MARCA: logoB64,
    LOGO_OFICIAL: logoB64,
    QR_IMAGEN: `<img src="${qrDataUrl}" alt="QR de verificación">`,
    FIRMA_ENTRENADOR: firmaEntB64 ? `<img src="${firmaEntB64}" alt="">` : '',
    FIRMA_REPLEGAL: firmaRepB64 ? `<img src="${firmaRepB64}" alt="">` : '',
    verificaUrl: `${dominioLimpio}/verificar`,
    folio: datos.folio,
    nombre: datos.nombre,
    tipoDocumento: datos.tipoDocumento,
    documento: datos.documento,
    curso: datos.curso,
    horas: datos.horas,
    empresa: datos.empresa,
    empresaNit: datos.empresaNit,
    repLegal: datos.repLegal,
    arl: datos.arl,
    diaInicio: datos.diaInicio,
    mesInicio: datos.mesInicio,
    anioInicio: datos.anioInicio,
    diaFin: datos.diaFin,
    mesFin: datos.mesFin,
    anioFin: datos.anioFin,
    diaFirma: datos.diaFirma,
    mesFirma: datos.mesFirma,
    anioFirma: datos.anioFirma,
    entrenador: datos.entrenador,
    licencia: datos.licencia,
  }

  let html = PLANTILLA_CERTIFICADO
  Object.entries(reemplazos).forEach(([clave, valor]) => {
    html = html.replaceAll(`{{${clave}}}`, valor ?? '')
  })

  return html
}

export async function imprimirCertificado(codigo) {
  const html = await armarHtmlCertificado(codigo)

  const ventana = window.open('', '_blank')
  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana. Permite las ventanas emergentes.')
  }

  ventana.document.write(html)
  ventana.document.close()

  ventana.onload = () => {
    setTimeout(() => {
      ventana.focus()
      ventana.print()
    }, 500)
  }
}

export async function imprimirVarios(codigos) {
  const partes = await Promise.all(codigos.map((c) => armarHtmlCertificado(c)))

  const cuerpos = partes
    .map((html) => {
      const inicio = html.indexOf('<body>') + 6
      const fin = html.indexOf('</body>')
      return html.slice(inicio, fin)
    })
    .join('\n<div style="page-break-after:always"></div>\n')

  const primerHtml = partes[0]
  const cabecera = primerHtml.slice(0, primerHtml.indexOf('<body>') + 6)

  const documento = `${cabecera}\n${cuerpos}\n</body></html>`

  const ventana = window.open('', '_blank')
  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana. Permite las ventanas emergentes.')
  }

  ventana.document.write(documento)
  ventana.document.close()

  ventana.onload = () => {
    setTimeout(() => {
      ventana.focus()
      ventana.print()
    }, 800)
  }
}