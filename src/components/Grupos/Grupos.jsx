import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './Grupos.css'
import { useOutletContext, useNavigate } from 'react-router-dom'
import Modal from '../Modal/Modal'
import FormularioGrupo from '../FormularioGrupo/FormularioGrupo'
import { PUEDE_CREAR_MATRICULAS } from '../../constants/permisos'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function hoyISO() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatearRango(inicio, fin) {
  const [, mesI, diaI] = inicio.split('-').map(Number)
  const [, mesF, diaF] = fin.split('-').map(Number)
  if (inicio === fin) return `${diaI} ${MESES[mesI - 1]}`
  if (mesI === mesF) return `${diaI}–${diaF} ${MESES[mesF - 1]}`
  return `${diaI} ${MESES[mesI - 1]} – ${diaF} ${MESES[mesF - 1]}`
}

function Grupos() {
    const { perfil } = useOutletContext()
    const navegar = useNavigate()
    const [creandoGrupo, setCreandoGrupo] = useState(false)
    const [grupos, setGrupos] = useState([])
    const [cursos, setCursos] = useState([])
    const [entrenadores, setEntrenadores] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    const [filtroEstado, setFiltroEstado] = useState('activos')
    const [filtroCurso, setFiltroCurso] = useState('')
    const [filtroEntrenador, setFiltroEntrenador] = useState('')
    const [filtroDesde, setFiltroDesde] = useState('')
    const [filtroHasta, setFiltroHasta] = useState('')
    const [fechasExactas, setFechasExactas] = useState(false)
    const puedeCrearGrupos = PUEDE_CREAR_MATRICULAS.includes(perfil.rol)

  useEffect(() => {
    async function cargarCatalogos() {
      const [resCursos, resEntrenadores] = await Promise.all([
        supabase.from('cursos').select('id, nombre').order('nombre'),
        supabase.from('entrenadores').select('id, nombre_completo').eq('activo', true).order('nombre_completo'),
      ])

      if (resCursos.data) setCursos(resCursos.data)
      if (resEntrenadores.data) setEntrenadores(resEntrenadores.data)
    }

    cargarCatalogos()
  }, [])

  async function obtenerGrupos() {
      setCargando(true)
      setError('')

      let consulta = supabase
        .from('grupos')
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          identificador,
          cursos ( nombre ),
          entrenador:entrenador_id ( nombre_completo ),
          matriculas ( count )
        `)

      if (filtroEstado === 'activos') {
        consulta = consulta.gte('fecha_fin', hoyISO())
      } else if (filtroEstado === 'cerrados') {
        consulta = consulta.lt('fecha_fin', hoyISO())
      }

      if (filtroCurso) {
        consulta = consulta.eq('curso_id', Number(filtroCurso))
      }

      if (filtroEntrenador) {
        consulta = consulta.eq('entrenador_id', filtroEntrenador)
      }

      if (filtroDesde) {
        consulta = fechasExactas
          ? consulta.eq('fecha_inicio', filtroDesde)
          : consulta.gte('fecha_inicio', filtroDesde)
      }

      if (filtroHasta) {
        consulta = fechasExactas
          ? consulta.eq('fecha_fin', filtroHasta)
          : consulta.lte('fecha_fin', filtroHasta)
      }

      const ordenAscendente = filtroEstado === 'activos'
      consulta = consulta.order('fecha_inicio', { ascending: ordenAscendente })

      const { data, error } = await consulta

      if (error) {
        setError('No se pudieron cargar los grupos')
        console.error(error.message)
      } else {
        setGrupos(data)
      }

      setCargando(false)
    }

  useEffect(() => {
    obtenerGrupos()
  }, [filtroEstado, filtroCurso, filtroEntrenador, filtroDesde, filtroHasta, fechasExactas])

  const hayFiltrosAvanzados = filtroCurso || filtroEntrenador || filtroDesde || filtroHasta
  

  function limpiarFiltros() {
    setFiltroCurso('')
    setFiltroEntrenador('')
    setFiltroDesde('')
    setFiltroHasta('')
    setFechasExactas(false)
  }

  return (
    <section className="grupos">
      <header className="grupos__header">
        <div>
          <p className="grupos__eyebrow">Formación</p>
          <h1 className="grupos__titulo">Grupos</h1>
        </div>

        <div className="grupos__filtros">
          <button
            className={`grupos__filtro ${filtroEstado === 'activos' ? 'grupos__filtro_activo' : ''}`}
            onClick={() => setFiltroEstado('activos')}
          >
            Activos
          </button>
          <button
            className={`grupos__filtro ${filtroEstado === 'cerrados' ? 'grupos__filtro_activo' : ''}`}
            onClick={() => setFiltroEstado('cerrados')}
          >
            Cerrados
          </button>
          <button
            className={`grupos__filtro ${filtroEstado === 'todos' ? 'grupos__filtro_activo' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos
          </button>
        </div>
            {puedeCrearGrupos && (
          <button
            className="grupos__boton-nuevo"
            onClick={() => setCreandoGrupo(true)}
          >
            Nuevo grupo
          </button>
        )}
      </header>

        {creandoGrupo && (
        <Modal onCerrar={() => setCreandoGrupo(false)}>
          <FormularioGrupo
            onCreado={() => {
              setCreandoGrupo(false)
              obtenerGrupos()
            }}
            onCancelar={() => setCreandoGrupo(false)}
          />
        </Modal>
      )}

      <div className="grupos__busqueda">
        <div className="grupos__busqueda-campo">
          <label className="grupos__busqueda-label" htmlFor="filtro_curso">Curso</label>
          <select
            id="filtro_curso"
            className="grupos__busqueda-select"
            value={filtroCurso}
            onChange={(e) => setFiltroCurso(e.target.value)}
          >
            <option value="">Todos</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>{curso.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grupos__busqueda-campo">
          <label className="grupos__busqueda-label" htmlFor="filtro_entrenador">Entrenador</label>
          <select
            id="filtro_entrenador"
            className="grupos__busqueda-select"
            value={filtroEntrenador}
            onChange={(e) => setFiltroEntrenador(e.target.value)}
          >
            <option value="">Todos</option>
            {entrenadores.map((entrenador) => (
              <option key={entrenador.id} value={entrenador.id}>{entrenador.nombre_completo}</option>
            ))}
          </select>
        </div>

        <div className="grupos__busqueda-campo">
          <label className="grupos__busqueda-label" htmlFor="filtro_desde">Inicia</label>
          <input
            id="filtro_desde"
            type="date"
            className="grupos__busqueda-input"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
          />
        </div>

        <div className="grupos__busqueda-campo">
          <label className="grupos__busqueda-label" htmlFor="filtro_hasta">Termina</label>
          <input
            id="filtro_hasta"
            type="date"
            className="grupos__busqueda-input"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
          />
        </div>

        <label className="grupos__busqueda-check">
          <input
            type="checkbox"
            checked={fechasExactas}
            onChange={(e) => setFechasExactas(e.target.checked)}
          />
          Fechas exactas
        </label>

        {hayFiltrosAvanzados && (
          <button className="grupos__busqueda-limpiar" onClick={limpiarFiltros}>
            Limpiar
          </button>
        )}
      </div>

      {cargando && <p className="grupos__mensaje">Cargando grupos...</p>}

      {error && <p className="grupos__mensaje">{error}</p>}

      {!cargando && !error && grupos.length === 0 && (
        <p className="grupos__mensaje">
          {hayFiltrosAvanzados
            ? 'Ningún grupo coincide con los filtros.'
            : filtroEstado === 'activos'
              ? 'No hay grupos activos en este momento.'
              : filtroEstado === 'cerrados'
                ? 'No hay grupos cerrados todavía.'
                : 'No hay grupos registrados.'}
        </p>
      )}

      {!cargando && !error && grupos.length > 0 && (
        <div className="grupos__lista">
          {grupos.map((grupo) => (
            <article
              key={grupo.id}
              className="grupos__tarjeta"
              onClick={() => navegar(`/grupos/${grupo.id}`)}
            >
              <div className="grupos__tarjeta-info">
                <p className="grupos__tarjeta-curso">
                  {grupo.cursos.nombre}
                  {grupo.identificador && (
                    <span className="grupos__tarjeta-id"> ({grupo.identificador})</span>
                  )}
                </p>
                <p className="grupos__tarjeta-detalle">
                  {formatearRango(grupo.fecha_inicio, grupo.fecha_fin)}
                  {' · '}
                  {grupo.entrenador?.nombre_completo || 'Sin entrenador'}
                </p>
              </div>
              <div className="grupos__tarjeta-lado">
                <span className="grupos__tarjeta-conteo">
                  {grupo.matriculas[0]?.count ?? 0}
                  {(grupo.matriculas[0]?.count ?? 0) === 1 ? ' aprendiz' : ' aprendices'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Grupos