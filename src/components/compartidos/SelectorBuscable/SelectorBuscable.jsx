import { useState, useRef, useEffect } from 'react'
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
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [indiceActivo, setIndiceActivo] = useState(0)
  const contenedorRef = useRef(null)
  const inputRef = useRef(null)

  const seleccionada = opciones.find((o) => String(o.id) === String(valor))

  useEffect(() => {
    function clicFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', clicFuera)
    return () => document.removeEventListener('mousedown', clicFuera)
  }, [])

  useEffect(() => {
    if (abierto && inputRef.current) inputRef.current.focus()
  }, [abierto])

  const termino = busqueda.trim().toLowerCase()
  const filtradas = termino
    ? opciones.filter((o) => String(o[campoTexto]).toLowerCase().includes(termino))
    : opciones

  function elegir(opcion) {
    onCambio(opcion ? String(opcion.id) : '')
    setAbierto(false)
    setBusqueda('')
  }

  function manejarTeclas(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtradas[indiceActivo]) elegir(filtradas[indiceActivo])
    } else if (e.key === 'Escape') {
      setAbierto(false)
      setBusqueda('')
    }
  }

  return (
    <div className="sel-busc" ref={contenedorRef}>
      <button
        type="button"
        id={id}
        className="sel-busc__disparador"
        onClick={() => setAbierto((v) => !v)}
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
            onChange={(e) => {
              setBusqueda(e.target.value)
              setIndiceActivo(0)
            }}
            onKeyDown={manejarTeclas}
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