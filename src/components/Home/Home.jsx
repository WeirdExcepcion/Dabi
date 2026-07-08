import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SECCIONES } from '../../constants/navegacion'
import logoSS from '../../assets/isotipo-ss.png'
import './Home.css'

function Home({ session }) {
  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

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

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__brand">
          <img src={logoSS} alt="Staff & Services" className="home__logo" />
          <span className="home__wordmark">DABI</span>
        </div>
        <div className="home__user">
          <span className="home__email">{session.user.email}</span>
          <button className="home__logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="home__body">
        <nav className="home__nav">
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
        </nav>

        <main className="home__content">
          <Outlet context={{ perfil, session }} />
        </main>
      </div>
    </div>
  )
}

export default Home