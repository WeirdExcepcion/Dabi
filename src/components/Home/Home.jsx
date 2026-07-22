import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SECCIONES } from '../../constants/navegacion'
import { PUEDE_APROBAR } from '../../constants/permisos'
import { AuditoriaProvider } from '../../context/AuditoriaContext'
import PanelLateral from '../PanelLateral/PanelLateral'
import Auditoria from '../Auditoria/Auditoria'
import logoSS from '../../assets/isotipo-ss.png'
import './Home.css'

function Home({ session }) {
  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false)

  useEffect(() => {
    async function obtenerPerfil() {
      const { data, error } = await supabase
        .from('profiles')
        .select('nombre_completo, rol')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error al cargar el perfil:', error.message)
      } else {
        setPerfil(data)
      }

      setCargandoPerfil(false)
    }

    obtenerPerfil()
  }, [session.user.id])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (cargandoPerfil) {
    return <p className="app__loading">Cargando perfil...</p>
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
    <div className="home">
      <header className="home__header">
        <div className="home__brand">
          <img src={logoSS} alt="Staff & Services" className="home__logo" />
          <span className="home__wordmark">DABI</span>
        </div>

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
      </header>

        {auditoriaAbierta && (
        <PanelLateral onCerrar={() => setAuditoriaAbierta(false)}>
          <Auditoria onCerrar={() => setAuditoriaAbierta(false)} />
        </PanelLateral>
      )}
      
      <div className="home__body">
        <nav className="home__nav">
          <div className="home__nav-superior">
            <p className="home__nav-eyebrow">{perfil.rol}</p>
            <p className="home__nav-nombre">{perfil.nombre_completo}</p>

            <ul className="home__nav-lista">
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
            <button className="home__logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
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