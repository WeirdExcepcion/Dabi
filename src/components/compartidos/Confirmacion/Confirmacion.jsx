import Modal from '../Modal/Modal'
import './Confirmacion.css'

function Confirmacion({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal onCerrar={onCancelar}>
      <div className="confirmacion">
        <p className="confirmacion__titulo">{titulo}</p>
        {mensaje && <p className="confirmacion__mensaje">{mensaje}</p>}

        <div className="confirmacion__acciones">
          <button
            type="button"
            className="confirmacion__boton confirmacion__boton_secundario"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="confirmacion__boton confirmacion__boton_peligro"
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default Confirmacion