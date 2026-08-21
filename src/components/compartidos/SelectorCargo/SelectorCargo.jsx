import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { invalidarCatalogo } from '../../../lib/catalogos'
import { useDesplegable } from '../../../hooks/useDesplegable'
import '../SelectorBuscable/SelectorBuscable.css'
import './SelectorCargo.css'

function SelectorCargo({ id, cargos, valor, onCambio, onCargoCreado }) {
  const [similares, setSimilares] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const {
    abierto, alternar, cerrar,
    busqueda, termino, cambiarBusqueda,
    indiceActivo, setIndiceActivo, manejarTeclas,
    contenedorRef, inputRef,
  } = useDesplegable({
    limpiarExtra: () => {
      setSimilares(null)
      setError('')
    },
  })

  const seleccionado = cargos.find((c) => String(c.id) === String(valor))

  const filtrados = termino
    ? cargos.filter((c) => c.nombre.toLowerCase().includes(termino))
    : cargos

  const hayCoincidenciaExacta = cargos.some((c) => c.nombre.toLowerCase() === termino)

  function elegir(cargo) {
    onCambio(cargo ? String(cargo.id) : '')
    cerrar()
  }

  async function crear(forzar = false) {
    setError('')
    setCreando(true)

    const { data, error: errorRpc } = await supabase.rpc('crear_o_encontrar_cargo', {
      p_nombre: busqueda.trim(),
      p_forzar: forzar,
    })

    setCreando(false)

    if (errorRpc) {
      setError('No se pudo crear el cargo')
      console.error(errorRpc.message)
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
      invalidarCatalogo('cargos')
      onCargoCreado({ id: data.id, nombre: data.nombre })
      onCambio(String(data.id))
      cerrar()
    }
  }

  return (
    <div className="sel-busc" ref={contenedorRef}>
      <button
        type="button"
        id={id}
        className="sel-busc__disparador"
        onClick={alternar}
      >
        <span className={seleccionado ? 'sel-busc__valor' : 'sel-busc__valor sel-busc__valor_vacio'}>
          {seleccionado ? seleccionado.nombre : '—'}
        </span>
        <span className="sel-busc__flecha">▾</span>
      </button>

      {abierto && (
        <div className="sel-busc__panel">
          <input
            ref={inputRef}
            type="text"
            className="sel-busc__input"
            placeholder="Buscar o escribir uno nuevo…"
            value={busqueda}
            onChange={(e) => {
              cambiarBusqueda(e.target.value)
              setSimilares(null)
              setError('')
            }}
            onKeyDown={(e) => {
              if (similares) return
              manejarTeclas(e, {
                cantidad: filtrados.length,
                alElegir: (i) => elegir(filtrados[i]),
                alNoHallar: () => {
                  if (termino && !hayCoincidenciaExacta) crear()
                },
              })
            }}
          />

          {similares ? (
            <div className="sel-cargo__similares">
              <p className="sel-cargo__similares-titulo">
                Ya existen cargos parecidos
              </p>
              <ul className="sel-busc__lista">
                {similares.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="sel-busc__opcion"
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
              <ul className="sel-busc__lista">
                {filtrados.length === 0 && !termino && (
                  <li className="sel-busc__sin-resultados">Sin cargos registrados</li>
                )}

                {filtrados.map((cargo, indice) => (
                  <li key={cargo.id}>
                    <button
                      type="button"
                      className={
                        indice === indiceActivo
                          ? 'sel-busc__opcion sel-busc__opcion_activa'
                          : 'sel-busc__opcion'
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