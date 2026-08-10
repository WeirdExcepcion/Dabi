import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import Modal from '../../../compartidos/Modal/Modal'
import './FichaPersonal.css'

const MAX_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg']

function formatearFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function FichaPersonal({ persona, onActualizado, soloLectura = false }) {
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
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(null)

  const activo = persona.puede_entrenar || persona.puede_supervisar || persona.puede_coordinar

  const hayCambios =
    documento !== (persona.numero_documento || '') ||
    formacion !== (persona.formacion || '') ||
    numero !== (persona.licencia_numero || '') ||
    fecha !== (persona.licencia_fecha || '')

  const tieneFirma = Boolean(persona.firma_path)
  const tieneDocumento = Boolean(persona.numero_documento)
  const tieneLicencia = Boolean(persona.licencia_numero && persona.licencia_fecha)
  const tieneTitulo = Boolean(persona.formacion)

  const necesitaLicencia = persona.puede_entrenar || persona.puede_supervisar
  const firmaNecesaria = persona.puede_entrenar

  const listo =
    tieneDocumento &&
    (!necesitaLicencia || (tieneLicencia && tieneTitulo)) &&
    (!firmaNecesaria || tieneFirma)

  function claseTarjeta() {
    if (!activo) return 'f-per f-per_inactivo'
    return listo ? 'f-per f-per_listo' : 'f-per'
  }

  function etiquetaCapacidad() {
    const roles = []
    if (persona.puede_entrenar) roles.push('Entrenador')
    if (persona.puede_supervisar) roles.push('Supervisor')
    if (persona.puede_coordinar) roles.push('Coordinador')
    if (roles.length === 0) return 'Desactivado'
    return roles.join(' · ')
  }

  async function aplicarCapacidad(campo, valor) {
    setError('')
    setAviso('')
    setCambiandoCap(true)

    const { error } = await supabase
      .from('entrenadores')
      .update({ [campo]: valor })
      .eq('id', persona.id)

    setCambiandoCap(false)

    if (error) {
      setError('No se pudo cambiar la función')
      console.error(error.message)
      return
    }

    onActualizado({ [campo]: valor })
  }

  function cambiarCapacidad(campo, valor) {
    const quedaria = {
      puede_entrenar: persona.puede_entrenar,
      puede_supervisar: persona.puede_supervisar,
      puede_coordinar: persona.puede_coordinar,
      [campo]: valor,
    }

    const quedaSinFunciones =
      !quedaria.puede_entrenar && !quedaria.puede_supervisar && !quedaria.puede_coordinar

    if (quedaSinFunciones) {
      setConfirmarDesactivar({ campo, valor })
      return
    }

    aplicarCapacidad(campo, valor)
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

  return (
    <article className={claseTarjeta()}>
      {confirmarDesactivar && (
        <Modal onCerrar={() => setConfirmarDesactivar(null)}>
          <div className="f-per__confirm">
            <p className="f-per__confirm-eyebrow">Desactivar</p>
            <h2 className="f-per__confirm-titulo">{persona.nombre_completo}</h2>

            <p className="f-per__confirm-texto">
              Al quitarle todas sus funciones, esta persona quedará desactivada y
              dejará de aparecer al crear grupos.
            </p>
            <p className="f-per__confirm-texto">
              No se pierde nada: sus datos, licencia y firma se conservan, y los grupos
              donde ya participó siguen intactos. Pasará al final de la lista, en
              <strong> "Ver desactivados"</strong>, para reactivarla cuando quieras.
            </p>

            <div className="f-per__confirm-acciones">
              <button
                className="f-per__boton f-per__boton_sec"
                onClick={() => setConfirmarDesactivar(null)}
              >
                Cancelar
              </button>
              <button
                className="f-per__boton f-per__boton_peligro"
                onClick={() => {
                  aplicarCapacidad(confirmarDesactivar.campo, confirmarDesactivar.valor)
                  setConfirmarDesactivar(null)
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </Modal>
      )}
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
              : `${etiquetaCapacidad()} · falta ${[
                  !tieneDocumento && 'el documento',
                  necesitaLicencia && !tieneLicencia && 'la licencia',
                  necesitaLicencia && !tieneTitulo && 'el título',
                  firmaNecesaria && !tieneFirma && 'la firma',
                ]
                  .filter(Boolean)
                  .join(', ')}`}
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
          {soloLectura ? (
            <span className="f-per__estado">{etiquetaCapacidad()}</span>
          ) : (
            <div className="f-per__checks">
              <label className="f-per__check">
                <input
                  type="checkbox"
                  checked={persona.puede_entrenar}
                  onChange={(e) => cambiarCapacidad('puede_entrenar', e.target.checked)}
                  disabled={cambiandoCap}
                />
                Entrenador
              </label>

              <label className="f-per__check">
                <input
                  type="checkbox"
                  checked={persona.puede_supervisar}
                  onChange={(e) => cambiarCapacidad('puede_supervisar', e.target.checked)}
                  disabled={cambiandoCap}
                />
                Supervisor
              </label>

              <label className="f-per__check">
                <input
                  type="checkbox"
                  checked={persona.puede_coordinar}
                  onChange={(e) => cambiarCapacidad('puede_coordinar', e.target.checked)}
                  disabled={cambiandoCap}
                />
                Coordinador
              </label>
              {activo && (
                <p className="f-per__nota-checks">
                  Sin ninguna función marcada, la persona se desactiva.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {activo && !soloLectura && (
        <div className="f-per__cuerpo">
          <div className="f-per__bloque">
            <p className="f-per__bloque-titulo">Datos y licencia</p>
           
            {!necesitaLicencia && (
              <p className="f-per__nota-firma">
                Como coordinador, solo hacen falta su nombre y documento. La licencia
                y el título son opcionales.
              </p>
            )}

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
                Su firma solo se estampa en el certificado si entrena. Puedes
                subirla igual por si más adelante lo hace.
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