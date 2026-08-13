import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { modulosDelRol } from '../../constants/modulos'
import logoOficial from '../../assets/isotipo-ss-p.png'
import './Bienvenida.css'

const ICONOS = {
  alturas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L20 20 H4 Z" />
      <path d="M12 8 v6" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  ),
  contabilidad: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3" />
    </svg>
  ),
}

function Bienvenida({ perfil }) {
  const navegar = useNavigate()
  const modulos = modulosDelRol(perfil.rol)

  const [transicion, setTransicion] = useState(null)
  const refs = useRef({})

  const primerNombre = perfil.nombre_completo?.split(' ')[0] || ''

  function entrar(modulo, evento) {
    if (transicion) return

    const x = evento.clientX
    const y = evento.clientY

    const radioFinal = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    setTransicion({ id: modulo.id, nombre: modulo.nombre, x, y, radioFinal })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransicion((t) => (t ? { ...t, expandida: true } : t))
      })
    })

    setTimeout(() => {
      sessionStorage.setItem('dabi_entrada_modulo', '1')
      navegar(modulo.ruta)
    }, 700)
  }

  return (
    <div className={transicion ? 'bienv bienv_saliendo' : 'bienv'}>
      <div className="bienv__contenido">
        <img src={logoOficial} alt="Staff & Services" className="bienv__logo" />

        <p className="bienv__saludo">Hola, {primerNombre}</p>
        <h1 className="bienv__titulo">¿Dónde trabajarás hoy?</h1>

        <div className="bienv__modulos">
          {modulos.map((modulo, indice) => (
            <button
              key={modulo.id}
              ref={(el) => (refs.current[modulo.id] = el)}
              className={
                transicion && transicion.id !== modulo.id
                  ? 'bienv__modulo bienv__modulo_apagada'
                  : transicion
                  ? 'bienv__modulo bienv__modulo_elegida'
                  : 'bienv__modulo'
              }
              style={{ animationDelay: `${0.15 + indice * 0.08}s` }}
              onClick={(e) => entrar(modulo, e)}
            >
              <span className="bienv__modulo-icono">{ICONOS[modulo.id]}</span>
              <span className="bienv__modulo-nombre">{modulo.nombre}</span>
              <span className="bienv__modulo-desc">{modulo.descripcion}</span>
              <span className="bienv__modulo-flecha">→</span>
            </button>
          ))}
        </div>

        <p className="bienv__pie">
          {perfil.rol.replace(/-/g, ' ')} · Staff and Services SAS
        </p>
      </div>

      {transicion && (
        <div
          className="bienv__velo"
          style={{
            clipPath: transicion.expandida
              ? `circle(${transicion.radioFinal}px at ${transicion.x}px ${transicion.y}px)`
              : `circle(0px at ${transicion.x}px ${transicion.y}px)`,
          }}
        >
          <span className="bienv__velo-texto">{transicion.nombre}</span>
        </div>
      )}
    </div>
  )
}

export default Bienvenida