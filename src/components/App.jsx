import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Login from './Login/Login'
import Home from './Home/Home'
import Bienvenida from './Bienvenida/Bienvenida'
import Empresas from './compartidos/Empresas/Empresas'
import AprendicesEmpresa from './compartidos/Empresas/AprendicesEmpresa/AprendicesEmpresa'
import Aprendices from './Alturas/Aprendices/Aprendices'
import FichaAprendiz from './Alturas/FichaAprendiz/FichaAprendiz'
import RegistroDiario from './Alturas/RegistroDiario/RegistroDiario'
import Aprobacion from './Alturas/Aprobacion/Aprobacion'
import Personal from './Alturas/Personal/Personal'
import Grupos from './Alturas/Grupos/Grupos'
import DetalleGrupo from './Alturas/DetalleGrupo/DetalleGrupo'
import Verificar from './Verificar/Verificar'
import { FaltantesProvider } from '../context/FaltantesContext'

import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setPerfil(null)
      setCargandoPerfil(false)
      return
    }

    async function cargarPerfil() {
      setCargandoPerfil(true)
      const { data } = await supabase
        .from('profiles')
        .select('nombre_completo, rol')
        .eq('id', session.user.id)
        .single()

      setPerfil(data || null)
      setCargandoPerfil(false)
    }

    cargarPerfil()
  }, [session])

  if (loading || (session && cargandoPerfil)) {
    return <p className="app__loading">Cargando...</p>
  }

  return (
    <Routes>
      {/* Público — sin login */}
      <Route path="/verificar" element={<Verificar />} />
      <Route path="/verificar/:codigo" element={<Verificar />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Bienvenida a pantalla completa */}
      {session && perfil && (
        <Route path="/" element={<Bienvenida perfil={perfil} />} />
      )}

      {/* Privado — requiere sesión */}
      {session ? (
        <Route path="/alturas" element={<FaltantesProvider><Home session={session} /></FaltantesProvider>}>
          <Route index element={<Navigate to="/alturas/registro" replace />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="empresas/:empresaId" element={<AprendicesEmpresa />} />
          <Route path="aprendices" element={<Aprendices />} />
          <Route path="aprendices/:aprendizId" element={<FichaAprendiz />} />
          <Route path="registro" element={<RegistroDiario />} />
          <Route path="aprobacion" element={<Aprobacion />} />
          <Route path="personal" element={<Personal />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="grupos/:grupoId" element={<DetalleGrupo />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}

      {session && (
        <Route path="*" element={<Navigate to="/" replace />} />
      )}
    </Routes>
  )
}

export default App