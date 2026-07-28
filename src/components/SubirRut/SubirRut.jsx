import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './SubirRut.css'

const MAX_BYTES = 5 * 1024 * 1024
const TIPOS = ['application/pdf', 'image/png', 'image/jpeg']

function SubirRut({ empresaId, rutPath, onSubido, soloLectura = false }) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const tiene = Boolean(rutPath)

  async function subir(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    setError('')

    if (!TIPOS.includes(archivo.type)) {
      setError('El RUT debe ser PDF, PNG o JPG')
      return
    }
    if (archivo.size > MAX_BYTES) {
      setError('El archivo no debe pesar más de 5 MB')
      return
    }

    setSubiendo(true)

    const extension =
      archivo.type === 'application/pdf' ? 'pdf' : archivo.type === 'image/png' ? 'png' : 'jpg'
    const ruta = `empresas/${empresaId}/rut.${extension}`

    const { error: errorSubida } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { upsert: true, contentType: archivo.type })

    if (errorSubida) {
      setSubiendo(false)
      setError('No se pudo subir el archivo')
      console.error(errorSubida.message)
      return
    }

    const { error: errorRegistro } = await supabase
      .from('empresas')
      .update({ rut_path: ruta })
      .eq('id', empresaId)

    setSubiendo(false)

    if (errorRegistro) {
      setError('El archivo se subió pero no se registró')
      console.error(errorRegistro.message)
      return
    }

    onSubido(ruta)
  }

  async function ver() {
    setError('')

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(rutPath, 120)

    if (error) {
      setError('No se pudo abrir el archivo')
      console.error(error.message)
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  if (!empresaId) {
    return (
      <p className="rut__aviso">
        Guarda la empresa primero para poder subir el RUT.
      </p>
    )
  }

  return (
    <div className="rut">
      <div className="rut__fila">
        <span className={tiene ? 'rut__estado rut__estado_ok' : 'rut__estado'}>
          {tiene ? 'RUT cargado' : 'Sin RUT'}
        </span>

        <div className="rut__acciones">
          {tiene && (
            <button type="button" className="rut__ver" onClick={ver}>
              Ver
            </button>
          )}
          {!soloLectura && (
            <label className="rut__subir">
              {subiendo ? 'Subiendo…' : tiene ? 'Reemplazar' : 'Subir RUT'}
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={subir}
                disabled={subiendo}
                hidden
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="rut__error">{error}</p>}
    </div>
  )
}

export default SubirRut