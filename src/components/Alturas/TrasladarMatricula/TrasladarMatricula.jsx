import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './TrasladarMatricula.css'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatearRango(inicio, fin) {
  const [, mesI, diaI] = inicio.split('-').map(Number)
  const [, mesF, diaF] = fin.split('-').map(Number)
  if (inicio === fin) return `${diaI} ${MESES[mesI - 1]}`
  if (mesI === mesF) return `${diaI}–${diaF} ${MESES[mesF - 1]}`
  return `${diaI} ${MESES[mesI - 1]} – ${diaF} ${MESES[mesF - 1]}`
}

function TrasladarMatricula({ matricula, onTrasladada, onCancelar }) {
  const [grupos, setGrupos] = useState([])
  const [destinoId, setDestinoId] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const a = matricula.aprendices
  const certificado = matricula.certificados?.find((c) => c.estado === 'vigente')
  const necesitaConfirmar = Boolean(certificado)
  const confirmacionValida = confirmacion.trim().toUpperCase() === 'TRASLADAR'

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('grupos')
        .select(`
          id, fecha_inicio, fecha_fin, identificador,
          cursos ( nombre ),
          entrenador:entrenador_id ( nombre_completo )
        `)
        .is('mintrabajo_id_curso', null)
        .neq('id', matricula.grupo_id)
        .order('fecha_inicio', { ascending: false })

      if (error) {
        setError('No se pudieron cargar los grupos')
        console.error(error.message)
      } else {
        setGrupos(data || [])
      }

      setCargando(false)
    }

    cargar()
  }, [matricula.grupo_id])

  async function trasladar() {
    setError('')

    if (!destinoId) {
      setError('Selecciona el grupo de destino')
      return
    }

    setGuardando(true)

    const { data, error } = await supabase.rpc('trasladar_matricula', {
      p_matricula_id: matricula.id,
      p_grupo_destino: Number(destinoId),
    })

    setGuardando(false)

    if (error) {
      if (error.message.includes('fechas que se cruzan')) {
        setError('Este aprendiz ya está en otro grupo con fechas que se cruzan')
      } else if (error.message.includes('reportado al ministerio')) {
        setError(error.message.replace(/^.*?:\s*/, ''))
      } else if (error.message.includes('no permite')) {
        setError('Tu rol no permite trasladar matrículas')
      } else if (error.code === '23505') {
        setError('Este aprendiz ya está matriculado en ese grupo')
      } else {
        setError('No se pudo trasladar la matrícula')
      }
      console.error(error.message)
      return
    }

    onTrasladada(data)
  }

  const grupoDestino = grupos.find((g) => String(g.id) === String(destinoId))

  return (
    <div className="traslado">
      <p className="traslado__eyebrow">Trasladar de grupo</p>
      <h2 className="traslado__titulo">
        {a.apellidos} {a.nombres}
      </h2>
      <p className="traslado__doc">
        {a.tipo_documento} {a.numero_documento}
      </p>

      <div className="traslado__actual">
        <p className="traslado__etiqueta">Grupo actual</p>
        <p className="traslado__valor">
          {matricula.grupos.cursos.nombre}
          {matricula.grupos.identificador && ` (${matricula.grupos.identificador})`}
          {' · '}
          {formatearRango(matricula.grupos.fecha_inicio, matricula.grupos.fecha_fin)}
        </p>
      </div>

      {certificado && (
        <div className="traslado__alerta">
          <p className="traslado__alerta-titulo">Esta matrícula tiene certificado emitido</p>
          <p className="traslado__alerta-texto">
            Código <code>{certificado.codigo}</code>. Al trasladarla, el certificado
            pasará a mostrar las fechas y el entrenador del grupo nuevo. El código no
            cambia, pero el documento que ya hayas entregado quedará desactualizado y
            habrá que volver a descargarlo.
          </p>
        </div>
      )}

      <label className="traslado__label" htmlFor="grupo_destino">Grupo de destino</label>

      {cargando ? (
        <p className="traslado__mensaje">Cargando grupos…</p>
      ) : grupos.length === 0 ? (
        <p className="traslado__mensaje">
          No hay otros grupos disponibles. Solo se puede trasladar a grupos que aún no
          se han reportado al ministerio.
        </p>
      ) : (
        <select
          id="grupo_destino"
          className="traslado__select"
          value={destinoId}
          onChange={(e) => {
            setDestinoId(e.target.value)
            setConfirmacion('')
          }}
        >
          <option value="">Selecciona…</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.cursos.nombre}
              {g.identificador ? ` (${g.identificador})` : ''}
              {' · '}
              {formatearRango(g.fecha_inicio, g.fecha_fin)}
              {' · '}
              {g.entrenador?.nombre_completo || 'Sin entrenador'}
            </option>
          ))}
        </select>
      )}

      {grupoDestino && necesitaConfirmar && (
        <>
          <label className="traslado__label" htmlFor="traslado_conf">
            Escribe <strong>TRASLADAR</strong> para confirmar
          </label>
          <input
            id="traslado_conf"
            type="text"
            className="traslado__input"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off"
          />
        </>
      )}

      {error && <p className="traslado__error">{error}</p>}

      <div className="traslado__acciones">
        <button
          type="button"
          className="traslado__boton traslado__boton_sec"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="traslado__boton"
          onClick={trasladar}
          disabled={
            !destinoId || guardando || (necesitaConfirmar && !confirmacionValida)
          }
        >
          {guardando ? 'Trasladando…' : 'Trasladar'}
        </button>
      </div>
    </div>
  )
}

export default TrasladarMatricula