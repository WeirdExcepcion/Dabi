import { useEffect } from 'react'
import './Modal.css'

function Modal({ children, onCerrar, bloquearCierre = false }) {
  useEffect(() => {
    function manejarEscape(e) {
      if (e.key === 'Escape' && !bloquearCierre) onCerrar()
    }

    document.addEventListener('keydown', manejarEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', manejarEscape)
      document.body.style.overflow = ''
    }
  }, [onCerrar, bloquearCierre])

  function manejarClicFondo(e) {
    if (bloquearCierre) return
    if (e.target === e.currentTarget) onCerrar()
  }

  return (
    <div className="modal__fondo" onClick={manejarClicFondo}>
      <div className="modal__contenido">{children}</div>
    </div>
  )
}

export default Modal