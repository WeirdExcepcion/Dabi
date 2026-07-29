const LADO_MAXIMO = 2400
const CALIDAD = 0.9

export async function comprimirImagen(archivo) {
  if (archivo.type === 'application/pdf') return archivo
  if (!archivo.type.startsWith('image/')) return archivo

  const imagen = await cargarImagen(archivo)

  const ladoMayor = Math.max(imagen.width, imagen.height)

  if (ladoMayor <= LADO_MAXIMO && archivo.size < 1024 * 1024) {
    URL.revokeObjectURL(imagen.src)
    return archivo
  }

  const escala = ladoMayor > LADO_MAXIMO ? LADO_MAXIMO / ladoMayor : 1
  const ancho = Math.round(imagen.width * escala)
  const alto = Math.round(imagen.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto

  const contexto = lienzo.getContext('2d')
  contexto.fillStyle = '#FFFFFF'
  contexto.fillRect(0, 0, ancho, alto)
  contexto.imageSmoothingEnabled = true
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(imagen, 0, 0, ancho, alto)

  URL.revokeObjectURL(imagen.src)

  const blob = await new Promise((resolver) =>
    lienzo.toBlob(resolver, 'image/jpeg', CALIDAD)
  )

  if (!blob || blob.size >= archivo.size) return archivo

  const nombreBase = archivo.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${nombreBase}.jpg`, { type: 'image/jpeg' })
}

function cargarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image()
    imagen.onload = () => resolver(imagen)
    imagen.onerror = () => rechazar(new Error('No se pudo leer la imagen'))
    imagen.src = URL.createObjectURL(archivo)
  })
}