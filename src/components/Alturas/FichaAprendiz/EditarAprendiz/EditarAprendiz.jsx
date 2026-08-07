import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './EditarAprendiz.css'

function EditarAprendiz({ aprendiz, onGuardado, onCancelar }) {
  const [nombres, setNombres] = useState(aprendiz.nombres || '')
  const [apellidos, setApellidos] = useState(aprendiz.apellidos || '')
  const [sexo, setSexo] = useState(aprendiz.sexo || '')
  const [rh, setRh] = useState(aprendiz.rh || '')
  const [fechaNacimiento, setFechaNacimiento] = useState(aprendiz.fecha_nacimiento || '')
  const [pais, setPais] = useState(aprendiz.pais || 'Colombia')
  const [nivelId, setNivelId] = useState(aprendiz.nivel_educativo_id || '')

  const [niveles, setNiveles] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarNiveles() {
      const { data } = await supabase
        .from('niveles_educativos')
        .select('id, nombre')
        .order('id')
      if (data) setNiveles(data)
    }
    cargarNiveles()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setError('')

    if (!nombres.trim() || !apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('aprendices')
      .update({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        sexo: sexo || null,
        rh: rh || null,
        fecha_nacimiento: fechaNacimiento || null,
        pais: pais.trim() || null,
        nivel_educativo_id: nivelId ? Number(nivelId) : null,
      })
      .eq('id', aprendiz.id)

    setGuardando(false)

    if (error) {
      if (error.message.includes('no permite')) {
        setError('Tu rol no permite editar aprendices')
      } else {
        setError('No se pudieron guardar los cambios')
      }
      console.error(error.message)
      return
    }

    onGuardado()
  }

  return (
    <form className="edit-apr" onSubmit={guardar}>
      <p className="edit-apr__eyebrow">Datos personales</p>
      <h2 className="edit-apr__titulo">
        {aprendiz.apellidos} {aprendiz.nombres}
      </h2>
      <p className="edit-apr__doc">
        {aprendiz.tipo_documento} {aprendiz.numero_documento}
        <span className="edit-apr__doc-nota"> · el documento se corrige aparte</span>
      </p>

      <div className="edit-apr__fila">
        <div className="edit-apr__campo">
          <label className="edit-apr__label" htmlFor="ea_nombres">Nombres *</label>
          <input
            id="ea_nombres"
            type="text"
            className="edit-apr__input"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
        </div>

        <div className="edit-apr__campo">
          <label className="edit-apr__label" htmlFor="ea_apellidos">Apellidos *</label>
          <input
            id="ea_apellidos"
            type="text"
            className="edit-apr__input"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
        </div>
      </div>

      <div className="edit-apr__fila">
        <div className="edit-apr__campo edit-apr__campo_corto">
          <label className="edit-apr__label" htmlFor="ea_sexo">Sexo</label>
          <select
            id="ea_sexo"
            className="edit-apr__input"
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
          >
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>

        <div className="edit-apr__campo edit-apr__campo_corto">
          <label className="edit-apr__label" htmlFor="ea_rh">RH</label>
          <select
            id="ea_rh"
            className="edit-apr__input"
            value={rh}
            onChange={(e) => setRh(e.target.value)}
          >
            <option value="">—</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        <div className="edit-apr__campo">
          <label className="edit-apr__label" htmlFor="ea_nacimiento">Fecha de nacimiento</label>
          <input
            id="ea_nacimiento"
            type="date"
            className="edit-apr__input"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
          />
        </div>
      </div>

      <div className="edit-apr__fila">
        <div className="edit-apr__campo">
          <label className="edit-apr__label" htmlFor="ea_pais">País</label>
          <input
            id="ea_pais"
            type="text"
            className="edit-apr__input"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
          />
        </div>

        <div className="edit-apr__campo">
          <label className="edit-apr__label" htmlFor="ea_nivel">Nivel educativo</label>
          <select
            id="ea_nivel"
            className="edit-apr__input"
            value={nivelId}
            onChange={(e) => setNivelId(e.target.value)}
          >
            <option value="">—</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="edit-apr__nota">
        Estos datos aparecen en el archivo del Ministerio de Trabajo. Si el aprendiz
        tiene certificados emitidos, el cambio se reflejará al descargarlos de nuevo.
      </p>

      {error && <p className="edit-apr__error">{error}</p>}

      <div className="edit-apr__acciones">
        <button
          type="button"
          className="edit-apr__boton edit-apr__boton_sec"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button type="submit" className="edit-apr__boton" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default EditarAprendiz