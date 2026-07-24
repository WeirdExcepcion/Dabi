import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Login from './Login/Login'
import Home from './Home/Home'
import Empresas from './Empresas/Empresas'
import Aprendices from './Aprendices/Aprendices'
import FichaAprendiz from './FichaAprendiz/FichaAprendiz'
import RegistroDiario from './RegistroDiario/RegistroDiario'
import Aprobacion from './Aprobacion/Aprobacion'
import Entrenadores from './Entrenadores/Entrenadores'
import Grupos from './Grupos/Grupos'
import DetalleGrupo from './DetalleGrupo/DetalleGrupo'


import './App.css'


function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <p className="app__loading">Cargando...</p>
  }

  if (!session) {
    return <Login />
  }

  return (
    <Routes>
      <Route path="/" element={<Home session={session} />}>
        <Route index element={<Navigate to="/aprendices" replace />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="aprendices" element={<Aprendices />} />
        <Route path="aprendices/:aprendizId" element={<FichaAprendiz />} />
        <Route index element={<Navigate to="/registro" replace />} />
        <Route path="registro" element={<RegistroDiario />} />
        <Route path="aprobacion" element={<Aprobacion />} />
        <Route path="entrenadores" element={<Entrenadores />} />
        <Route path="*" element={<Navigate to="/registro" replace />} />
        <Route path="grupos" element={<Grupos />} />
        <Route path="grupos/:grupoId" element={<DetalleGrupo />} />

      </Route>
    </Routes>
  )
}


export default App