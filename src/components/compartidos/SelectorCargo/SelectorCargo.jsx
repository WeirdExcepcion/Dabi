import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './SelectorCargo.css'

function SelectorCargo({ id, cargos, valor, onCambio, onCargoCreado }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [similares, setSimilares] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const contenedorRef = useRef(null)
  const inputRef = useRef(null)
  const seleccionado = cargos.find((c) => String(c.id) === String(valor))

  useEffect(() => {
    function clicFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        cerrar()
      }
    }
    document.addEventListener('mousedown', clicFuera)
    return () => document.removeEventListener('mousedown', clicFuera)
  }, [])

  useEffect(() => {
    if (abierto && inputRef.current) inputRef.current.focus()
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setBusqueda('')
    setSimilares(null)
    setError('')
  }

  const termino = busqueda.trim().toLowerCase()
  const filtrados = termino
    ? cargos.filter((c) => c.nombre.toLowerCase().includes(termino))
    : cargos

  const hayCoincidenciaExacta = cargos.some(
    (c) => c.nombre.toLowerCase() === termino
  )

  function elegir(cargo) {
    onCambio(cargo ? String(cargo.id) : '')
    cerrar()
  }

  async function crear(forzar = false) {
    setError('')
    setCreando(true)

    const { data, error } = await supabase.rpc('crear_o_encontrar_cargo', {
      p_nombre: busqueda.trim(),
    })

    setCreando(false)

    if (error) {
      setError('No se pudo crear el cargo')
      console.error(error.message)
      return
    }

    if (data.resultado === 'existente') {
      onCargoCreado({ id: data.id, nombre: data.nombre })
      onCambio(String(data.id))
      cerrar()
      return
    }

    if (data.resultado === 'similares' && !forzar) {
      setSimilares(data.similares)
      return
    }

    if (data.resultado === 'creado') {
      onCargoCreado({ id: data.id, nombre: data.nombre })
      onCambio(String(data.id))
      cerrar()
    }
  }

  function manejarTeclas(e) {
    if (similares) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtrados[indiceActivo]) elegir(filtrados[indiceActivo])
      else if (termino && !hayCoincidenciaExacta) crear()
    } else if (e.key === 'Escape') {
      cerrar()
    }
  }

  return (
    <div className="sel-cargo" ref={contenedorRef}>
      <button
        type="button"
        id={id}
        className="sel-cargo__disparador"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className={seleccionado ? 'sel-cargo__valor' : 'sel-cargo__valor sel-cargo__valor_vacio'}>
          {seleccionado ? seleccionado.nombre : '—'}
        </span>
        <span className="sel-cargo__flecha">▾</span>
      </button>

      {abierto && (
        <div className="sel-cargo__panel">
          <input
            ref={inputRef}
            type="text"
            className="sel-cargo__input"
            placeholder="Buscar o escribir uno nuevo…"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setIndiceActivo(0)
              setSimilares(null)
              setError('')
            }}
            onKeyDown={manejarTeclas}
          />

          {similares ? (
            <div className="sel-cargo__similares">
              <p className="sel-cargo__similares-titulo">
                Ya existen cargos parecidos
              </p>
              <ul className="sel-cargo__lista">
                {similares.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="sel-cargo__opcion"
                      onClick={() => elegir(s)}
                    >
                      {s.nombre}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="sel-cargo__crear sel-cargo__crear_forzar"
                onClick={() => crear(true)}
                disabled={creando}
              >
                {creando ? 'Creando…' : `Aun así, crear «${busqueda.trim()}»`}
              </button>
            </div>
          ) : (
            <>
              <ul className="sel-cargo__lista">
                {filtrados.length === 0 && !termino && (
                  <li className="sel-cargo__sin">Sin cargos registrados</li>
                )}

                {filtrados.map((cargo, indice) => (
                  <li key={cargo.id}>
                    <button
                      type="button"
                      className={
                        indice === indiceActivo
                          ? 'sel-cargo__opcion sel-cargo__opcion_activa'
                          : 'sel-cargo__opcion'
                      }
                      onClick={() => elegir(cargo)}
                      onMouseEnter={() => setIndiceActivo(indice)}
                    >
                      {cargo.nombre}
                    </button>
                  </li>
                ))}
              </ul>

              {termino && !hayCoincidenciaExacta && (
                <button
                  type="button"
                  className="sel-cargo__crear"
                  onClick={() => crear()}
                  disabled={creando}
                >
                  {creando ? 'Verificando…' : `+ Crear «${busqueda.trim()}»`}
                </button>
              )}
            </>
          )}

          {error && <p className="sel-cargo__error">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default SelectorCargo