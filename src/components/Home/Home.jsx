import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
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

      <main className="home__content">
        {cargandoPerfil ? (
          <p className="home__subtitle">Cargando perfil...</p>
        ) : perfil ? (
          <>
            <p className="home__eyebrow">Rol: {perfil.rol}</p>
            <h1 className="home__title">Bienvenido, {perfil.nombre_completo}</h1>
            <p className="home__subtitle">
              Aún no hay módulos activos. Estamos construyendo el registro de
              aprendices, la gestión de cursos y la generación de certificados.
            </p>
          </>
        ) : (
          <h1 className="home__title">No se pudo cargar tu perfil</h1>
        )}
      </main>
    </div>
  )
}

export default Home