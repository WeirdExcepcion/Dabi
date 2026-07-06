import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Login from './Login/Login'
import Home from './Home/Home'
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
    return <p>Cargando...</p>
  }

  return session ? <Home session={session} /> : <Login />
}

export default App