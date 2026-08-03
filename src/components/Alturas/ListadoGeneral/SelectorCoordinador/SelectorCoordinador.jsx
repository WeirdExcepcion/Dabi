import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './SelectorCoordinador.css'

function SelectorCoordinador({ grupoId, valor, opciones, onCambiado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)

  async function cambiar(nuevoId) {
    setError(false)
    setGuardando(true)

    const { error } = await supabase
      .from('grupos')
      .update({ coordinador_id: nuevoId ? Number(nuevoId) : null })
      .eq('id', grupoId)

    setGuardando(false)

    if (error) {
      setError(true)
      console.error(error.message)
      return
    }

    onCambiado(nuevoId)
  }

  return (
    <select
      className={error ? 'sel-coord sel-coord_error' : 'sel-coord'}
      value={valor || ''}
      onChange={(e) => cambiar(e.target.value)}
      disabled={guardando}
    >
      <option value="">—</option>
      {opciones.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre_completo}</option>
      ))}
    </select>
  )
}

export default SelectorCoordinador