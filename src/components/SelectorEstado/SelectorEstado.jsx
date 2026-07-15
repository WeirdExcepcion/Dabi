import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ESTADOS_MATRICULA, ESTADOS_RECEPCION, ESTADOS_APROBACION } from '../../constants/estados'
import './SelectorEstado.css'

const ROLES_APROBACION = ['admin', 'gerente-general', 'coordinador', 'supervisor']
const ROLES_RECEPCION = ['auxiliar-admin']

function SelectorEstado({ matricula, rol, onCambiado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const puedeAprobar = ROLES_APROBACION.includes(rol)
  const puedeRecepcion = ROLES_RECEPCION.includes(rol)
  const editable = puedeAprobar || puedeRecepcion

  const opciones = puedeAprobar ? ESTADOS_APROBACION : ESTADOS_RECEPCION

  const bloqueado = matricula.estado === 'certificado'

  async function cambiarEstado(nuevoEstado) {
    setError('')
    setGuardando(true)

    const { error } = await supabase
      .from('matriculas')
      .update({ estado: nuevoEstado })
      .eq('id', matricula.id)

    setGuardando(false)

    if (error) {
      if (error.message.includes('Solo coordinación')) {
        setError('Solo coordinación puede aprobar')
      } else if (error.message.includes('no permite cambiar')) {
        setError('Tu rol no permite este cambio')
      } else if (error.message.includes('solo se asigna al emitir')) {
        setError('El estado certificado se asigna al emitir el certificado')
      } else {
        setError('No se pudo cambiar')
      }
      console.error(error.message)
      return
    }

    onCambiado(nuevoEstado)
  }

  if (!editable || bloqueado) {
    return (
      <span className={`sel-estado__fijo sel-estado__fijo_${matricula.estado}`}>
        {ESTADOS_MATRICULA[matricula.estado]}
      </span>
    )
  }

  return (
    <div className="sel-estado">
      <select
        className={`sel-estado__select sel-estado__select_${matricula.estado}`}
        value={matricula.estado}
        onChange={(e) => cambiarEstado(e.target.value)}
        disabled={guardando}
      >
        {opciones.map((valor) => (
          <option key={valor} value={valor}>
            {ESTADOS_MATRICULA[valor]}
          </option>
        ))}
      </select>
      {error && <p className="sel-estado__error">{error}</p>}
    </div>
  )
}

export default SelectorEstado