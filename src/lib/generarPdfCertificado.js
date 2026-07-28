import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { armarHtmlCertificado } from './generarCertificado'

const ANCHO_MM = 279.4
const ALTO_MM = 215.9

async function renderizarEnLienzo(html) {
  const contenedor = document.createElement('div')
  contenedor.style.position = 'fixed'
  contenedor.style.top = '-20000px'
  contenedor.style.left = '0'
  contenedor.style.width = `${ANCHO_MM}mm`
  contenedor.style.height = `${ALTO_MM}mm`
  contenedor.style.background = '#FFFFFF'

  const inicio = html.indexOf('<body>') + 6
  const fin = html.indexOf('</body>')
  const cuerpo = html.slice(inicio, fin)

  const estiloInicio = html.indexOf('<style>') + 7
  const estiloFin = html.indexOf('</style>')
  const estilos = html.slice(estiloInicio, estiloFin)

  const hojaEstilos = document.createElement('style')
  hojaEstilos.textContent = estilos

  contenedor.innerHTML = cuerpo
  document.body.appendChild(hojaEstilos)
  document.body.appendChild(contenedor)

  await new Promise((r) => setTimeout(r, 600))

  const pagina = contenedor.querySelector('.page')

  const lienzo = await html2canvas(pagina, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#FFFFFF',
    logging: false,
  })

  document.body.removeChild(contenedor)
  document.body.removeChild(hojaEstilos)

  return lienzo
}

export async function descargarPdfCertificado(codigo, nombreArchivo) {
  const html = await armarHtmlCertificado(codigo)
  const lienzo = await renderizarEnLienzo(html)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [ANCHO_MM, ALTO_MM],
  })

  const imagen = lienzo.toDataURL('image/jpeg', 0.95)
  pdf.addImage(imagen, 'JPEG', 0, 0, ANCHO_MM, ALTO_MM)

  pdf.save(nombreArchivo || `${codigo}.pdf`)
}

export async function generarBlobPdf(codigo) {
  const html = await armarHtmlCertificado(codigo)
  const lienzo = await renderizarEnLienzo(html)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [ANCHO_MM, ALTO_MM],
  })

  const imagen = lienzo.toDataURL('image/jpeg', 0.95)
  pdf.addImage(imagen, 'JPEG', 0, 0, ANCHO_MM, ALTO_MM)

  return pdf.output('blob')
}