import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './FormularioGrupo.css'

function hoyISO() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function calcularFechaFin(fechaInicio, duracionDias) {
  if (!fechaInicio || !duracionDias) return ''
  const [anio, mes, dia] = fechaInicio.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + duracionDias - 1)
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const CAMPOS_GRUPO = `
  id,
  fecha_inicio,
  fecha_fin,
  identificador,
  cursos ( id, nombre, duracion_dias ),
  entrenador:entrenador_id ( nombre_completo )
`

function FormularioGrupo({ onCreado, onCancelar }) {
  const [cursos, setCursos] = useState([])
  const [entrenadores, setEntrenadores] = useState([])

  const [cursoId, setCursoId] = useState('')
  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [entrenadorId, setEntrenadorId] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const [resCursos, resEntrenadores] = await Promise.all([
        supabase.from('cursos').select('id, nombre, duracion_dias').eq('activo', true).order('nombre'),
        supabase.from('profiles').select('id, nombre_completo').eq('rol', 'entrenador').order('nombre_completo'),
      ])

      if (resCursos.data) setCursos(resCursos.data)
      if (resEntrenadores.data) setEntrenadores(resEntrenadores.data)
    }

    cargar()
  }, [])

  const cursoElegido = cursos.find((c) => String(c.id) === String(cursoId))
  const fechaFinCalculada = cursoElegido
    ? calcularFechaFin(fechaInicio, cursoElegido.duracion_dias)
    : ''

  async function crearGrupo() {
    setError('')

    if (!cursoId) {
      setError('Selecciona un curso')
      return
    }

    setGuardando(true)

    const { data, error } = await supabase
      .from('grupos')
      .insert({
        curso_id: Number(cursoId),
        entrenador_id: entrenadorId || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinCalculada,
        identificador: identificador.trim() || null,
      })
      .select(CAMPOS_GRUPO)
      .single()

    setGuardando(false)

    if (error) {
      if (error.code === '23P01') {
        setError('Ese entrenador ya dicta otro grupo en fechas que se cruzan')
      } else {
        setError('No se pudo crear el grupo')
      }
      console.error(error.message)
      return
    }

    onCreado(data)
  }

  const esFechaPasada = fechaInicio < hoyISO()

  return (
    <div className="form-grupo">
      <p className="form-grupo__titulo">Nuevo grupo</p>

      <div className="form-grupo__fila">
        <div className="form-grupo__campo">
          <label className="form-grupo__label" htmlFor="fg_curso">Curso *</label>
          <select
            id="fg_curso"
            className="form-grupo__select"
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre} ({curso.duracion_dias} {curso.duracion_dias === 1 ? 'día' : 'días'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-grupo__campo">
          <label className="form-grupo__label" htmlFor="fg_inicio">Fecha de inicio *</label>
          <input
            id="fg_inicio"
            type="date"
            className="form-grupo__input"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
      </div>

      <div className="form-grupo__fila">
        <div className="form-grupo__campo">
          <label className="form-grupo__label" htmlFor="fg_entrenador">Entrenador</label>
          <select
            id="fg_entrenador"
            className="form-grupo__select"
            value={entrenadorId}
            onChange={(e) => setEntrenadorId(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {entrenadores.map((entrenador) => (
              <option key={entrenador.id} value={entrenador.id}>
                {entrenador.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grupo__campo">
          <label className="form-grupo__label" htmlFor="fg_identificador">Identificador</label>
          <input
            id="fg_identificador"
            type="text"
            className="form-grupo__input"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="A, Mañana…"
          />
        </div>
      </div>

      {fechaFinCalculada && (
        <p className="form-grupo__calculo">
          Termina el {fechaFinCalculada.split('-').reverse().join('/')}
        </p>
      )}

      {esFechaPasada && (
        <p className="form-grupo__aviso">
          Estás creando un grupo con fecha pasada (registro histórico).
        </p>
      )}

      {error && <p className="form-grupo__error">{error}</p>}

      <div className="form-grupo__acciones">
        <button
          type="button"
          className="form-grupo__boton form-grupo__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="form-grupo__boton"
          onClick={crearGrupo}
          disabled={guardando}
        >
          {guardando ? 'Creando…' : 'Crear grupo'}
        </button>
      </div>
    </div>
  )
}

export default FormularioGrupo