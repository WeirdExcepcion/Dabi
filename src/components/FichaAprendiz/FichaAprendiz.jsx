import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_CORREGIR_DOCUMENTO } from '../../constants/permisos'
import Modal from '../Modal/Modal'
import CorregirDocumento from './CorregirDocumento/CorregirDocumento'
import './FichaAprendiz.css'
import { ESTADOS_MATRICULA as ESTADOS } from '../../constants/estados'
import MarcaAuditoria from '../MarcaAuditoria/MarcaAuditoria'

function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="ficha__dato">
      <p className="ficha__etiqueta">{etiqueta}</p>
      <p className="ficha__valor">{valor || '—'}</p>
    </div>
  )
}

const CAMPOS_APRENDIZ = `
  id,
  tipo_documento,
  numero_documento,
  nombres,
  apellidos,
  sexo,
  pais,
  fecha_nacimiento,
  rh,
  created_at,
  niveles_educativos ( nombre )
`

const CAMPOS_HISTORIAL = `
  id,
  estado,
  fecha_ingreso,
  fecha_examen,
  examen_vence,
  empresas ( razon_social ),
  grupos (
    id,
    fecha_inicio,
    fecha_fin,
    identificador,
    cursos ( nombre ),
    entrenador:entrenador_id ( nombre_completo )
  ),
  certificados ( codigo, estado, emitido_en )
`

function FichaAprendiz() {
  const { aprendizId } = useParams()
  const navegar = useNavigate()
  const { perfil } = useOutletContext()

  const [aprendiz, setAprendiz] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [corrigiendo, setCorrigiendo] = useState(false)

  
    async function cargarDatos() {
      setCargando(true)
      setError('')

      const [resAprendiz, resHistorial] = await Promise.all([
        supabase.from('aprendices').select(CAMPOS_APRENDIZ).eq('id', aprendizId).maybeSingle(),
        supabase
          .from('matriculas')
          .select(CAMPOS_HISTORIAL)
          .eq('aprendiz_id', aprendizId)
          .order('id', { ascending: false }),
      ])

      if (resAprendiz.error || !resAprendiz.data) {
        setError('No se encontró el aprendiz')
        setCargando(false)
        return
      }

      setAprendiz(resAprendiz.data)

      if (resHistorial.error) {
        console.error(resHistorial.error.message)
      } else {
        setHistorial(resHistorial.data)
      }

      setCargando(false)
    }
    useEffect(() => {
        cargarDatos()
    }, [aprendizId])

  if (cargando) {
    return <p className="ficha__mensaje">Cargando ficha...</p>
  }

  if (error) {
    return (
      <section>
        <p className="ficha__mensaje">{error}</p>
        <button className="ficha__volver" onClick={() => navegar('/aprendices')}>
          Volver a aprendices
        </button>
      </section>
    )
  }

  const certificados = historial.filter((m) => m.estado === 'certificado').length
  const puedeCorregir = PUEDE_CORREGIR_DOCUMENTO.includes(perfil.rol)

  return (
    <section className="ficha">
      <button className="ficha__volver" onClick={() => navegar('/aprendices')}>
        ← Aprendices
      </button>

      {corrigiendo && (
        <Modal onCerrar={() => setCorrigiendo(false)}>
          <CorregirDocumento
            aprendiz={aprendiz}
            totalMatriculas={historial.length}
            onCorregido={() => {
              setCorrigiendo(false)
              cargarDatos()
            }}
            onCancelar={() => setCorrigiendo(false)}
          />
        </Modal>
      )}

      <header className="ficha__header">
        <div>
          <p className="ficha__eyebrow">Ficha del aprendiz</p>
          <h1 className="ficha__titulo">
            {aprendiz.apellidos} {aprendiz.nombres}
          </h1>
          <p className="ficha__doc">
            {aprendiz.tipo_documento} {aprendiz.numero_documento}
            {puedeCorregir && (
              <button className="ficha__corregir" onClick={() => setCorrigiendo(true)}>
                Corregir
              </button>
            )}
          </p>
        </div>

        <div className="ficha__stats">
          <div className="ficha__stat">
            <p className="ficha__stat-numero">{historial.length}</p>
            <p className="ficha__stat-etiqueta">
              {historial.length === 1 ? 'Curso' : 'Cursos'}
            </p>
          </div>
          <div className="ficha__stat">
            <p className="ficha__stat-numero">{certificados}</p>
            <p className="ficha__stat-etiqueta">
              {certificados === 1 ? 'Certificado' : 'Certificados'}
            </p>
          </div>
        </div>
      </header>

      <div className="ficha__panel">
        <p className="ficha__panel-titulo">Datos personales</p>
        <div className="ficha__grilla">
          <Dato etiqueta="Sexo" valor={aprendiz.sexo} />
          <Dato etiqueta="RH" valor={aprendiz.rh} />
          <Dato etiqueta="Fecha de nacimiento" valor={formatearFecha(aprendiz.fecha_nacimiento)} />
          <Dato etiqueta="País" valor={aprendiz.pais} />
          <Dato etiqueta="Nivel educativo" valor={aprendiz.niveles_educativos?.nombre} />
        </div>
      </div>

      <div className="ficha__historial">
        <p className="ficha__panel-titulo">Historial de formación</p>

        {historial.length === 0 ? (
          <p className="ficha__mensaje">Este aprendiz no tiene cursos registrados.</p>
        ) : (
          <div className="ficha__tabla-wrap">
            <table className="ficha__tabla">
              <thead>
                <tr>
                  <th className="ficha__th">Curso</th>
                  <th className="ficha__th">Fechas</th>
                  <th className="ficha__th">Entrenador</th>
                  <th className="ficha__th">Empresa</th>
                  <th className="ficha__th">Estado</th>
                  <th className="ficha__th">Certificado</th>
                  <th className="ficha__th"></th>
                </tr>
              </thead>
              <tbody>
                {historial.map((matricula) => (
                  <tr key={matricula.id}>
                    <td className="ficha__td ficha__td_principal">
                      {matricula.grupos.cursos.nombre}
                      {matricula.grupos.identificador && (
                        <span className="ficha__td-id"> ({matricula.grupos.identificador})</span>
                      )}
                      <MarcaAuditoria matriculaId={matricula.id} />
                    </td>
                    <td className="ficha__td ficha__td_fechas">
                      {formatearFecha(matricula.grupos.fecha_inicio)} –{' '}
                      {formatearFecha(matricula.grupos.fecha_fin)}
                    </td>
                    <td className="ficha__td">
                      {matricula.grupos.entrenador?.nombre_completo || '—'}
                    </td>
                    <td className="ficha__td">{matricula.empresas.razon_social}</td>
                    <td className="ficha__td">
                      <span className={`ficha__estado ficha__estado_${matricula.estado}`}>
                        {ESTADOS[matricula.estado]}
                      </span>
                    </td>
                    
                    <td className="ficha__td ficha__td_cert">
                      {(() => {
                        const cert = matricula.certificados?.find((c) => c.estado === 'vigente')
                        const revocado = matricula.certificados?.find((c) => c.estado === 'revocado')

                        if (cert) {
                          return <code className="ficha__codigo">{cert.codigo}</code>
                        }
                        if (revocado) {
                          return <span className="ficha__codigo-revocado">Revocado</span>
                        }
                        return <span className="ficha__sin-cert">—</span>
                      })()}
                    </td>
                    <td className="ficha__td ficha__td_accion">

                      <Link to={`/grupos/${matricula.grupos.id}`} className="ficha__enlace">
                        Ver grupo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default FichaAprendiz