import { useCapaModal } from '../../../hooks/useCapaModal'
import './Modal.css'

// amplio: para contenido que es sobre todo una tabla ancha. Los formularios
// se quedan en el ancho normal, que se lee mejor.
function Modal({ children, onCerrar, bloquearCierre = false, amplio = false }) {
  useCapaModal(onCerrar, bloquearCierre)

  function manejarClicFondo(e) {
    if (bloquearCierre) return
    if (e.target === e.currentTarget) onCerrar()
  }

  return (
    <div className="modal__fondo" onClick={manejarClicFondo}>
      <div className={amplio ? 'modal__contenido modal__contenido_amplio' : 'modal__contenido'}>
        {children}
      </div>
    </div>
  )
}

export default Modal