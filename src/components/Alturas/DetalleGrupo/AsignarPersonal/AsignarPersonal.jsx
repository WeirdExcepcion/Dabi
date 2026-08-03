import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './AsignarPersonal.css'

function AsignarPersonal({ grupo, onAsignado, onCancelar }) {
  const [personal, setPersonal] = useState([])
  const [entrenadorId, setEntrenadorId] = useState(grupo.entrenador_id || '')
  const [supervisorId, setSupervisorId] = useState(grupo.supervisor_id || '')
  const [coordinadorId, setCoordinadorId] = useState(grupo.coordinador_id || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('entrenadores')
        .select('id, nombre_completo, puede_entrenar, puede_supervisar, puede_coordinar')
        .or('puede_entrenar.eq.true,puede_supervisar.eq.true,puede_coordinar.eq.true')
        .order('nombre_completo')
      if (data) setPersonal(data)
    }
    cargar()
  }, [])

  async function guardar() {
    setError('')
    setGuardando(true)

    const { error } = await supabase
      .from('grupos')
      .update({
        entrenador_id: entrenadorId ? Number(entrenadorId) : null,
        supervisor_id: supervisorId ? Number(supervisorId) : null,
        coordinador_id: coordinadorId ? Number(coordinadorId) : null,
      })
      .eq('id', grupo.id)

    setGuardando(false)

    if (error) {
      if (error.message.includes('ya está entrenando')) {
        setError('Esa persona ya está en otro grupo con fechas que se cruzan')
      } else if (error.message.includes('entrenador_distinto_supervisor')) {
        setError('El entrenador y el supervisor no pueden ser la misma persona')
      } else {
        setError('No se pudo guardar la asignación')
      }
      console.error(error.message)
      return
    }

    onAsignado()
  }

  return (
    <div className="asig">
      <p className="asig__eyebrow">Grupo</p>
      <h2 className="asig__titulo">Asignar personal</h2>

      <label className="asig__label" htmlFor="asig_ent">Entrenador</label>
      <select
        id="asig_ent"
        className="asig__select"
        value={entrenadorId}
        onChange={(e) => setEntrenadorId(e.target.value)}
      >
        <option value="">Sin asignar</option>
        {personal
          .filter((p) => p.puede_entrenar)
          .map((p) => (
            <option key={p.id} value={p.id}>{p.nombre_completo}</option>
          ))}
      </select>

      <label className="asig__label" htmlFor="asig_sup">Supervisor</label>
      <select
        id="asig_sup"
        className="asig__select"
        value={supervisorId}
        onChange={(e) => setSupervisorId(e.target.value)}
      >
        <option value="">Sin asignar</option>
        {personal
          .filter((p) => p.puede_supervisar && String(p.id) !== String(entrenadorId))
          .map((p) => (
            <option key={p.id} value={p.id}>{p.nombre_completo}</option>
          ))}
      </select>
      
      <label className="asig__label" htmlFor="asig_coord">Coordinador</label>
      <select
        id="asig_coord"
        className="asig__select"
        value={coordinadorId}
        onChange={(e) => setCoordinadorId(e.target.value)}
      >
        <option value="">Sin asignar</option>
        {personal
          .filter((p) => p.puede_coordinar)
          .map((p) => (
            <option key={p.id} value={p.id}>{p.nombre_completo}</option>
          ))}
      </select>
      
      <p className="asig__nota">
        El entrenador y el supervisor no pueden ser la misma persona, ni estar en otro
        grupo cuyas fechas se crucen con este.
      </p>

      {error && <p className="asig__error">{error}</p>}

      <div className="asig__acciones">
        <button className="asig__boton asig__boton_sec" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="asig__boton" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default AsignarPersonal