import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './CertificarGrupo.css'

function CertificarGrupo({ grupo, matriculas, onCertificado, onCancelar }) {
  const [certificando, setCertificando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  const porCertificar = matriculas.filter((m) => m.estado === 'aprobado')
  const yaCertificados = matriculas.filter((m) => m.estado === 'certificado')
  const pendientes = matriculas.filter(
    (m) => !['aprobado', 'certificado', 'anulado'].includes(m.estado)
  )

  async function certificar() {
    setError('')
    setCertificando(true)

    const { data, error } = await supabase.rpc('certificar_grupo', {
      p_grupo_id: grupo.id,
    })

    setCertificando(false)

    if (error) {
      if (error.message.includes('no tiene entrenador')) {
        setError('El grupo no tiene entrenador asignado')
      } else {
        setError('No se pudieron emitir los certificados')
      }
      console.error(error.message)
      return
    }

    setResultado(data)
  }

  if (resultado) {
    return (
      <div className="cert-grupo">
        <div className="cert-grupo__encabezado">
          <p className="cert-grupo__eyebrow">Certificación completada</p>
          <h2 className="cert-grupo__titulo">
            {resultado.length} {resultado.length === 1 ? 'certificado emitido' : 'certificados emitidos'}
          </h2>
        </div>

        {resultado.length > 0 && (
          <div className="cert-grupo__codigos">
            {resultado.map((r) => {
              const m = matriculas.find((x) => x.id === r.matricula_id)
              return (
                <div key={r.matricula_id} className="cert-grupo__codigo-fila">
                  <span className="cert-grupo__codigo-nombre">
                    {m ? `${m.aprendices.apellidos} ${m.aprendices.nombres}` : `Matrícula ${r.matricula_id}`}
                  </span>
                  <code className="cert-grupo__codigo">{r.codigo}</code>
                </div>
              )
            })}
          </div>
        )}

        <div className="cert-grupo__acciones">
          <button className="cert-grupo__boton" onClick={onCertificado}>
            Listo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cert-grupo">
      <div className="cert-grupo__encabezado">
        <p className="cert-grupo__eyebrow">Certificar grupo</p>
        <h2 className="cert-grupo__titulo">
          {grupo.cursos.nombre}
          {grupo.identificador && ` (${grupo.identificador})`}
        </h2>
        <p className="cert-grupo__subtitulo">
          Entrenador: {grupo.entrenador?.nombre_completo || 'Sin asignar'}
        </p>
      </div>

      <div className="cert-grupo__resumen">
        <div className="cert-grupo__stat cert-grupo__stat_principal">
          <p className="cert-grupo__stat-numero">{porCertificar.length}</p>
          <p className="cert-grupo__stat-texto">
            {porCertificar.length === 1 ? 'se certificará' : 'se certificarán'}
          </p>
        </div>

        {pendientes.length > 0 && (
          <div className="cert-grupo__stat">
            <p className="cert-grupo__stat-numero">{pendientes.length}</p>
            <p className="cert-grupo__stat-texto">sin aprobar (esperan)</p>
          </div>
        )}

        {yaCertificados.length > 0 && (
          <div className="cert-grupo__stat">
            <p className="cert-grupo__stat-numero">{yaCertificados.length}</p>
            <p className="cert-grupo__stat-texto">ya certificados</p>
          </div>
        )}
      </div>

      {porCertificar.length > 0 && (
        <div className="cert-grupo__lista">
          <p className="cert-grupo__lista-titulo">Se emitirá certificado para:</p>
          <ul className="cert-grupo__nombres">
            {porCertificar.map((m) => (
              <li key={m.id} className="cert-grupo__nombre">
                {m.aprendices.apellidos} {m.aprendices.nombres}
                <span className="cert-grupo__nombre-doc">
                  {' · '}{m.aprendices.tipo_documento} {m.aprendices.numero_documento}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {porCertificar.length === 0 && (
        <p className="cert-grupo__vacio">
          No hay aprendices aprobados pendientes de certificar en este grupo.
        </p>
      )}

      <p className="cert-grupo__nota">
        Los certificados quedan firmados por el entrenador del grupo. Si después se
        editan datos de una matrícula certificada, su certificado pierde validez.
      </p>

      {error && <p className="cert-grupo__error">{error}</p>}

      <div className="cert-grupo__acciones">
        <button
          type="button"
          className="cert-grupo__boton cert-grupo__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="cert-grupo__boton"
          onClick={certificar}
          disabled={porCertificar.length === 0 || certificando}
        >
          {certificando
            ? 'Emitiendo…'
            : `Certificar ${porCertificar.length} ${porCertificar.length === 1 ? 'aprendiz' : 'aprendices'}`}
        </button>
      </div>
    </div>
  )
}

export default CertificarGrupo