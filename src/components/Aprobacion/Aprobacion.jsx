import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_APROBAR } from '../../constants/permisos'
import Modal from '../Modal/Modal'
import DetalleMatricula from '../RegistroDiario/DetalleMatricula/DetalleMatricula'
import CambioPendiente from './CambioPendiente/CambioPendiente'
import { useCatalogos } from '../../hooks/useCatalogos'
import './Aprobacion.css'

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

const CAMPOS = `
  id,
  estado,
  fecha_ingreso,
  fecha_arl,
  fecha_examen,
  examen_vence,
  grupo_id,
  empresa_id,
  arl_id,
  eps_id,
  area_id,
  cargo_id,
  aprendices (
    tipo_documento, numero_documento, nombres, apellidos,
    sexo, pais, fecha_nacimiento, rh,
    niveles_educativos ( nombre )
  ),
  empresas ( razon_social ),
  arls ( nombre ),
  eps ( nombre ),
  areas ( nombre ),
  cargos ( nombre ),
  grupos (
    id,
    fecha_inicio,
    fecha_fin,
    identificador,
    cursos ( nombre ),
    entrenador:entrenador_id ( nombre_completo )
  )
`

function Aprobacion() {
  const { perfil } = useOutletContext()
  const [matriculas, setMatriculas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)
  const [viendo, setViendo] = useState(null)
  const [cambios, setCambios] = useState([])
  const { catalogos } = useCatalogos()

  const puedeAprobar = PUEDE_APROBAR.includes(perfil.rol)

  async function cargar() {
    setCargando(true)
    setError('')

    const [resMatriculas, resCambios] = await Promise.all([
      supabase
        .from('matriculas')
        .select(CAMPOS)
        .eq('estado', 'completo')
        .order('id', { ascending: true }),
      supabase
        .from('cambios_pendientes')
        .select(`
          id,
          cambios,
          solicitado_en,
          solicitante:solicitado_por ( nombre_completo ),
          matriculas (
            id,
            empresa_id, arl_id, eps_id, area_id, cargo_id,
            fecha_arl, fecha_examen, grupo_id, estado,
            aprendices ( tipo_documento, numero_documento, nombres, apellidos ),
            grupos ( cursos ( nombre ) ),
            certificados ( codigo, estado )
          )
        `)
        .eq('estado', 'pendiente')
        .order('id', { ascending: true }),
    ])

    if (resMatriculas.error) {
      setError('No se pudieron cargar las matrículas pendientes')
      console.error(resMatriculas.error.message)
    } else {
      setMatriculas(resMatriculas.data)
    }

    if (resCambios.error) {
      console.error(resCambios.error.message)
    } else {
      setCambios(resCambios.data)
    }

    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function cambiarEstado(matriculaId, nuevoEstado) {
    setProcesando(matriculaId)

    const { error } = await supabase
      .from('matriculas')
      .update({ estado: nuevoEstado })
      .eq('id', matriculaId)

    setProcesando(null)

    if (error) {
      setError('No se pudo actualizar')
      console.error(error.message)
      return
    }

    setMatriculas((anteriores) => anteriores.filter((m) => m.id !== matriculaId))
  }

  function alertas(matricula) {
    const lista = []

    if (!matricula.arls) lista.push('Sin ARL')
    if (!matricula.fecha_examen) lista.push('Sin examen médico')
    if (matricula.examen_vence && matricula.examen_vence < hoyISO()) {
      lista.push('Examen vencido')
    }
    if (!matricula.grupos.entrenador) lista.push('Grupo sin entrenador')

    return lista
  }

  if (!puedeAprobar) {
    return (
      <section>
        <p className="aprob__mensaje">Tu rol no tiene acceso a esta sección.</p>
      </section>
    )
  }

  return (
    <section className="aprob">
      <header className="aprob__header">
        <div>
          <p className="aprob__eyebrow">Coordinación</p>
          <h1 className="aprob__titulo">Aprobación</h1>
          <p className="aprob__subtitulo">
            Matrículas con la digitación completa, pendientes de revisión
          </p>
        </div>
        
      </header>

      {viendo && (
        <Modal onCerrar={() => setViendo(null)}>
          <DetalleMatricula matricula={viendo} onCerrar={() => setViendo(null)} />
        </Modal>
      )}

      {!cargando && cambios.length > 0 && (
        <div className="aprob__bloque">
          <div className="aprob__bloque-encabezado aprob__bloque-encabezado_alerta">
            <h2 className="aprob__bloque-titulo">Cambios en certificados emitidos</h2>
            <span className="aprob__bloque-conteo">
              {cambios.length} {cambios.length === 1 ? 'solicitud' : 'solicitudes'}
            </span>
          </div>
          <p className="aprob__bloque-nota">
            Estas matrículas ya tienen certificado emitido. Autorizar el cambio lo
            aplicará de inmediato y quedará registrado con tu nombre.
          </p>

          <div className="aprob__lista">
            {cambios.map((cambio) => (
              <CambioPendiente
                key={cambio.id}
                cambio={cambio}
                catalogos={catalogos}
                onResuelto={(id) => setCambios((ant) => ant.filter((c) => c.id !== id))}
              />
            ))}
          </div>
        </div>
      )}

      {cargando && <p className="aprob__mensaje">Cargando...</p>}

      {error && <p className="aprob__mensaje">{error}</p>}

      {!cargando && !error && matriculas.length === 0 && (
        <p className="aprob__mensaje">No hay matrículas pendientes de aprobación.</p>
      )}

      {!cargando && !error && matriculas.length > 0 && (
        <div className="aprob__bloque">
          <div className="aprob__bloque-encabezado">
            <h2 className="aprob__bloque-titulo">Matrículas pendientes de aprobar</h2>
            <span className="aprob__bloque-conteo">
              {matriculas.length} {matriculas.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="aprob__lista">
          {matriculas.map((matricula) => {
            const avisos = alertas(matricula)
            const ocupado = procesando === matricula.id

            return (
              <article key={matricula.id} className="aprob__tarjeta">
                <div className="aprob__tarjeta-principal">
                  <p className="aprob__nombre">
                    {matricula.aprendices.apellidos} {matricula.aprendices.nombres}
                  </p>
                  <p className="aprob__doc">
                    {matricula.aprendices.tipo_documento} {matricula.aprendices.numero_documento}
                    {' · '}
                    {matricula.empresas.razon_social}
                  </p>
                  <p className="aprob__grupo">
                    {matricula.grupos.cursos.nombre}
                    {matricula.grupos.identificador && ` (${matricula.grupos.identificador})`}
                    {' · '}
                    {formatearFecha(matricula.grupos.fecha_inicio)} – {formatearFecha(matricula.grupos.fecha_fin)}
                    {' · '}
                    {matricula.grupos.entrenador?.nombre_completo || 'Sin entrenador'}
                  </p>

                  {avisos.length > 0 && (
                    <div className="aprob__avisos">
                      {avisos.map((aviso) => (
                        <span key={aviso} className="aprob__aviso">{aviso}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="aprob__acciones">
                  <button
                    className="aprob__boton aprob__boton_ver"
                    onClick={() => setViendo(matricula)}
                  >
                    Ver todo
                  </button>
                  <button
                    className="aprob__boton aprob__boton_devolver"
                    onClick={() => cambiarEstado(matricula.id, 'faltan_documentos')}
                    disabled={ocupado}
                  >
                    Devolver
                  </button>
                  <button
                    className="aprob__boton aprob__boton_aprobar"
                    onClick={() => cambiarEstado(matricula.id, 'aprobado')}
                    disabled={ocupado}
                  >
                    {ocupado ? '…' : 'Aprobar'}
                  </button>
                </div>
              </article>
            )
          })}
          </div>
        </div>
      )}
    </section>
  )
}

export default Aprobacion