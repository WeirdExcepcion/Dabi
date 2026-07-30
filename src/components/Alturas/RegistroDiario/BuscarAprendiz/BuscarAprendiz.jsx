import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './BuscarAprendiz.css'

function BuscarAprendiz({ onEncontrado, onNoEncontrado }) {
  const [tipoDocumento, setTipoDocumento] = useState('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBuscando(true)

    const { data, error } = await supabase
      .from('aprendices')
      .select('*')
      .eq('tipo_documento', tipoDocumento)
      .eq('numero_documento', numeroDocumento.trim())
      .maybeSingle()

    setBuscando(false)

    if (error) {
      setError('Error al buscar el aprendiz')
      console.error(error.message)
      return
    }

    if (data) {
      onEncontrado(data)
    } else {
      onNoEncontrado({ tipoDocumento, numeroDocumento: numeroDocumento.trim() })
    }
  }

  return (
    <form className="buscar-aprendiz" onSubmit={handleSubmit}>
      <h2 className="buscar-aprendiz__titulo">Nueva matrícula</h2>
      <p className="buscar-aprendiz__ayuda">
        Ingresa el documento del aprendiz para comenzar
      </p>

      <div className="buscar-aprendiz__campos">
        <div className="buscar-aprendiz__campo buscar-aprendiz__campo_tipo">
          <label className="buscar-aprendiz__label" htmlFor="tipo_documento">
            Tipo
          </label>
          <select
            id="tipo_documento"
            className="buscar-aprendiz__select"
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
          >
            <option value="CC">CC</option>
            <option value="CE">CE</option>
            <option value="PPT">PPT</option>
            <option value="PA">PA</option>
          </select>
        </div>

        <div className="buscar-aprendiz__campo">
          <label className="buscar-aprendiz__label" htmlFor="numero_documento">
            Número de documento
          </label>
          <input
            id="numero_documento"
            type="text"
            className="buscar-aprendiz__input"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            autoFocus
            required
          />
        </div>

        <button
          type="submit"
          className="buscar-aprendiz__boton"
          disabled={buscando}
        >
          {buscando ? 'Buscando...' : 'Continuar'}
        </button>
      </div>

      {error && <p className="buscar-aprendiz__error">{error}</p>}
    </form>
  )
}

export default BuscarAprendiz