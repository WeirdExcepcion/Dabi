import { useState, useEffect, useRef } from 'react'
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
  const [hayNovedades, setHayNovedades] = useState(false)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const listaRef = useRef(null)
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
  }, [ubicacion.pathname, menuPlegado, perfil])
  
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
        <nav className={menuPlegado ? 'home__nav home__nav_plegado' : 'home__nav'}>
          <div className="home__nav-superior">
            <div className="home__nav-cabecera">
              <p className="home__nav-eyebrow">{perfil.rol}</p>
              <button
                className="home__plegar"
                onClick={() => setMenuPlegado((v) => !v)}
                title={menuPlegado ? 'Mostrar menú' : 'Ocultar menú'}
                aria-label={menuPlegado ? 'Mostrar menú' : 'Ocultar menú'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
            <p className="home__nav-nombre">{perfil.nombre_completo}</p>

            <ul className="home__nav-lista" ref={listaRef}>
              {indicador.visible && (
                <span
                  className="home__nav-indicador"
                  style={{
                    transform: `translateY(${indicador.top}px)`,
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
            <p className="home__email">{session.user.email}</p>
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