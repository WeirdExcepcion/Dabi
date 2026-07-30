import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './FormularioPersonal.css'

function FormularioPersonal({ onCreado, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [formacion, setFormacion] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState('')
  const [capacidad, setCapacidad] = useState('entrenador')
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

    const caps =
      capacidad === 'ambos'
        ? { puede_entrenar: true, puede_supervisar: true }
        : capacidad === 'supervisor'
        ? { puede_entrenar: false, puede_supervisar: true }
        : { puede_entrenar: true, puede_supervisar: false }

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

      <label className="form-per__label" htmlFor="per_cap">Función</label>
      <select
        id="per_cap"
        className="form-per__input"
        value={capacidad}
        onChange={(e) => setCapacidad(e.target.value)}
      >
        <option value="entrenador">Entrenador</option>
        <option value="supervisor">Supervisor</option>
        <option value="ambos">Entrenador y supervisor</option>
      </select>

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