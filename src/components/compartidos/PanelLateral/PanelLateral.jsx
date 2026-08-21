import { useCapaModal } from '../../../hooks/useCapaModal'
import './PanelLateral.css'

function PanelLateral({ children, onCerrar }) {
  useCapaModal(onCerrar)

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