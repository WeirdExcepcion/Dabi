import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './FichaEntrenador.css'

const MAX_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg']

function formatearFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function FichaEntrenador({ entrenador, onActualizado }) {
  const [documento, setDocumento] = useState(entrenador.numero_documento || '')
  const [formacion, setFormacion] = useState(entrenador.formacion || '')
  const [numero, setNumero] = useState(entrenador.licencia_numero || '')
  const [fecha, setFecha] = useState(entrenador.licencia_fecha || '')
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [vistaPrevia, setVistaPrevia] = useState(null)

  const hayCambios =
    documento !== (entrenador.numero_documento || '') ||
    formacion !== (entrenador.formacion || '') ||
    numero !== (entrenador.licencia_numero || '') ||
    fecha !== (entrenador.licencia_fecha || '')

  const tieneFirma = Boolean(entrenador.firma_path)
  const tieneLicencia = Boolean(entrenador.licencia_numero && entrenador.licencia_fecha)
  const listo = tieneFirma && tieneLicencia
  const activo = entrenador.activo

  function clasesTarjeta() {
    if (!activo) return 'f-entren f-entren_inactivo'
    return listo ? 'f-entren f-entren_listo' : 'f-entren'
  }

  async function guardarDatos() {
    setError('')
    setAviso('')
    setGuardando(true)

    const cambios = {
      numero_documento: documento.trim() || null,
      formacion: formacion.trim() || null,
      licencia_numero: numero.trim() || null,
      licencia_fecha: fecha || null,
    }

    const { error } = await supabase
      .from('entrenadores')
      .update(cambios)
      .eq('id', entrenador.id)

    setGuardando(false)

    if (error) {
      setError('No se pudieron guardar los datos')
      console.error(error.message)
      return
    }

    onActualizado(cambios)
    setAviso('Datos guardados')
  }

  async function subirFirma(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''

    if (!archivo) return

    setError('')
    setAviso('')

    if (!TIPOS.includes(archivo.type)) {
      setError('La firma debe ser PNG o JPG')
      return
    }

    if (archivo.size > MAX_BYTES) {
      setError('La firma no debe pesar más de 2 MB')
      return
    }

    setSubiendo(true)

    const extension = archivo.type === 'image/png' ? 'png' : 'jpg'
    const ruta = `entrenadores/${entrenador.id}.${extension}`

    const { error: errorSubida } = await supabase.storage
      .from('firmas')
      .upload(ruta, archivo, { upsert: true, contentType: archivo.type })

    if (errorSubida) {
      setSubiendo(false)
      setError('No se pudo subir la firma')
      console.error(errorSubida.message)
      return
    }

    const { error: errorRegistro } = await supabase
      .from('entrenadores')
      .update({ firma_path: ruta })
      .eq('id', entrenador.id)

    setSubiendo(false)

    if (errorRegistro) {
      setError('La firma se subió pero no se pudo asociar al entrenador')
      console.error(errorRegistro.message)
      return
    }

    onActualizado({ firma_path: ruta })
    setAviso('Firma actualizada')
    setVistaPrevia(null)
  }

  async function verFirma() {
    setError('')

    if (vistaPrevia) {
      setVistaPrevia(null)
      return
    }

    const { data, error } = await supabase.storage
      .from('firmas')
      .createSignedUrl(entrenador.firma_path, 120)

    if (error) {
      setError('No se pudo cargar la vista previa')
      console.error(error.message)
      return
    }

    setVistaPrevia(data.signedUrl)
  }

  async function alternarActivo() {
    setError('')
    setAviso('')
    setCambiandoEstado(true)

    const { error } = await supabase
      .from('entrenadores')
      .update({ activo: !activo })
      .eq('id', entrenador.id)

    setCambiandoEstado(false)

    if (error) {
      setError('No se pudo cambiar el estado')
      console.error(error.message)
      return
    }

    onActualizado({ activo: !activo })
  }

  return (
    <article className={clasesTarjeta()}>
      <div className="f-entren__cabecera">
        <div>
          <p className="f-entren__nombre">
            {entrenador.nombre_completo}
            {entrenador.profile_id && (
              <span className="f-entren__badge">Con cuenta</span>
            )}
          </p>
          <p className="f-entren__estado">
            {!activo
              ? 'Inactivo · no aparece al crear grupos'
              : listo
              ? 'Listo para certificar'
              : `Falta ${
                  !tieneFirma && !tieneLicencia
                    ? 'la firma y la licencia'
                    : !tieneFirma
                    ? 'la firma'
                    : 'la licencia'
                }`}
          </p>
        </div>

        <div className="f-entren__cabecera-der">
          <span
            className={
              !activo
                ? 'f-entren__punto f-entren__punto_off'
                : listo
                ? 'f-entren__punto f-entren__punto_ok'
                : 'f-entren__punto'
            }
          />
          <button
            className="f-entren__activo"
            onClick={alternarActivo}
            disabled={cambiandoEstado}
          >
            {activo ? 'Desactivar' : 'Reactivar'}
          </button>
        </div>
      </div>

      {activo && (
        <div className="f-entren__cuerpo">
          <div className="f-entren__bloque">
            <p className="f-entren__bloque-titulo">Datos y licencia</p>

            <div className="f-entren__campos">
              <div className="f-entren__campo">
                <label className="f-entren__label" htmlFor={`doc-${entrenador.id}`}>
                  Documento
                </label>
                <input
                  id={`doc-${entrenador.id}`}
                  type="text"
                  className="f-entren__input"
                  placeholder="80352240"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                />
              </div>
            </div>

            <div className="f-entren__campos">
              <div className="f-entren__campo">
                <label className="f-entren__label" htmlFor={`form-${entrenador.id}`}>
                  Formación o título
                </label>
                <input
                  id={`form-${entrenador.id}`}
                  type="text"
                  className="f-entren__input"
                  placeholder="Coordinador de Trabajo Seguro en Alturas"
                  value={formacion}
                  onChange={(e) => setFormacion(e.target.value)}
                />
              </div>
            </div>

            <div className="f-entren__campos">
              <div className="f-entren__campo">
                <label className="f-entren__label" htmlFor={`num-${entrenador.id}`}>
                  Licencia N.°
                </label>
                <input
                  id={`num-${entrenador.id}`}
                  type="text"
                  className="f-entren__input"
                  placeholder="25-1873"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              <div className="f-entren__campo">
                <label className="f-entren__label" htmlFor={`fec-${entrenador.id}`}>
                  Expedida el
                </label>
                <input
                  id={`fec-${entrenador.id}`}
                  type="date"
                  className="f-entren__input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>

            {numero && fecha && (
              <p className="f-entren__previa">
                En el certificado:{' '}
                <strong>Lic. {numero} de {formatearFecha(fecha)}</strong>
              </p>
            )}

            <button
              className="f-entren__boton"
              onClick={guardarDatos}
              disabled={!hayCambios || guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>

          <div className="f-entren__bloque">
            <p className="f-entren__bloque-titulo">Firma</p>

            {tieneFirma ? (
              <>
                <p className="f-entren__firma-ok">Firma cargada</p>
                <button className="f-entren__boton f-entren__boton_sec" onClick={verFirma}>
                  {vistaPrevia ? 'Ocultar' : 'Ver firma'}
                </button>
              </>
            ) : (
              <p className="f-entren__firma-falta">Sin firma cargada</p>
            )}

            {vistaPrevia && (
              <div className="f-entren__preview">
                <img src={vistaPrevia} alt="Firma del entrenador" />
              </div>
            )}

            <label className="f-entren__subir">
              {subiendo ? 'Subiendo…' : tieneFirma ? 'Reemplazar firma' : 'Subir firma'}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={subirFirma}
                disabled={subiendo}
                hidden
              />
            </label>

            <p className="f-entren__ayuda">
              PNG con fondo transparente, máximo 2 MB. La firma no se puede borrar, solo reemplazar.
            </p>
          </div>
        </div>
      )}

      {error && <p className="f-entren__error">{error}</p>}
      {aviso && <p className="f-entren__aviso">{aviso}</p>}
    </article>
  )
}

export default FichaEntrenador