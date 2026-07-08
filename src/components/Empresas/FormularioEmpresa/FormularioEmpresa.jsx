import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './FormularioEmpresa.css'

function FormularioEmpresa({ onCreada, onCancelar }) {
  const [razonSocial, setRazonSocial] = useState('')
  const [nit, setNit] = useState('')
  const [representanteLegal, setRepresentanteLegal] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)

    const { data, error } = await supabase
      .from('empresas')
      .insert({
        razon_social: razonSocial,
        nit: nit || null,
        representante_legal: representanteLegal || null,
        correo: correo || null,
        telefono: telefono || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        setError('Ya existe una empresa con ese NIT')
      } else {
        setError('No se pudo guardar la empresa')
      }
      console.error(error.message)
      setGuardando(false)
      return
    }

    onCreada(data)
  }

  return (
    <form className="form-empresa" onSubmit={handleSubmit}>
      <h2 className="form-empresa__titulo">Nueva empresa</h2>

      <label className="form-empresa__label" htmlFor="razon_social">
        Razón social *
      </label>
      <input
        id="razon_social"
        type="text"
        className="form-empresa__input"
        value={razonSocial}
        onChange={(e) => setRazonSocial(e.target.value)}
        required
      />

      <label className="form-empresa__label" htmlFor="nit">NIT</label>
      <input
        id="nit"
        type="text"
        className="form-empresa__input"
        value={nit}
        onChange={(e) => setNit(e.target.value)}
        placeholder="900.123.456-7"
      />

      <label className="form-empresa__label" htmlFor="representante_legal">
        Representante legal
      </label>
      <input
        id="representante_legal"
        type="text"
        className="form-empresa__input"
        value={representanteLegal}
        onChange={(e) => setRepresentanteLegal(e.target.value)}
      />

      <label className="form-empresa__label" htmlFor="correo">Correo</label>
      <input
        id="correo"
        type="email"
        className="form-empresa__input"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
      />

      <label className="form-empresa__label" htmlFor="telefono">Teléfono</label>
      <input
        id="telefono"
        type="tel"
        className="form-empresa__input"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      />

      {error && <p className="form-empresa__error">{error}</p>}

      <div className="form-empresa__acciones">
        <button
          type="button"
          className="form-empresa__boton form-empresa__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="form-empresa__boton"
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : 'Guardar empresa'}
        </button>
      </div>
    </form>
  )
}

export default FormularioEmpresa