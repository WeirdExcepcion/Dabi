import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_GESTIONAR_ENTRENADORES } from '../../constants/permisos'
import Modal from '../Modal/Modal'
import FichaEntrenador from './FichaEntrenador/FichaEntrenador'
import FormularioEntrenador from './FormularioEntrenador/FormularioEntrenador'
import './Entrenadores.css'

const CAMPOS = `
  id,
  nombre_completo,
  numero_documento,
  formacion,
  licencia_numero,
  licencia_fecha,
  firma_path,
  activo,
  profile_id
`

function Entrenadores() {
  const { perfil } = useOutletContext()
  const [entrenadores, setEntrenadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [verInactivos, setVerInactivos] = useState(false)

  const puedeGestionar = PUEDE_GESTIONAR_ENTRENADORES.includes(perfil.rol)

  async function cargar() {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('entrenadores')
      .select(CAMPOS)
      .order('nombre_completo')

    if (error) {
      setError('No se pudieron cargar los entrenadores')
      console.error(error.message)
    } else {
      setEntrenadores(data)
    }

    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function actualizarLocal(id, cambios) {
    setEntrenadores((anteriores) =>
      anteriores.map((e) => (e.id === id ? { ...e, ...cambios } : e))
    )
  }

  if (!puedeGestionar) {
    return <p className="entren__mensaje">Tu rol no tiene acceso a esta sección.</p>
  }

  const activos = entrenadores.filter((e) => e.activo)
  const inactivos = entrenadores.filter((e) => !e.activo)
  const visibles = verInactivos ? entrenadores : activos

  const completos = activos.filter(
    (e) => e.firma_path && e.licencia_numero && e.licencia_fecha
  ).length

  return (
    <section className="entren">
      <header className="entren__header">
        <div>
          <p className="entren__eyebrow">Formación</p>
          <h1 className="entren__titulo">Entrenadores</h1>
          <p className="entren__subtitulo">
            Firma y licencia de cada entrenador. Ambas aparecen en los certificados que dicta.
          </p>
        </div>

        <div className="entren__header-acciones">
          {activos.length > 0 && (
            <span className="entren__conteo">
              {completos} de {activos.length} listos
            </span>
          )}
          <button className="entren__boton-nuevo" onClick={() => setCreando(true)}>
            Nuevo entrenador
          </button>
        </div>
      </header>

      {creando && (
        <Modal onCerrar={() => setCreando(false)}>
          <FormularioEntrenador
            onCreado={() => {
              setCreando(false)
              cargar()
            }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {inactivos.length > 0 && (
        <div className="entren__filtro">
          <button
            className={verInactivos ? 'entren__toggle entren__toggle_activo' : 'entren__toggle'}
            onClick={() => setVerInactivos((v) => !v)}
          >
            {verInactivos ? 'Ocultar inactivos' : `Ver inactivos (${inactivos.length})`}
          </button>
        </div>
      )}

      {cargando && <p className="entren__mensaje">Cargando…</p>}

      {error && <p className="entren__mensaje">{error}</p>}

      {!cargando && !error && visibles.length === 0 && (
        <p className="entren__mensaje">
          No hay entrenadores registrados todavía.
        </p>
      )}

      <div className="entren__lista">
        {visibles.map((entrenador) => (
          <FichaEntrenador
            key={entrenador.id}
            entrenador={entrenador}
            onActualizado={(cambios) => actualizarLocal(entrenador.id, cambios)}
          />
        ))}
      </div>
    </section>
  )
}

export default Entrenadores