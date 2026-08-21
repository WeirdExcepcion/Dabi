import './Pestanas.css'

function Pestanas({ activa, onCambio, opciones }) {
  return (
    <div className="pestanas">
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          className={
            activa === opcion.id
              ? 'pestanas__opcion pestanas__opcion_activa'
              : 'pestanas__opcion'
          }
          onClick={() => onCambio(opcion.id)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}

export default Pestanas