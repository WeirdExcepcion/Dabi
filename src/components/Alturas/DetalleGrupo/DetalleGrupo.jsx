import './DetalleGrupo.css'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_CREAR_MATRICULAS, PUEDE_EDITAR_MATRICULAS, PUEDE_APROBAR, PUEDE_ELIMINAR_MATRICULAS, PUEDE_ELIMINAR_GRUPOS } from '../../../constants/permisos'
import Modal from '../../compartidos/Modal/Modal'
import FormularioMatricula from '../RegistroDiario/FormularioMatricula/FormularioMatricula'
import DetalleMatricula from '../RegistroDiario/DetalleMatricula/DetalleMatricula'
import EditarMatricula from '../RegistroDiario/EditarMatricula/EditarMatricula'
import SelectorEstado from '../SelectorEstado/SelectorEstado'
import CertificarGrupo from './CertificarGrupo/CertificarGrupo'
import MarcaAuditoria from '../MarcaAuditoria/MarcaAuditoria'
import AsignarPersonal from './AsignarPersonal/AsignarPersonal'
import AvisoFaltantes from '../AvisoFaltantes/AvisoFaltantes'
import { useFaltantes } from '../../../context/FaltantesContext'
import BotonCertificado from '../BotonCertificado/BotonCertificado'
import EliminarMatricula from '../EliminarMatricula/EliminarMatricula'


function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

const CAMPOS_GRUPO = `
  id,
  fecha_inicio,
  fecha_fin,
  identificador,
  entrenador_id,
  supervisor_id,
  coordinador_id,
  cursos ( nombre, duracion_dias ),
  entrenador:entrenadores!grupos_entrenador_id_fkey ( nombre_completo ),
          supervisor:entrenadores!grupos_supervisor_id_fkey ( nombre_completo ),
          coordinador:entrenadores!grupos_coordinador_id_fkey ( nombre_completo )
`

const CAMPOS_MATRICULA = `
  id,
  estado,
  fecha_ingreso,
  fecha_arl,
  fecha_examen,
  examen_vence,
  grupo_id,
  aprendiz_id,
  empresa_id,
  arl_id,
  eps_id,
  area_id,
  cargo_id,
  sector_id,
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
  sectores ( nombre ),
  grupos (
    fecha_inicio,
    fecha_fin,
    identificador,
    cursos ( nombre, requiere_certificado_previo ),
    entrenador:entrenador_id ( nombre_completo )
  ),
  certificados ( codigo, estado, emitido_en )
`

function DetalleGrupo() {
  const { grupoId } = useParams()
  const navegar = useNavigate()
  const { perfil } = useOutletContext()

  const [grupo, setGrupo] = useState(null)
  const [matriculas, setMatriculas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [agregando, setAgregando] = useState(false)
  const [matriculaViendo, setMatriculaViendo] = useState(null)
  const [matriculaEditando, setMatriculaEditando] = useState(null)
  const [certificando, setCertificando] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [matriculaEliminando, setMatriculaEliminando] = useState(null)
  const [eliminandoGrupo, setEliminandoGrupo] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const puedeAgregar = PUEDE_CREAR_MATRICULAS.includes(perfil.rol)
  const puedeEditar = PUEDE_EDITAR_MATRICULAS.includes(perfil.rol)
  const puedeCertificar = PUEDE_APROBAR.includes(perfil.rol)
  const puedeEliminar = PUEDE_ELIMINAR_MATRICULAS.includes(perfil.rol)
  const { cargarFaltantes } = useFaltantes()
  const puedeEliminarGrupo = PUEDE_ELIMINAR_GRUPOS.includes(perfil.rol) && matriculas.length === 0
  const hayAprobados = matriculas.some((m) => m.estado === 'aprobado')
  const listoParaCertificar = grupo?.entrenador_id && grupo?.supervisor_id

  function actualizarEstadoLocal(matriculaId, nuevoEstado) {
    setMatriculas((anteriores) =>
      anteriores.map((m) => (m.id === matriculaId ? { ...m, estado: nuevoEstado } : m))
    )
  }

  async function eliminarGrupo() {
    setErrorEliminar('')
    setEliminandoGrupo(true)

    const { error } = await supabase.rpc('eliminar_grupo', { p_grupo_id: Number(grupoId) })

    setEliminandoGrupo(false)

    if (error) {
      if (error.message.includes('matriculado')) {
        setErrorEliminar('El grupo tiene aprendices. Elimínalos primero.')
      } else if (error.message.includes('no permite')) {
        setErrorEliminar('Tu rol no permite eliminar grupos')
      } else {
        setErrorEliminar('No se pudo eliminar el grupo')
      }
      console.error(error.message)
      return
    }

    navegar('/alturas/grupos')
  }

  async function cargarDatos() {
    setCargando(true)
    setError('')

    const [resGrupo, resMatriculas] = await Promise.all([
      supabase.from('grupos').select(CAMPOS_GRUPO).eq('id', grupoId).maybeSingle(),
      supabase.from('matriculas').select(CAMPOS_MATRICULA).eq('grupo_id', grupoId).order('id'),
    ])

    if (resGrupo.error || !resGrupo.data) {
      setError('No se encontró el grupo')
      setCargando(false)
      return
    }

    setGrupo(resGrupo.data)

    if (resMatriculas.error) {
      console.error(resMatriculas.error.message)
    } else {
      setMatriculas(resMatriculas.data)
      cargarFaltantes(resMatriculas.data.map((m) => m.id))
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [grupoId])

  if (cargando) {
    return <p className="det-grupo__mensaje">Cargando grupo...</p>
  }

  if (error) {
    return (
      <section>
        <p className="det-grupo__mensaje">{error}</p>
        <button className="det-grupo__volver" onClick={() => navegar('/alturas/grupos')}>
          Volver a grupos
        </button>
      </section>
    )
  }

  return (
    <section className="det-grupo">
      <button className="det-grupo__volver" onClick={() => navegar('/alturas/grupos')}>
        ← Grupos
      </button>

      <header className="det-grupo__header">
        <div>
          <p className="det-grupo__eyebrow">Grupo</p>
          <h1 className="det-grupo__titulo">
            {grupo.cursos.nombre}
            {grupo.identificador && (
              <span className="det-grupo__id"> ({grupo.identificador})</span>
            )}
          </h1>
          <p className="det-grupo__detalle">
            {formatearFecha(grupo.fecha_inicio)} – {formatearFecha(grupo.fecha_fin)}
          </p>
          <p className="det-grupo__personal">
            <span className="det-grupo__personal-item">
              <span className="det-grupo__personal-rol">Entrenador:</span>{' '}
              {grupo.entrenador?.nombre_completo || <em>sin asignar</em>}
            </span>
            <span className="det-grupo__personal-item">
              <span className="det-grupo__personal-rol">Supervisor:</span>{' '}
              {grupo.supervisor?.nombre_completo || <em>sin asignar</em>}
            </span>
            <span className="det-grupo__personal-item">
              <span className="det-grupo__personal-rol">Coordinador:</span>{' '}
              {grupo.coordinador?.nombre_completo || <em>sin asignar</em>}
            </span>
            {puedeCertificar && (
              <button className="det-grupo__asignar" onClick={() => setAsignando(true)}>
                {grupo.entrenador_id && grupo.supervisor_id ? 'Cambiar' : 'Asignar'}
              </button>
            )}
          </p>
        </div>

        <div className="det-grupo__header-acciones">
          {puedeCertificar && hayAprobados && listoParaCertificar && (
            <button
              className="det-grupo__boton-certificar"
              onClick={() => setCertificando(true)}
            >
              Certificar grupo
            </button>
          )}
          {puedeAgregar && (
            <button className="det-grupo__boton-agregar" onClick={() => setAgregando(true)}>
              Agregar aprendiz
            </button>
          )}
          {puedeEliminarGrupo && (
            <button
              className="det-grupo__boton-eliminar-grupo"
              onClick={() => {
                if (window.confirm('¿Eliminar este grupo? Está vacío, así que no se pierde información de aprendices.')) {
                  eliminarGrupo()
                }
              }}
              disabled={eliminandoGrupo}
            >
              {eliminandoGrupo ? 'Eliminando…' : 'Eliminar grupo'}
            </button>
          )}
        </div>
      </header>

      {(!grupo.entrenador_id || !grupo.supervisor_id) && (
        <p className="det-grupo__aviso">
          {!grupo.entrenador_id && !grupo.supervisor_id
            ? 'Este grupo no tiene entrenador ni supervisor. '
            : !grupo.entrenador_id
            ? 'Este grupo no tiene entrenador. '
            : 'Este grupo no tiene supervisor. '}
          No se podrán emitir certificados hasta asignarlos.
        </p>
      )}
      {errorEliminar && <p className="det-grupo__error">{errorEliminar}</p>}
      
      {matriculaEliminando && (
        <Modal onCerrar={() => setMatriculaEliminando(null)}>
          <EliminarMatricula
            matricula={matriculaEliminando}
            onEliminada={() => {
              setMatriculaEliminando(null)
              cargarDatos()
            }}
            onCancelar={() => setMatriculaEliminando(null)}
          />
        </Modal>
      )}

      {asignando && (
        <Modal onCerrar={() => setAsignando(false)}>
          <AsignarPersonal
            grupo={grupo}
            onAsignado={() => {
              setAsignando(false)
              cargarDatos()
            }}
            onCancelar={() => setAsignando(false)}
          />
        </Modal>
      )}

      {certificando && (
        <Modal onCerrar={() => setCertificando(false)}>
          <CertificarGrupo
            grupo={grupo}
            matriculas={matriculas}
            onCertificado={() => {
              setCertificando(false)
              cargarDatos()
            }}
            onCancelar={() => setCertificando(false)}
          />
        </Modal>
      )}

      {agregando && (
        <Modal onCerrar={() => setAgregando(false)}>
          <FormularioMatricula
            grupoFijo={grupo}
            onGuardada={() => {
              setAgregando(false)
              cargarDatos()
            }}
            onCancelar={() => setAgregando(false)}
          />
        </Modal>
      )}

      {matriculaViendo && (
        <Modal onCerrar={() => setMatriculaViendo(null)}>
          <DetalleMatricula
            matricula={matriculaViendo}
            onCerrar={() => setMatriculaViendo(null)}
          />
        </Modal>
      )}

      {matriculaEditando && (
        <Modal onCerrar={() => setMatriculaEditando(null)}>
          <EditarMatricula
            matricula={matriculaEditando}
            rol={perfil.rol}
            onGuardada={() => {
              setMatriculaEditando(null)
              cargarDatos()
            }}
            onCancelar={() => setMatriculaEditando(null)}
          />
        </Modal>
      )}

      <div className="det-grupo__resumen">
        <span className="det-grupo__conteo">
          {matriculas.length} {matriculas.length === 1 ? 'aprendiz' : 'aprendices'}
        </span>
      </div>

      {matriculas.length === 0 ? (
        <p className="det-grupo__mensaje">Este grupo aún no tiene aprendices.</p>
      ) : (
        <div className="det-grupo__tabla-wrap">
          <table className="det-grupo__tabla">
            <thead>
              <tr>
                <th className="det-grupo__th">#</th>
                <th className="det-grupo__th">Documento</th>
                <th className="det-grupo__th">Aprendiz</th>
                <th className="det-grupo__th">Empresa</th>
                <th className="det-grupo__th">Registrado</th>
                <th className="det-grupo__th">Estado</th>
                <th className="det-grupo__th"></th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map((matricula, indice) => (
                <tr key={matricula.id}>
                  <td className="det-grupo__td det-grupo__td_indice">{indice + 1}</td>
                  <td className="det-grupo__td det-grupo__td_doc">
                    {matricula.aprendices.tipo_documento} {matricula.aprendices.numero_documento}
                  </td>
                  <td className="det-grupo__td det-grupo__td_principal">
                    {matricula.aprendices.apellidos} {matricula.aprendices.nombres}
                    <MarcaAuditoria matriculaId={matricula.id} />
                    <AvisoFaltantes matriculaId={matricula.id} />
                  </td>
                  <td className="det-grupo__td">{matricula.empresas.razon_social}</td>
                  <td className="det-grupo__td">{formatearFecha(matricula.fecha_ingreso)}</td>
                  <td className="det-grupo__td">
                    <SelectorEstado
                      matricula={matricula}
                      rol={perfil.rol}
                      onCambiado={(nuevo) => actualizarEstadoLocal(matricula.id, nuevo)}
                    />
                  </td>
                  <td className="det-grupo__td det-grupo__td_acciones">
                    <button
                      className="det-grupo__boton-accion"
                      onClick={() => setMatriculaViendo(matricula)}
                    >
                      Ver
                    </button>
                    {puedeEditar && (
                      <button
                        className="det-grupo__boton-accion"
                        onClick={() => setMatriculaEditando(matricula)}
                      >
                        Editar
                      </button>
                    )}
                    <BotonCertificado matricula={matricula} rol={perfil.rol} compacto />
                    {puedeEliminar && (
                      <button
                        className="det-grupo__boton-eliminar"
                        onClick={() => setMatriculaEliminando(matricula)}
                        title="Eliminar matrícula"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default DetalleGrupo