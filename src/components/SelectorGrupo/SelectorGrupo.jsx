import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './SelectorGrupo.css'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

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

function formatearRango(inicio, fin) {
  const [, mesI, diaI] = inicio.split('-').map(Number)
  const [, mesF, diaF] = fin.split('-').map(Number)
  if (inicio === fin) return `${diaI} ${MESES[mesI - 1]}`
  if (mesI === mesF) return `${diaI}–${diaF} ${MESES[mesF - 1]}`
  return `${diaI} ${MESES[mesI - 1]} – ${diaF} ${MESES[mesF - 1]}`
}

function etiquetaGrupo(grupo) {
  const rango = formatearRango(grupo.fecha_inicio, grupo.fecha_fin)
  const entrenador = grupo.entrenador?.nombre_completo || 'Sin entrenador'
  const id = grupo.identificador ? ` (${grupo.identificador})` : ''
  return `${grupo.cursos.nombre}${id} · ${rango} · ${entrenador}`
}

const CAMPOS_GRUPO = `
  id,
  fecha_inicio,
  fecha_fin,
  identificador,
  cursos ( id, nombre, duracion_dias ),
  entrenador:entrenador_id ( nombre_completo )
`

function SelectorGrupo({ valor, onCambio }) {
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [entrenadores, setEntrenadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)

  const [cursoId, setCursoId] = useState('')
  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [entrenadorId, setEntrenadorId] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      const [resGrupos, resCursos, resEntrenadores] = await Promise.all([
        supabase
          .from('grupos')
          .select(CAMPOS_GRUPO)
          .gte('fecha_fin', hoyISO())
          .order('fecha_inicio', { ascending: true }),
        supabase
          .from('cursos')
          .select('id, nombre, duracion_dias')
          .eq('activo', true)
          .order('nombre'),
        supabase
        .from('entrenadores')
        .select('id, nombre_completo')
        .eq('activo', true)
        .order('nombre_completo'),
      ])

      if (resGrupos.error) console.error(resGrupos.error.message)
      else setGrupos(resGrupos.data)

      if (resCursos.error) console.error(resCursos.error.message)
      else setCursos(resCursos.data)

      if (resEntrenadores.error) console.error(resEntrenadores.error.message)
      else setEntrenadores(resEntrenadores.data)

      setCargando(false)
    }

    cargarDatos()
  }, [])

  const cursoElegido = cursos.find((c) => String(c.id) === String(cursoId))
  const fechaFinCalculada = cursoElegido
    ? calcularFechaFin(fechaInicio, cursoElegido.duracion_dias)
    : ''

  function handleCambioSelect(e) {
    const valorSel = e.target.value
    if (valorSel === '__nuevo__') {
      setCreando(true)
      return
    }
    onCambio(valorSel ? Number(valorSel) : null)
  }

  function cancelarCreacion() {
    setCreando(false)
    setError('')
    setCursoId('')
    setEntrenadorId('')
    setIdentificador('')
    setFechaInicio(hoyISO())
  }

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

    setGrupos((anteriores) => [...anteriores, data])
    onCambio(data.id)
    cancelarCreacion()
  }

  if (cargando) {
    return <p className="selector-grupo__mensaje">Cargando grupos...</p>
  }

  if (creando) {
    return (
      <div className="selector-grupo__nuevo">
        <p className="selector-grupo__nuevo-titulo">Nuevo grupo</p>

        <div className="selector-grupo__fila">
          <div className="selector-grupo__campo">
            <label className="selector-grupo__label" htmlFor="grupo_curso">Curso *</label>
            <select
              id="grupo_curso"
              className="selector-grupo__select"
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

          <div className="selector-grupo__campo">
            <label className="selector-grupo__label" htmlFor="grupo_inicio">Fecha de inicio *</label>
            <input
              id="grupo_inicio"
              type="date"
              className="selector-grupo__input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
        </div>

        <div className="selector-grupo__fila">
          <div className="selector-grupo__campo">
            <label className="selector-grupo__label" htmlFor="grupo_entrenador">Entrenador</label>
            <select
              id="grupo_entrenador"
              className="selector-grupo__select"
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

          <div className="selector-grupo__campo">
            <label className="selector-grupo__label" htmlFor="grupo_identificador">
              Identificador
            </label>
            <input
              id="grupo_identificador"
              type="text"
              className="selector-grupo__input"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="A, Mañana…"
            />
          </div>
        </div>

        {fechaFinCalculada && (
          <p className="selector-grupo__calculo">
            Termina el {formatearRango(fechaFinCalculada, fechaFinCalculada)}
          </p>
        )}

        {error && <p className="selector-grupo__error">{error}</p>}

        <div className="selector-grupo__acciones">
          <button
            type="button"
            className="selector-grupo__boton selector-grupo__boton_secundario"
            onClick={cancelarCreacion}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="selector-grupo__boton"
            onClick={crearGrupo}
            disabled={guardando}
          >
            {guardando ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <select
      className="selector-grupo__select"
      value={valor || ''}
      onChange={handleCambioSelect}
    >
      <option value="">Selecciona un grupo…</option>
      {grupos.map((grupo) => (
        <option key={grupo.id} value={grupo.id}>
          {etiquetaGrupo(grupo)}
        </option>
      ))}
      <option value="__nuevo__">+ Nuevo grupo</option>
    </select>
  )
}

export default SelectorGrupo