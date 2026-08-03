import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import './RegistrarCargue.css'

function hoyISO() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function RegistrarCargue({ grupo, onRegistrado, onCancelar }) {
  const [idCurso, setIdCurso] = useState(grupo.mintrabajo_id_curso || '')
  const [fechaCargue, setFechaCargue] = useState(
    grupo.mintrabajo_fecha_cargue || hoyISO()
  )
  const [observaciones, setObservaciones] = useState(grupo.observaciones || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const esReemplazo =
    grupo.mintrabajo_id_curso && idCurso.trim() !== grupo.mintrabajo_id_curso

  async function guardar() {
    setError('')

    if (!idCurso.trim()) {
      setError('El ID del curso es obligatorio')
      return
    }

    setGuardando(true)

    await supabase
      .from('grupos')
      .update({ observaciones: observaciones.trim() || null })
      .eq('id', grupo.id)

    const { error } = await supabase.rpc('registrar_cargue_mintrabajo', {
      p_grupo_id: grupo.id,
      p_id_curso: idCurso.trim(),
      p_fecha_cargue: fechaCargue || null,
    })

    setGuardando(false)

    if (error) {
      if (error.code === '23505') {
        setError('Ese ID de curso ya está registrado en otro grupo')
      } else if (error.message.includes('no permite')) {
        setError('Tu rol no permite registrar cargues')
      } else {
        setError('No se pudo registrar el cargue')
      }
      console.error(error.message)
      return
    }

    onRegistrado()
  }

  return (
    <div className="cargue">
      <p className="cargue__eyebrow">Ministerio de Trabajo</p>
      <h2 className="cargue__titulo">
        {grupo.curso}
        {grupo.identificador && ` (${grupo.identificador})`}
      </h2>
      <p className="cargue__detalle">
        {formatearFecha(grupo.fecha_inicio)} – {formatearFecha(grupo.fecha_fin)}
        {' · '}
        {grupo.total_aprendices} {grupo.total_aprendices === 1 ? 'aprendiz' : 'aprendices'}
      </p>

      <div className="cargue__limite">
        <span className="cargue__limite-etiqueta">Fecha límite</span>
        <span className="cargue__limite-valor">
          {formatearFecha(grupo.mintrabajo_fecha_limite)}
        </span>
      </div>

      <label className="cargue__label" htmlFor="id_curso">
        ID del curso *
      </label>
      <input
        id="id_curso"
        type="text"
        className="cargue__input"
        value={idCurso}
        onChange={(e) => setIdCurso(e.target.value)}
        placeholder="947550"
        autoFocus
      />
      <p className="cargue__ayuda">
        Es el número que devuelve la plataforma del ministerio al cargar el grupo.
      </p>

      <label className="cargue__label" htmlFor="fecha_cargue">
        Fecha de cargue
      </label>
      <input
        id="fecha_cargue"
        type="date"
        className="cargue__input"
        value={fechaCargue}
        onChange={(e) => setFechaCargue(e.target.value)}
      />

      <label className="cargue__label" htmlFor="observaciones">
        Observaciones
      </label>
      <textarea
        id="observaciones"
        className="cargue__textarea"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        rows="3"
        placeholder="Notas sobre este cargue…"
      />
      
      {esReemplazo && (
        <div className="cargue__aviso">
          <p className="cargue__aviso-titulo">Estás reemplazando un cargue</p>
          <p className="cargue__aviso-texto">
            El ID anterior <strong>{grupo.mintrabajo_id_curso}</strong> quedará
            registrado como anulado, junto con su fecha.
          </p>
        </div>
      )}

      {grupo.mintrabajo_id_anulado && (
        <p className="cargue__anulado">
          Cargue anulado previo: <strong>{grupo.mintrabajo_id_anulado}</strong>
          {grupo.mintrabajo_fecha_anulado &&
            ` (${formatearFecha(grupo.mintrabajo_fecha_anulado)})`}
        </p>
      )}

      <div className="cargue__nota">
        Al registrar el ID, este grupo queda <strong>cerrado</strong>: ya no se podrán
        matricular más aprendices en él.
      </div>

      {error && <p className="cargue__error">{error}</p>}

      <div className="cargue__acciones">
        <button
          type="button"
          className="cargue__boton cargue__boton_sec"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="cargue__boton"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Registrar cargue'}
        </button>
      </div>
    </div>
  )
}

export default RegistrarCargue