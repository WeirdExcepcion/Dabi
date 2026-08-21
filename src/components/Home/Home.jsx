import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SECCIONES } from '../../constants/navegacion'
import { PUEDE_APROBAR } from '../../constants/permisos'
import { AuditoriaProvider } from '../../context/AuditoriaContext'
import PanelLateral from '../compartidos/PanelLateral/PanelLateral'
import Auditoria from '../Alturas/Auditoria/Auditoria'
import Novedades from '../Novedades/Novedades'
import Modal from '../compartidos/Modal/Modal'
import { VERSION_ACTUAL } from '../../constants/novedades'
import VeloEntrada from '../compartidos/VeloEntrada/VeloEntrada'
import logoSS from '../../assets/isotipo-ss-p.png'
import './Home.css'

function Home({ session, perfil }) {
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false)
  const [novedadesAbiertas, setNovedadesAbiertas] = useState(false)
  const [menuPlegado, setMenuPlegado] = useState(false)
  // true mientras dura la animación de ancho del menú (plegar/expandir).
  // Mientras esto es true, el rol/nombre/correo/botón de salir se congelan
  // en una sola línea (ver .home__nav_transicionando en Home.css) para que
  // el wrap del texto no salte a mitad de la animación.
  const [transicionando, setTransicionando] = useState(false)
  const [hayNovedades, setHayNovedades] = useState(false)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const listaRef = useRef(null)
  const navRef = useRef(null)
  const eyebrowRef = useRef(null)
  const nombreRef = useRef(null)
  const emailRef = useRef(null)
  const [alturaFija, setAlturaFija] = useState({ rol: null, nombre: null, email: null })
  const [indicador, setIndicador] = useState({ top: 0, alto: 0, visible: false })

  useEffect(() => {
    const vista = localStorage.getItem('dabi_version_vista')
    if (vista !== VERSION_ACTUAL) {
      setHayNovedades(true)
      setNovedadesAbiertas(true)
    }
  }, [])

  useEffect(() => {
    if (menuPlegado) {
      setIndicador((i) => ({ ...i, visible: false }))
      return
    }

    const cuadro = listaRef.current
    if (!cuadro) return

    // offsetTop/offsetHeight (no getBoundingClientRect): dan la posición ya relativa
    // a .home__nav-lista (su position:relative), sin que el scroll del navegador
    // pueda desincronizar el cálculo.

    const medir = () => {
      const activo = cuadro.querySelector('.home__nav-link_activo')
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

    // Ya no hace falta ResizeObserver aquí: .home__nav-link tiene
    // white-space: nowrap permanente, así que su alto nunca cambia sin
    // importar el ancho de .home__nav — por lo tanto la posición del
    // activo dentro de la lista no se mueve durante la animación de
    // plegar/expandir, y basta con medir una vez cuando cambia la ruta,
    // el menú se pliega/expande, o cambia el perfil.
    const raf = requestAnimationFrame(medir)
    return () => cancelAnimationFrame(raf)
  }, [ubicacion.pathname, menuPlegado, perfil])
  
  // Mide una sola vez (al montar, con el menú ya expandido) cuánto alto
  // necesita realmente el rol/nombre/correo — 1 o 2 líneas según el
  // contenido — y lo deja fijo como min-height. Así el texto se puede
  // envolver libremente sin que nada de abajo se mueva, sin importar
  // cuántas veces se pliegue/expanda el menú después. No depende de
  // menuPlegado a propósito: si volviera a medir en cada toggle, mediría
  // con el texto ya congelado en una línea (por transicionando) y
  // guardaría un alto incorrecto — eso fue un bug real que ya pasó aquí.
  useLayoutEffect(() => {
    const altoRol = eyebrowRef.current?.offsetHeight
    const altoNombre = nombreRef.current?.offsetHeight
    const altoEmail = emailRef.current?.offsetHeight
    if (!altoRol || !altoNombre || !altoEmail) return
    setAlturaFija({ rol: altoRol, nombre: altoNombre, email: altoEmail })
  }, [perfil?.rol, perfil?.nombre_completo, session?.user?.email])

  function cerrarNovedades() {
    localStorage.setItem('dabi_version_vista', VERSION_ACTUAL)
    setNovedadesAbiertas(false)
    setHayNovedades(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navegar('/login')
  }

  if (!perfil) {
    return (
      <div className="home__sin-perfil">
        <p className="home__sin-perfil-titulo">Tu cuenta no tiene un perfil asignado</p>
        <p className="home__sin-perfil-texto">
          Contacta al administrador del sistema para que configure tu acceso.
        </p>
        <button className="home__sin-perfil-boton" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  const seccionesVisibles = SECCIONES.filter((seccion) =>
    seccion.roles.includes(perfil.rol)
  )
  const puedeAuditar = PUEDE_APROBAR.includes(perfil.rol)

  return (
    <AuditoriaProvider>
    <VeloEntrada />
    <div className="home">
      <header className="home__header">
        <button
          className="home__brand"
          onClick={() => navegar('/')}
          title="Ir al inicio"
        >
          <img src={logoSS} alt="Staff & Services" className="home__logo" />
          <span className="home__wordmark">DABI</span>
        </button>

        <div className="home__header-acciones">
          {puedeAuditar && (
            <button
              className="home__auditoria"
              onClick={() => setAuditoriaAbierta(true)}
              title="Registro de auditoría"
              aria-label="Registro de auditoría"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </button>
          )}
        </div>
      </header>

        {novedadesAbiertas && (
        <Modal onCerrar={cerrarNovedades}>
          <Novedades onCerrar={cerrarNovedades} />
        </Modal>
      )}

        {auditoriaAbierta && (
        <PanelLateral onCerrar={() => setAuditoriaAbierta(false)}>
          <Auditoria onCerrar={() => setAuditoriaAbierta(false)} />
        </PanelLateral>
      )}
      
      <div className="home__body">
        <nav
          ref={navRef}
          className={[
            'home__nav',
            menuPlegado && 'home__nav_plegado',
            transicionando && 'home__nav_transicionando',
          ].filter(Boolean).join(' ')}

          // Se apaga transicionando cuando termina la transición de flex-basis
          // (el ancho), no antes por tiempo fijo — así nunca se desincroniza
          // aunque cambies la duración de la transición en el CSS.
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === 'flex-basis') {
              setTransicionando(false)
            }
          }}
        >
          <div className="home__nav-superior">
            <div className="home__nav-cabecera">
              <p
                className="home__nav-eyebrow"
                ref={eyebrowRef}
                style={alturaFija.rol ? { minHeight: `${alturaFija.rol}px` } : undefined}
              >
                {perfil.rol}
              </p>
              <button
                className="home__plegar"
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
              className="home__nav-nombre"
              ref={nombreRef}
              style={alturaFija.nombre ? { minHeight: `${alturaFija.nombre}px` } : undefined}
            >
              {perfil.nombre_completo}
            </p>

            <ul className="home__nav-lista" ref={listaRef}>
                {indicador.visible && (
                <span
                  className="home__nav-indicador"
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
                      isActive ? 'home__nav-link home__nav-link_activo' : 'home__nav-link'
                    }
                  >
                    {seccion.etiqueta}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="home__nav-pie">
            <p
              className="home__email"
              ref={emailRef}
              style={alturaFija.email ? { minHeight: `${alturaFija.email}px` } : undefined}
            >
              {session.user.email}
            </p>
            <div className="home__pie-acciones">
              <button className="home__logout" onClick={handleLogout}>
                Cerrar sesión
              </button>

              <button
                className={hayNovedades ? 'home__novedades home__novedades_nuevo' : 'home__novedades'}
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

        <main className="home__content">
          <Outlet context={{ perfil, session }} />
        </main>
      </div>
   </div>
    </AuditoriaProvider>
  )
}

export default Home