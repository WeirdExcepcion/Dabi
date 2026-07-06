import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logoSS from '../../assets/isotipo-ss-p.png'
import dabiLogo from '../../assets/Dabi-logo.png'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
    }

    setLoading(false)
  }

  return (
    <div className="login">
      <div className="login__brand">
        <div className="login__brand-content">
          <img src={logoSS} alt="Staff & Services" className="login__logo" />
          <p className="login__eyebrow">Dabi Software</p>
          <h1 className="login__title">STAFF & SERVICES</h1>
          <p className="login__subtitle">Portal de ingreso</p>
        </div>
        <p className="login__caption">
          <img src={dabiLogo} alt="Dabi" className="login__caption-logo" />Dabi</p>
      </div>

      <div className="login__panel">
        <form className="login__form" onSubmit={handleSubmit}>
          <h2 className="login__form-title">Ingresar</h2>
          <p className="login__form-subtitle">Accede con tu cuenta autorizada</p>

          <label className="login__label" htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            className="login__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="login__label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="login__error">{error}</p>}

          <button className="login__button" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login