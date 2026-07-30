import { useEffect } from 'react'
import './PanelLateral.css'

function PanelLateral({ children, onCerrar }) {
  useEffect(() => {
    function manejarEscape(e) {
      if (e.key === 'Escape') onCerrar()
    }

    document.addEventListener('keydown', manejarEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', manejarEscape)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  function manejarClicFondo(e) {
    if (e.target === e.currentTarget) onCerrar()
  }

  return (
    <div className="panel__fondo" onClick={manejarClicFondo}>
      <aside className="panel__cuerpo">{children}</aside>
    </div>
  )
}

export default PanelLateral