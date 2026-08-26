import { useState } from 'react'
import { SECCIONES } from '../../constants/navegacion'
import { PUEDE_APROBAR } from '../../constants/permisos'
import { NOVEDADES_MODULO } from '../../constants/novedades'
import { AuditoriaProvider } from '../../context/AuditoriaContext'
import LayoutModulo from '../compartidos/LayoutModulo/LayoutModulo'
import PanelLateral from '../compartidos/PanelLateral/PanelLateral'
import Auditoria from '../Alturas/Auditoria/Auditoria'

function Home({ session, perfil }) {
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false)
  const puedeAuditar = PUEDE_APROBAR.includes(perfil?.rol)

  return (
    <AuditoriaProvider>
      <LayoutModulo
        session={session}
        perfil={perfil}
        secciones={SECCIONES}
        novedades={NOVEDADES_MODULO.alturas}
        accionesCabecera={
          puedeAuditar && (
            <button
              className="layout__accion"
              onClick={() => setAuditoriaAbierta(true)}
              title="Registro de auditoría"
              aria-label="Registro de auditoría"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </button>
          )
        }
        superpuestos={
          auditoriaAbierta && (
            <PanelLateral onCerrar={() => setAuditoriaAbierta(false)}>
              <Auditoria onCerrar={() => setAuditoriaAbierta(false)} />
            </PanelLateral>
          )
        }
      />
    </AuditoriaProvider>
  )
}

export default Home