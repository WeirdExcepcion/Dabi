import { useCapaModal } from '../../../hooks/useCapaModal'
import './Modal.css'

function Modal({ children, onCerrar, bloquearCierre = false }) {
  useCapaModal(onCerrar, bloquearCierre)

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