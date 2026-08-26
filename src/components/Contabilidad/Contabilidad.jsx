import { SECCIONES_CONTABILIDAD } from '../../constants/navegacion'
import { NOVEDADES_MODULO } from '../../constants/novedades'
import LayoutModulo from '../compartidos/LayoutModulo/LayoutModulo'

function Contabilidad({ session, perfil }) {
  return (
    <LayoutModulo
      session={session}
      perfil={perfil}
      secciones={SECCIONES_CONTABILIDAD}
      novedades={NOVEDADES_MODULO.contabilidad}
    />
  )
}

export default Contabilidad