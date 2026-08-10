import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_GESTIONAR_PERSONAL, ROLES_SOLO_LECTURA } from '../../../constants/permisos'
import Modal from '../../compartidos/Modal/Modal'
import FichaPersonal from './FichaPersonal/FichaPersonal'
import FormularioPersonal from './FormularioPersonal/FormularioPersonal'
import './Personal.css'

const CAMPOS = `
  id,
  nombre_completo,
  numero_documento,
  formacion,
  licencia_numero,
  licencia_fecha,
  firma_path,
  puede_entrenar,
  puede_supervisar,
  puede_coordinar,
  profile_id
`

function estaListo(p) {
  if (!p.numero_documento) return false

  const necesitaLicencia = p.puede_entrenar || p.puede_supervisar
  if (necesitaLicencia && !(p.licencia_numero && p.licencia_fecha && p.formacion)) {
    return false
  }

  if (p.puede_entrenar && !p.firma_path) return false

  return true
}

function Personal() {
  const { perfil } = useOutletContext()
  const [personal, setPersonal] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [verInactivos, setVerInactivos] = useState(false)

  const puedeGestionar = PUEDE_GESTIONAR_PERSONAL.includes(perfil.rol)
  const soloLectura = ROLES_SOLO_LECTURA.includes(perfil.rol)

  async function cargar() {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('entrenadores')
      .select(CAMPOS)
      .order('nombre_completo')

    if (error) {
      setError('No se pudo cargar el personal')
      console.error(error.message)
    } else {
      setPersonal(data)
    }

    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function actualizarLocal(id, cambios) {
    setPersonal((anteriores) =>
      anteriores.map((p) => (p.id === id ? { ...p, ...cambios } : p))
    )
  }

  if (!puedeGestionar && !soloLectura) {
    return <p className="personal__mensaje">Tu rol no tiene acceso a esta sección.</p>
  }

  const activos = personal.filter((p) => p.puede_entrenar || p.puede_supervisar || p.puede_coordinar)
  const inactivos = personal.filter((p) => !p.puede_entrenar && !p.puede_supervisar && !p.puede_coordinar)
  const visibles = verInactivos ? personal : activos

  const listos = activos.filter(estaListo).length

  return (
    <section className="personal">
      <header className="personal__header">
        <div>
          <p className="personal__eyebrow">Formación</p>
          <h1 className="personal__titulo">Personal</h1>
          <p className="personal__subtitulo">
            Entrenadores y supervisores. Sus datos de licencia aparecen en los
            certificados que dictan o avalan.
          </p>
        </div>

        <div className="personal__header-acciones">
          {activos.length > 0 && (
            <span className="personal__conteo">
              {listos} de {activos.length} listos
            </span>
          )}
          {puedeGestionar && (
            <button className="personal__boton-nuevo" onClick={() => setCreando(true)}>
              Nuevo
            </button>
          )}
        </div>
      </header>

      {creando && (
        <Modal onCerrar={() => setCreando(false)} bloquearCierre>
          <FormularioPersonal
            onCreado={() => {
              setCreando(false)
              cargar()
            }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {inactivos.length > 0 && (
        <div className="personal__filtro">
          <button
            className={verInactivos ? 'personal__toggle personal__toggle_activo' : 'personal__toggle'}
            onClick={() => setVerInactivos((v) => !v)}
          >
            {verInactivos ? 'Ocultar desactivados' : `Ver desactivados (${inactivos.length})`}
          </button>
        </div>
      )}

      {cargando && <p className="personal__mensaje">Cargando…</p>}

      {error && <p className="personal__mensaje">{error}</p>}

      {!cargando && !error && visibles.length === 0 && (
        <p className="personal__mensaje">No hay personal registrado todavía.</p>
      )}

      <div className="personal__lista">
        {visibles.map((persona) => (
          <FichaPersonal
            soloLectura={soloLectura}
            key={persona.id}
            persona={persona}
            onActualizado={(cambios) => actualizarLocal(persona.id, cambios)}
          />
        ))}
      </div>
    </section>
  )
}

export default Personal