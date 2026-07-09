import { useEffect } from 'react'
import './Modal.css'

function Modal({ children, onCerrar }) {
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
    <div className="modal__fondo" onClick={manejarClicFondo}>
      <div className="modal__contenido">{children}</div>
    </div>
  )
}

export default Modal