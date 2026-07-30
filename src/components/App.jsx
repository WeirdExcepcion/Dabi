import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Login from './Login/Login'
import Home from './Home/Home'
import Empresas from "./compartidos/Empresas/Empresas";
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

  return (
    <Routes>
      {/* Público — sin login */}
      <Route path="/verificar" element={<Verificar />} />
      <Route path="/verificar/:codigo" element={<Verificar />} />

      {/* Privado — requiere sesión */}
      {session ? (
        <Route path="/" element={<FaltantesProvider><Home session={session} /></FaltantesProvider>}>
          <Route index element={<Navigate to="/aprendices" replace />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="aprendices" element={<Aprendices />} />
          <Route path="aprendices/:aprendizId" element={<FichaAprendiz />} />
          <Route path="registro" element={<RegistroDiario />} />
          <Route path="aprobacion" element={<Aprobacion />} />
          <Route path="personal" element={<Personal />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="grupos/:grupoId" element={<DetalleGrupo />} />
          <Route path="*" element={<Navigate to="/registro" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Login />} />
      )}
    </Routes>
  )
}

export default App