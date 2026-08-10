import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './FormularioPersonal.css'

function FormularioPersonal({ onCreado, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [formacion, setFormacion] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState('')
  const [puedeEntrenar, setPuedeEntrenar] = useState(true)
  const [puedeSupervisar, setPuedeSupervisar] = useState(false)
  const [puedeCoordinar, setPuedeCoordinar] = useState(false)
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

    const caps = {
      puede_entrenar: puedeEntrenar,
      puede_supervisar: puedeSupervisar,
      puede_coordinar: puedeCoordinar,
    }

    const { error } = await supabase.from('entrenadores').insert({
      nombre_completo: nombre.trim(),
      numero_documento: documento.trim() || null,
      formacion: formacion.trim() || null,
      licencia_numero: numero.trim() || null,
      licencia_fecha: fecha || null,
      ...caps,
    })

    setGuardando(false)

    if (error) {
      setError('No se pudo crear')
      console.error(error.message)
      return
    }

    onCreado()
  }

  return (
    <form className="form-per" onSubmit={guardar}>
      <p className="form-per__eyebrow">Nuevo</p>
      <h2 className="form-per__titulo">Personal</h2>

      <label className="form-per__label" htmlFor="per_nombre">Nombre completo *</label>
      <input
        id="per_nombre"
        type="text"
        className="form-per__input"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Como debe aparecer en el certificado"
        required
      />

      <p className="form-per__label">Función</p>
      <div className="form-per__checks">
        <label className="form-per__check">
          <input
            type="checkbox"
            checked={puedeEntrenar}
            onChange={(e) => setPuedeEntrenar(e.target.checked)}
          />
          Entrenador
        </label>

        <label className="form-per__check">
          <input
            type="checkbox"
            checked={puedeSupervisar}
            onChange={(e) => setPuedeSupervisar(e.target.checked)}
          />
          Supervisor
        </label>

        <label className="form-per__check">
          <input
            type="checkbox"
            checked={puedeCoordinar}
            onChange={(e) => setPuedeCoordinar(e.target.checked)}
          />
          Coordinador
        </label>
      </div>

      <label className="form-per__label" htmlFor="per_doc">Documento</label>
      <input
        id="per_doc"
        type="text"
        className="form-per__input"
        value={documento}
        onChange={(e) => setDocumento(e.target.value)}
        placeholder="80352240"
      />

      <label className="form-per__label" htmlFor="per_form">Título profesional</label>
      <input
        id="per_form"
        type="text"
        className="form-per__input"
        value={formacion}
        onChange={(e) => setFormacion(e.target.value)}
        placeholder="Coordinador de Trabajo Seguro en Alturas"
      />

      <div className="form-per__fila">
        <div className="form-per__campo">
          <label className="form-per__label" htmlFor="per_num">Licencia N.°</label>
          <input
            id="per_num"
            type="text"
            className="form-per__input"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="25-1873"
          />
        </div>

        <div className="form-per__campo">
          <label className="form-per__label" htmlFor="per_fec">Expedida el</label>
          <input
            id="per_fec"
            type="date"
            className="form-per__input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      <p className="form-per__ayuda">
        La firma se sube después, desde su ficha. Solo es obligatoria para quien entrena.
      </p>

      {error && <p className="form-per__error">{error}</p>}

      <div className="form-per__acciones">
        <button
          type="button"
          className="form-per__boton form-per__boton_sec"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button type="submit" className="form-per__boton" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

export default FormularioPersonal