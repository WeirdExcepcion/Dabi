import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SECCIONES_CONTABILIDAD } from '../../constants/navegacion'
import VeloEntrada from '../compartidos/VeloEntrada/VeloEntrada'
import logoSS from '../../assets/isotipo-ss-p.png'
import './Contabilidad.css'

function Contabilidad({ session, perfil }) {
  const navegar = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navegar('/login')
  }

  const secciones = SECCIONES_CONTABILIDAD.filter((s) => s.roles.includes(perfil.rol))

  return (
    <>
      <VeloEntrada />
      <div className="conta">
        <header className="conta__header">
          <button className="conta__brand" onClick={() => navegar('/')} title="Ir al inicio">
            <img src={logoSS} alt="Staff & Services" className="conta__logo" />
            <span className="conta__wordmark">DABI</span>
          </button>
        </header>

        <div className="conta__body">
          <nav className="conta__nav">
            <div>
              <p className="conta__nav-eyebrow">{perfil.rol}</p>
              <p className="conta__nav-nombre">{perfil.nombre_completo}</p>

              <ul className="conta__nav-lista">
                {secciones.map((seccion) => (
                  <li key={seccion.ruta}>
                    <NavLink
                      to={seccion.ruta}
                      className={({ isActive }) =>
                        isActive ? 'conta__nav-link conta__nav-link_activo' : 'conta__nav-link'
                      }
                    >
                      {seccion.etiqueta}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="conta__nav-pie">
              <p className="conta__email">{session.user.email}</p>
              <button className="conta__logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </nav>

          <main className="conta__content">
            <Outlet context={{ perfil, session }} />
          </main>
        </div>
      </div>
    </>
  )
}

export default Contabilidad