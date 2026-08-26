import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import Modal from '../Modal/Modal'
import Novedades from '../../Novedades/Novedades'
import VeloEntrada from '../VeloEntrada/VeloEntrada'
import logoSS from '../../../assets/isotipo-ss-p.png'
import './LayoutModulo.css'

// Estructura común de los módulos: cabecera, menú lateral plegable con
// indicador deslizante, pie con la sesión, y el contenido del Outlet.
// accionesCabecera: botones propios del módulo, a la derecha del logo.
// superpuestos: paneles o modales propios del módulo (auditoría, por ejemplo).
function LayoutModulo({
  session,
  perfil,
  secciones,
  novedades,
  accionesCabecera = null,
  superpuestos = null,
}) {
  const [novedadesAbiertas, setNovedadesAbiertas] = useState(false)
  const [hayNovedades, setHayNovedades] = useState(false)
  const [menuPlegado, setMenuPlegado] = useState(false)
  // true mientras dura la animación de ancho del menú. Mientras tanto el
  // rol/nombre/correo/botón de salir se congelan en una línea (ver
  // .layout__nav_transicionando) para que el wrap no salte a mitad de camino.
  const [transicionando, setTransicionando] = useState(false)

  const navegar = useNavigate()
  const ubicacion = useLocation()
  const listaRef = useRef(null)
  const eyebrowRef = useRef(null)
  const nombreRef = useRef(null)
  const emailRef = useRef(null)
  const [alturaFija, setAlturaFija] = useState({ rol: null, nombre: null, email: null })
  const [indicador, setIndicador] = useState({ top: 0, alto: 0, visible: false })

  useEffect(() => {
    const vista = localStorage.getItem(novedades.clave)
    if (vista !== novedades.version) {
      setHayNovedades(true)
      setNovedadesAbiertas(true)
    }
  }, [novedades.clave, novedades.version])

  useEffect(() => {
    if (menuPlegado) {
      setIndicador((i) => ({ ...i, visible: false }))
      return
    }

    const cuadro = listaRef.current
    if (!cuadro) return

    // offsetTop/offsetHeight (no getBoundingClientRect): dan la posición ya
    // relativa a .layout__nav-lista, sin que el scroll desincronice el cálculo.
    const medir = () => {
      const activo = cuadro.querySelector('.layout__nav-link_activo')
      if (!activo) {
        setIndicador((i) => ({ ...i, visible: false }))
        return
      }

      setIndicador({
        top: activo.offsetTop,
        alto: activo.offsetHeight,
        visible: true,
      })
    }

    // No hace falta ResizeObserver: .layout__nav-link tiene white-space:
    // nowrap permanente, así que su alto nunca cambia con el ancho del menú.
    const raf = requestAnimationFrame(medir)
    return () => cancelAnimationFrame(raf)
  }, [ubicacion.pathname, menuPlegado, perfil])

  // Mide una sola vez cuánto alto necesita el rol/nombre/correo y lo deja
  // fijo como min-height, para que el texto pueda envolverse sin mover nada.
  // No depende de menuPlegado a propósito: al plegar, el texto ya está
  // congelado en una línea y la medición saldría mal.
  useLayoutEffect(() => {
    const altoRol = eyebrowRef.current?.offsetHeight
    const altoNombre = nombreRef.current?.offsetHeight
    const altoEmail = emailRef.current?.offsetHeight
    if (!altoRol || !altoNombre || !altoEmail) return
    setAlturaFija({ rol: altoRol, nombre: altoNombre, email: altoEmail })
  }, [perfil?.rol, perfil?.nombre_completo, session?.user?.email])

  function cerrarNovedades() {
    localStorage.setItem(novedades.clave, novedades.version)
    setNovedadesAbiertas(false)
    setHayNovedades(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navegar('/login')
  }

  if (!perfil) {
    return (
      <div className="layout__sin-perfil">
        <p className="layout__sin-perfil-titulo">Tu cuenta no tiene un perfil asignado</p>
        <p className="layout__sin-perfil-texto">
          Contacta al administrador del sistema para que configure tu acceso.
        </p>
        <button className="layout__sin-perfil-boton" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  const seccionesVisibles = secciones.filter((s) => s.roles.includes(perfil.rol))

  return (
    <>
      <VeloEntrada />
      <div className="layout">
        <header className="layout__header">
          <button className="layout__brand" onClick={() => navegar('/')} title="Ir al inicio">
            <img src={logoSS} alt="Staff & Services" className="layout__logo" />
            <span className="layout__wordmark">DABI</span>
          </button>

          <div className="layout__header-acciones">{accionesCabecera}</div>
        </header>

        {novedadesAbiertas && (
          <Modal onCerrar={cerrarNovedades}>
            <Novedades entradas={novedades.entradas} onCerrar={cerrarNovedades} />
          </Modal>
        )}

        {superpuestos}

        <div className="layout__body">
          <nav
            className={[
              'layout__nav',
              menuPlegado && 'layout__nav_plegado',
              transicionando && 'layout__nav_transicionando',
            ].filter(Boolean).join(' ')}
            // Se apaga transicionando cuando termina la transición de
            // flex-basis, no por tiempo fijo, así nunca se desincroniza.
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget && e.propertyName === 'flex-basis') {
                setTransicionando(false)
              }
            }}
          >
            <div className="layout__nav-superior">
              <div className="layout__nav-cabecera">
                <p
                  className="layout__nav-eyebrow"
                  ref={eyebrowRef}
                  style={alturaFija.rol ? { minHeight: `${alturaFija.rol}px` } : undefined}
                >
                  {perfil.rol}
                </p>
                <button
                  className="layout__plegar"
                  onClick={() => {
                    setTransicionando(true)
                    setMenuPlegado((v) => !v)
                  }}
                  title={menuPlegado ? 'Mostrar menú' : 'Ocultar menú'}
                  aria-label={menuPlegado ? 'Mostrar menú' : 'Ocultar menú'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              </div>

              <p
                className="layout__nav-nombre"
                ref={nombreRef}
                style={alturaFija.nombre ? { minHeight: `${alturaFija.nombre}px` } : undefined}
              >
                {perfil.nombre_completo}
              </p>

              <ul className="layout__nav-lista" ref={listaRef}>
                {indicador.visible && (
                  <span
                    className="layout__nav-indicador"
                    style={{
                      top: `${indicador.top}px`,
                      height: `${indicador.alto}px`,
                    }}
                  />
                )}
                {seccionesVisibles.map((seccion) => (
                  <li key={seccion.ruta}>
                    <NavLink
                      to={seccion.ruta}
                      className={({ isActive }) =>
                        isActive ? 'layout__nav-link layout__nav-link_activo' : 'layout__nav-link'
                      }
                    >
                      {seccion.etiqueta}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="layout__nav-pie">
              <p
                className="layout__email"
                ref={emailRef}
                style={alturaFija.email ? { minHeight: `${alturaFija.email}px` } : undefined}
              >
                {session.user.email}
              </p>
              <div className="layout__pie-acciones">
                <button className="layout__logout" onClick={handleLogout}>
                  Cerrar sesión
                </button>

                <button
                  className={hayNovedades ? 'layout__novedades layout__novedades_nuevo' : 'layout__novedades'}
                  onClick={() => setNovedadesAbiertas(true)}
                  title="Novedades"
                  aria-label="Novedades"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5" />
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </nav>

          <main className="layout__content">
            <Outlet context={{ perfil, session }} />
          </main>
        </div>
      </div>
    </>
  )
}

export default LayoutModulo