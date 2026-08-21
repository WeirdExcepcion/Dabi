import { useState, useEffect, useRef } from 'react'
import './VeloEntrada.css'

function VeloEntrada() {
  const [nombre] = useState(() => sessionStorage.getItem('dabi_entrada_modulo'))
  const [activo, setActivo] = useState(() => Boolean(nombre))
  const [contrayendo, setContrayendo] = useState(false)
  const yaCorrio = useRef(false)

  // StrictMode monta dos veces en desarrollo: el ref evita que la animación
  // se dispare de nuevo. Los timers no se cancelan en la limpieza a propósito,
  // porque el desmontaje que importa aquí es el del propio velo.
  useEffect(() => {
    if (!activo || yaCorrio.current) return

    yaCorrio.current = true

    setTimeout(() => setContrayendo(true), 300)

    setTimeout(() => {
      setActivo(false)
      sessionStorage.removeItem('dabi_entrada_modulo')
    }, 1150)
  }, [activo])

  if (!activo) return null

  return (
    <div className={contrayendo ? 'velo-ent velo-ent_contrayendo' : 'velo-ent'}>
      <span className="velo-ent__texto">{nombre}</span>
    </div>
  )
}

export default VeloEntrada