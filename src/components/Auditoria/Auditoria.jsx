import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuditoria } from '../../context/AuditoriaContext'
import './Auditoria.css'

const ETIQUETAS_CAMPO = {
  empresa_id: 'Empresa',
  arl_id: 'ARL',
  eps_id: 'EPS',
  area_id: 'Área',
  cargo_id: 'Cargo',
  fecha_arl: 'Fecha ARL',
  fecha_examen: 'Examen médico',
  grupo_id: 'Grupo',
  estado: 'Estado',
}

const ACCIONES = {
  edicion_certificada: 'editó directamente',
  edicion_certificada_aprobada: 'solicitó un cambio',
}

const ESTADOS = {
  en_proceso: 'En proceso',
  faltan_documentos: 'Faltan documentos',
  esperando_fecha: 'Esperando fecha',
  completo: 'Completo',
  aprobado: 'Aprobado',
  certificado: 'Certificado',
  anulado: 'Anulado',
}

function agruparPorDia(eventos) {
  const grupos = {}

  eventos.forEach((evento) => {
    const clave = new Date(evento.realizado_en).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!grupos[clave]) grupos[clave] = []
    grupos[clave].push(evento)
  })

  return Object.entries(grupos)
}

function Auditoria({ onCerrar }) {
  const [eventos, setEventos] = useState([])
  const [nombres, setNombres] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { modoActivo, activar, desactivar } = useAuditoria()

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')

      const { data: registros, error: errorAudit } = await supabase
        .from('auditoria')
        .select(`
          id,
          accion,
          cambios,
          registro_id,
          realizado_en,
          autor:realizado_por ( nombre_completo ),
          aprobador:aprobado_por ( nombre_completo )
        `)
        .eq('tabla', 'matriculas')
        .order('realizado_en', { ascending: false })
        .limit(100)

      if (errorAudit) {
        setError('No se pudo cargar el registro')
        console.error(errorAudit.message)
        setCargando(false)
        return
      }

      const ids = [...new Set(registros.map((r) => r.registro_id))]

      const [resMatriculas, resEmpresas, resArls, resEps, resAreas, resCargos, resGrupos] =
        await Promise.all([
          ids.length
            ? supabase
                .from('matriculas')
                .select('id, aprendices ( nombres, apellidos, tipo_documento, numero_documento )')
                .in('id', ids)
            : Promise.resolve({ data: [] }),
          supabase.from('empresas').select('id, razon_social'),
          supabase.from('arls').select('id, nombre'),
          supabase.from('eps').select('id, nombre'),
          supabase.from('areas').select('id, nombre'),
          supabase.from('cargos').select('id, nombre'),
          supabase.from('grupos').select('id, fecha_inicio, cursos ( nombre )'),
        ])

      const mapaAprendices = {}
      ;(resMatriculas.data || []).forEach((m) => {
        mapaAprendices[m.id] = m.aprendices
      })

      const mapa = (lista, campo) => {
        const o = {}
        ;(lista || []).forEach((x) => {
          o[x.id] = x[campo]
        })
        return o
      }

      const mapaGrupos = {}
      ;(resGrupos.data || []).forEach((g) => {
        mapaGrupos[g.id] = `${g.cursos?.nombre || 'Curso'} (${g.fecha_inicio})`
      })

      setNombres({
        empresa_id: mapa(resEmpresas.data, 'razon_social'),
        arl_id: mapa(resArls.data, 'nombre'),
        eps_id: mapa(resEps.data, 'nombre'),
        area_id: mapa(resAreas.data, 'nombre'),
        cargo_id: mapa(resCargos.data, 'nombre'),
        grupo_id: mapaGrupos,
      })

      setEventos(
        registros.map((r) => ({ ...r, aprendiz: mapaAprendices[r.registro_id] || null }))
      )
      setCargando(false)
    }

    cargar()
  }, [])

  function traducir(campo, valor) {
    if (valor === null || valor === undefined || valor === '') return '—'
    if (campo === 'estado') return ESTADOS[valor] || valor
    if (nombres[campo]) return nombres[campo][Number(valor)] || `#${valor}`
    return String(valor)
  }

  const filtrados = eventos.filter((evento) => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return true

    const a = evento.aprendiz
    const nombreAprendiz = a
      ? `${a.nombres} ${a.apellidos} ${a.numero_documento}`.toLowerCase()
      : ''
    const autor = evento.autor?.nombre_completo?.toLowerCase() || ''

    return nombreAprendiz.includes(termino) || autor.includes(termino)
  })

  const porDia = agruparPorDia(filtrados)

  return (
    <div className="audit">
      <header className="audit__header">
        <div className="audit__header-fila">
          <div>
            <p className="audit__eyebrow">Registro de seguridad</p>
            <h2 className="audit__titulo">Auditoría</h2>
          </div>
          <button className="audit__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>

        <input
          type="text"
          className="audit__buscador"
          placeholder="Filtrar por aprendiz o por quien editó…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button
          className={modoActivo ? 'audit__modo audit__modo_activo' : 'audit__modo'}
          onClick={() => {
            if (modoActivo) {
              desactivar()
            } else {
              activar()
              onCerrar()
            }
          }}
        >
          <span className="audit__modo-punto" />
          {modoActivo ? 'Resaltado activo — clic para apagar' : 'Resaltar ediciones en la app'}
        </button>
      </header>

      <div className="audit__scroll">
        {cargando && <p className="audit__mensaje">Cargando registro…</p>}

        {error && <p className="audit__mensaje">{error}</p>}

        {!cargando && !error && filtrados.length === 0 && (
          <p className="audit__mensaje">
            {busqueda.trim()
              ? 'Ningún registro coincide con la búsqueda.'
              : 'Todavía no hay ediciones registradas.'}
          </p>
        )}

        {porDia.map(([dia, eventosDia]) => (
          <section key={dia} className="audit__dia">
            <p className="audit__dia-titulo">{dia}</p>

            {eventosDia.map((evento) => {
              const a = evento.aprendiz
              const hora = new Date(evento.realizado_en).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const campos = Object.keys(evento.cambios || {})
              const huboAprobador =
                evento.aprobador &&
                evento.aprobador.nombre_completo !== evento.autor?.nombre_completo

              return (
                <article key={evento.id} className="audit__evento">
                  <div className="audit__linea">
                    <span className="audit__punto" />
                  </div>

                  <div className="audit__contenido">
                    <p className="audit__hora">{hora}</p>

                    <p className="audit__accion">
                      <strong>{evento.autor?.nombre_completo || 'Alguien'}</strong>
                      {' '}
                      {ACCIONES[evento.accion] || evento.accion}
                    </p>

                    {a && (
                      <p className="audit__aprendiz">
                        {a.apellidos} {a.nombres}
                        <span className="audit__aprendiz-doc">
                          {' · '}{a.tipo_documento} {a.numero_documento}
                        </span>
                      </p>
                    )}

                    {huboAprobador && (
                      <p className="audit__aprobador">
                        Autorizado por {evento.aprobador.nombre_completo}
                      </p>
                    )}

                    <div className="audit__cambios">
                      {campos.map((campo) => (
                        <div key={campo} className="audit__cambio">
                          <span className="audit__campo">
                            {ETIQUETAS_CAMPO[campo] || campo}
                          </span>
                          <span className="audit__antes">
                            {traducir(campo, evento.cambios[campo].antes)}
                          </span>
                          <span className="audit__flecha">→</span>
                          <span className="audit__despues">
                            {traducir(campo, evento.cambios[campo].despues)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}

export default Auditoria