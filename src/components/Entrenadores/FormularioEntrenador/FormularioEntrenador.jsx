import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './FormularioEntrenador.css'

function FormularioEntrenador({ onCreado, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [formacion, setFormacion] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('entrenadores').insert({
      nombre_completo: nombre.trim(),
      numero_documento: documento.trim() || null,
      formacion: formacion.trim() || null,
      licencia_numero: numero.trim() || null,
      licencia_fecha: fecha || null,
    })

    setGuardando(false)

    if (error) {
      setError('No se pudo crear el entrenador')
      console.error(error.message)
      return
    }

    onCreado()
  }

  return (
    <form className="form-entren" onSubmit={guardar}>
      <p className="form-entren__eyebrow">Nuevo</p>
      <h2 className="form-entren__titulo">Entrenador</h2>

      <label className="form-entren__label" htmlFor="ent_nombre">
        Nombre completo *
      </label>
      <input
        id="ent_nombre"
        type="text"
        className="form-entren__input"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Como debe aparecer en el certificado"
        required
      />

      <label className="form-entren__label" htmlFor="ent_doc">
        Documento
      </label>
      <input
        id="ent_doc"
        type="text"
        className="form-entren__input"
        value={documento}
        onChange={(e) => setDocumento(e.target.value)}
        placeholder="80352240"
      />

      <label className="form-entren__label" htmlFor="ent_form">
        Formación o título
      </label>
      <input
        id="ent_form"
        type="text"
        className="form-entren__input"
        value={formacion}
        onChange={(e) => setFormacion(e.target.value)}
        placeholder="Coordinador de Trabajo Seguro en Alturas"
      />

      <div className="form-entren__fila">
        <div className="form-entren__campo">
          <label className="form-entren__label" htmlFor="ent_num">
            Licencia N.°
          </label>
          <input
            id="ent_num"
            type="text"
            className="form-entren__input"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="25-1873"
          />
        </div>

        <div className="form-entren__campo">
          <label className="form-entren__label" htmlFor="ent_fec">
            Expedida el
          </label>
          <input
            id="ent_fec"
            type="date"
            className="form-entren__input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      <p className="form-entren__ayuda">
        La firma se sube después, desde su ficha. Un entrenador no necesita cuenta de
        usuario para dictar grupos ni firmar certificados.
      </p>

      {error && <p className="form-entren__error">{error}</p>}

      <div className="form-entren__acciones">
        <button
          type="button"
          className="form-entren__boton form-entren__boton_sec"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button type="submit" className="form-entren__boton" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear entrenador'}
        </button>
      </div>
    </form>
  )
}

export default FormularioEntrenador