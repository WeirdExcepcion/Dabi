import { Navigate } from 'react-router-dom'
import { modulosDelRol } from '../../constants/modulos'

function RutaModulo({ perfil, modulo, children }) {
  const permitidos = modulosDelRol(perfil?.rol)
  const tieneAcceso = permitidos.some((m) => m.id === modulo)

  if (!tieneAcceso) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RutaModulo