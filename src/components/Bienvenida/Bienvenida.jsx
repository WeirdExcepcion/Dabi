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

  const primerNombre = perfil.nombre_completo?.split(' ')[0] || ''

  return (
    <div className="bienv">
      <div className="bienv__contenido">
        <img src={logoOficial} alt="Staff & Services" className="bienv__logo" />

        <p className="bienv__saludo">Hola, {primerNombre}</p>
        <h1 className="bienv__titulo">¿Dónde quieres trabajar hoy?</h1>

        <div className="bienv__modulos">
          {modulos.map((modulo, indice) => (
            <button
              key={modulo.id}
              className="bienv__modulo"
              style={{ animationDelay: `${0.15 + indice * 0.08}s` }}
              onClick={() => navegar(modulo.ruta)}
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
    </div>
  )
}

export default Bienvenida