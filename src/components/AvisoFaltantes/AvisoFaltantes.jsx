import { useState, useRef } from 'react'
import { useFaltantes } from '../../context/FaltantesContext'
import './AvisoFaltantes.css'

function AvisoFaltantes({ matriculaId }) {
  const { faltantes, ignoradas, ignorar } = useFaltantes()
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const botonRef = useRef(null)

  const lista = faltantes[matriculaId]

  if (!lista || lista.length === 0) return null
  if (ignoradas.has(matriculaId)) return null

  function abrir(e) {
    e.stopPropagation()
    const rect = botonRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
    setAbierto(true)
  }

  const datos = lista.filter((f) => !f.startsWith('Archivo:'))
  const archivos = lista
    .filter((f) => f.startsWith('Archivo:'))
    .map((f) => f.replace('Archivo: ', ''))

  return (
    <span className="aviso-falt">
      <button
        ref={botonRef}
        className="aviso-falt__punto"
        onClick={abrir}
        onMouseEnter={abrir}
        aria-label="Información faltante"
      />

      {abierto && (
        <>
          <span className="aviso-falt__fondo" onClick={() => setAbierto(false)} />
          <div
            className="aviso-falt__panel"
            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setAbierto(false)}
          >
            <div className="aviso-falt__header">
              <span className="aviso-falt__titulo">
                Falta {lista.length} {lista.length === 1 ? 'dato' : 'datos'}
              </span>
            </div>

            <div className="aviso-falt__cuerpo">
              {datos.length > 0 && (
                <div className="aviso-falt__grupo">
                  <p className="aviso-falt__grupo-titulo">Sin llenar</p>
                  <ul className="aviso-falt__lista">
                    {datos.map((d) => (
                      <li key={d} className="aviso-falt__item">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {archivos.length > 0 && (
                <div className="aviso-falt__grupo">
                  <p className="aviso-falt__grupo-titulo">Archivos sin subir</p>
                  <ul className="aviso-falt__lista">
                    {archivos.map((a) => (
                      <li key={a} className="aviso-falt__item">{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className="aviso-falt__ignorar"
              onClick={() => {
                ignorar(matriculaId)
                setAbierto(false)
              }}
            >
              Ocultar por ahora
            </button>
          </div>
        </>
      )}
    </span>
  )
}

export default AvisoFaltantes