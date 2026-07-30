import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './FichaPersonal.css'

const MAX_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg']

function formatearFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function FichaPersonal({ persona, onActualizado }) {
  const [documento, setDocumento] = useState(persona.numero_documento || '')
  const [formacion, setFormacion] = useState(persona.formacion || '')
  const [numero, setNumero] = useState(persona.licencia_numero || '')
  const [fecha, setFecha] = useState(persona.licencia_fecha || '')
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [cambiandoCap, setCambiandoCap] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [vistaPrevia, setVistaPrevia] = useState(null)

  const activo = persona.puede_entrenar || persona.puede_supervisar

  const hayCambios =
    documento !== (persona.numero_documento || '') ||
    formacion !== (persona.formacion || '') ||
    numero !== (persona.licencia_numero || '') ||
    fecha !== (persona.licencia_fecha || '')

  const tieneFirma = Boolean(persona.firma_path)
  const baseCompleta =
    persona.numero_documento && persona.licencia_numero && persona.licencia_fecha && persona.formacion
  const firmaNecesaria = persona.puede_entrenar
  const listo = baseCompleta && (!firmaNecesaria || tieneFirma)

  function claseTarjeta() {
    if (!activo) return 'f-per f-per_inactivo'
    return listo ? 'f-per f-per_listo' : 'f-per'
  }

  function etiquetaCapacidad() {
    if (persona.puede_entrenar && persona.puede_supervisar) return 'Entrenador y supervisor'
    if (persona.puede_entrenar) return 'Entrenador'
    if (persona.puede_supervisar) return 'Supervisor'
    return 'Desactivado'
  }

  async function cambiarCapacidad(valor) {
    setError('')
    setAviso('')
    setCambiandoCap(true)

    let cambios
    if (valor === 'entrenador') cambios = { puede_entrenar: true, puede_supervisar: false }
    else if (valor === 'supervisor') cambios = { puede_entrenar: false, puede_supervisar: true }
    else if (valor === 'ambos') cambios = { puede_entrenar: true, puede_supervisar: true }
    else cambios = { puede_entrenar: false, puede_supervisar: false }

    const { error } = await supabase
      .from('entrenadores')
      .update(cambios)
      .eq('id', persona.id)

    setCambiandoCap(false)

    if (error) {
      setError('No se pudo cambiar la función')
      console.error(error.message)
      return
    }

    onActualizado(cambios)
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
      .eq('id', persona.id)

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
    const ruta = `entrenadores/${persona.id}.${extension}`

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
      .eq('id', persona.id)

    setSubiendo(false)

    if (errorRegistro) {
      setError('La firma se subió pero no se pudo asociar')
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
      .createSignedUrl(persona.firma_path, 120)

    if (error) {
      setError('No se pudo cargar la vista previa')
      console.error(error.message)
      return
    }

    setVistaPrevia(data.signedUrl)
  }

  const valorSelector = !activo
    ? 'desactivado'
    : persona.puede_entrenar && persona.puede_supervisar
    ? 'ambos'
    : persona.puede_entrenar
    ? 'entrenador'
    : 'supervisor'

  return (
    <article className={claseTarjeta()}>
      <div className="f-per__cabecera">
        <div>
          <p className="f-per__nombre">
            {persona.nombre_completo}
            {persona.profile_id && <span className="f-per__badge">Con cuenta</span>}
          </p>
          <p className="f-per__estado">
            {!activo
              ? 'Desactivado · no aparece al crear grupos'
              : listo
              ? `${etiquetaCapacidad()} · listo`
              : `${etiquetaCapacidad()} · faltan datos`}
          </p>
        </div>

        <div className="f-per__cabecera-der">
          <span
            className={
              !activo
                ? 'f-per__punto f-per__punto_off'
                : listo
                ? 'f-per__punto f-per__punto_ok'
                : 'f-per__punto'
            }
          />
          <select
            className="f-per__capacidad"
            value={valorSelector}
            onChange={(e) => cambiarCapacidad(e.target.value)}
            disabled={cambiandoCap}
          >
            <option value="entrenador">Entrenador</option>
            <option value="supervisor">Supervisor</option>
            <option value="ambos">Ambas</option>
            <option value="desactivado">Desactivado</option>
          </select>
        </div>
      </div>

      {activo && (
        <div className="f-per__cuerpo">
          <div className="f-per__bloque">
            <p className="f-per__bloque-titulo">Datos y licencia</p>

            <div className="f-per__campos">
              <div className="f-per__campo">
                <label className="f-per__label" htmlFor={`doc-${persona.id}`}>Documento</label>
                <input
                  id={`doc-${persona.id}`}
                  type="text"
                  className="f-per__input"
                  placeholder="80352240"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                />
              </div>
            </div>

            <div className="f-per__campos">
              <div className="f-per__campo">
                <label className="f-per__label" htmlFor={`form-${persona.id}`}>
                  Título profesional
                </label>
                <input
                  id={`form-${persona.id}`}
                  type="text"
                  className="f-per__input"
                  placeholder="Coordinador de Trabajo Seguro en Alturas"
                  value={formacion}
                  onChange={(e) => setFormacion(e.target.value)}
                />
              </div>
            </div>

            <div className="f-per__campos">
              <div className="f-per__campo">
                <label className="f-per__label" htmlFor={`num-${persona.id}`}>Licencia N.°</label>
                <input
                  id={`num-${persona.id}`}
                  type="text"
                  className="f-per__input"
                  placeholder="25-1873"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              <div className="f-per__campo">
                <label className="f-per__label" htmlFor={`fec-${persona.id}`}>Expedida el</label>
                <input
                  id={`fec-${persona.id}`}
                  type="date"
                  className="f-per__input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>

            {numero && fecha && (
              <p className="f-per__previa">
                En el certificado: <strong>Lic. {numero} de {formatearFecha(fecha)}</strong>
              </p>
            )}

            <button
              className="f-per__boton"
              onClick={guardarDatos}
              disabled={!hayCambios || guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>

          <div className="f-per__bloque">
            <p className="f-per__bloque-titulo">
              Firma
              {!firmaNecesaria && <span className="f-per__opcional"> · opcional</span>}
            </p>

            {!firmaNecesaria && (
              <p className="f-per__nota-firma">
                Como supervisor, su firma no se estampa en el certificado. Puedes
                subirla igual por si más adelante también entrena.
              </p>
            )}

            {tieneFirma ? (
              <>
                <p className="f-per__firma-ok">Firma cargada</p>
                <button className="f-per__boton f-per__boton_sec" onClick={verFirma}>
                  {vistaPrevia ? 'Ocultar' : 'Ver firma'}
                </button>
              </>
            ) : (
              <p className={firmaNecesaria ? 'f-per__firma-falta' : 'f-per__firma-opcional'}>
                {firmaNecesaria ? 'Sin firma cargada' : 'Sin firma (no obligatoria)'}
              </p>
            )}

            {vistaPrevia && (
              <div className="f-per__preview">
                <img src={vistaPrevia} alt="Firma" />
              </div>
            )}

            <label className="f-per__subir">
              {subiendo ? 'Subiendo…' : tieneFirma ? 'Reemplazar firma' : 'Subir firma'}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={subirFirma}
                disabled={subiendo}
                hidden
              />
            </label>

            <p className="f-per__ayuda">
              PNG con fondo transparente, máximo 2 MB. La firma no se puede borrar, solo reemplazar.
            </p>
          </div>
        </div>
      )}

      {error && <p className="f-per__error">{error}</p>}
      {aviso && <p className="f-per__aviso">{aviso}</p>}
    </article>
  )
}

export default FichaPersonal