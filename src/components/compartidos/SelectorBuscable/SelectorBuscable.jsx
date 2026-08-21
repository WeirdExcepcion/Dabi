import { useDesplegable } from '../../../hooks/useDesplegable'
import './SelectorBuscable.css'

function SelectorBuscable({
  id,
  opciones,
  valor,
  onCambio,
  campoTexto = 'nombre',
  placeholder = 'Buscar…',
  vacioTexto = '—',
}) {
  const {
    abierto, alternar, cerrar,
    busqueda, termino, cambiarBusqueda,
    indiceActivo, setIndiceActivo, manejarTeclas,
    contenedorRef, inputRef,
  } = useDesplegable()

  const seleccionada = opciones.find((o) => String(o.id) === String(valor))

  const filtradas = termino
    ? opciones.filter((o) => String(o[campoTexto]).toLowerCase().includes(termino))
    : opciones

  function elegir(opcion) {
    onCambio(opcion ? String(opcion.id) : '')
    cerrar()
  }

  return (
    <div className="sel-busc" ref={contenedorRef}>
      <button
        type="button"
        id={id}
        className="sel-busc__disparador"
        onClick={alternar}
      >
        <span className={seleccionada ? 'sel-busc__valor' : 'sel-busc__valor sel-busc__valor_vacio'}>
          {seleccionada ? seleccionada[campoTexto] : vacioTexto}
        </span>
        <span className="sel-busc__flecha">▾</span>
      </button>

      {abierto && (
        <div className="sel-busc__panel">
          <input
            ref={inputRef}
            type="text"
            className="sel-busc__input"
            placeholder={placeholder}
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            onKeyDown={(e) =>
              manejarTeclas(e, {
                cantidad: filtradas.length,
                alElegir: (i) => elegir(filtradas[i]),
              })
            }
          />

          <ul className="sel-busc__lista">
            {filtradas.length === 0 && (
              <li className="sel-busc__sin-resultados">Sin coincidencias</li>
            )}

            {filtradas.map((opcion, indice) => (
              <li key={opcion.id}>
                <button
                  type="button"
                  className={
                    indice === indiceActivo
                      ? 'sel-busc__opcion sel-busc__opcion_activa'
                      : 'sel-busc__opcion'
                  }
                  onClick={() => elegir(opcion)}
                  onMouseEnter={() => setIndiceActivo(indice)}
                >
                  {opcion[campoTexto]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SelectorBuscable