import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './EliminarMatricula.css'

function EliminarMatricula({ matricula, onEliminada, onCancelar }) {
  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [eliminandoAprendiz, setEliminandoAprendiz] = useState(false)

  const a = matricula.aprendices
  const nombreCompleto = `${a.apellidos} ${a.nombres}`
  const tieneCertificado = matricula.certificados?.length > 0
  const confirmacionValida = confirmacion.trim().toUpperCase() === 'ELIMINAR'

  async function eliminar() {
    setError('')
    setEliminando(true)

    const { data, error } = await supabase.rpc('eliminar_matricula', {
      p_matricula_id: matricula.id,
    })

    setEliminando(false)

    if (error) {
      if (error.message.includes('certificado emitido')) {
        setError('Esta matrícula tiene un certificado emitido. Anúlala en lugar de eliminarla.')
      } else if (error.message.includes('no permite')) {
        setError('Tu rol no permite eliminar matrículas')
      } else {
        setError('No se pudo eliminar la matrícula')
      }
      console.error(error.message)
      return
    }

    setResultado(data)
  }

  async function eliminarAprendiz() {
    setError('')
    setEliminandoAprendiz(true)

    const { error } = await supabase.rpc('eliminar_aprendiz_huerfano', {
      p_aprendiz_id: resultado.aprendiz_id,
    })

    setEliminandoAprendiz(false)

    if (error) {
      setError('No se pudo eliminar el aprendiz')
      console.error(error.message)
      return
    }

    onEliminada()
  }

  if (resultado) {
    return (
      <div className="elim">
        <p className="elim__eyebrow">Listo</p>
        <h2 className="elim__titulo">Matrícula eliminada</h2>

        {resultado.aprendiz_sin_matriculas ? (
          <>
            <p className="elim__texto">
              <strong>{nombreCompleto}</strong> se quedó sin ninguna matrícula registrada.
              Si lo creaste por error, puedes eliminarlo también. Si vas a matricularlo
              en otro curso, déjalo.
            </p>

            {error && <p className="elim__error">{error}</p>}

            <div className="elim__acciones">
              <button className="elim__boton elim__boton_sec" onClick={onEliminada}>
                Dejarlo
              </button>
              <button
                className="elim__boton elim__boton_peligro"
                onClick={eliminarAprendiz}
                disabled={eliminandoAprendiz}
              >
                {eliminandoAprendiz ? 'Eliminando…' : 'Eliminar aprendiz también'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="elim__texto">
              El aprendiz sigue registrado con sus otras matrículas.
            </p>
            <div className="elim__acciones">
              <button className="elim__boton" onClick={onEliminada}>
                Entendido
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="elim">
      <p className="elim__eyebrow">Eliminar matrícula</p>
      <h2 className="elim__titulo">{nombreCompleto}</h2>
      <p className="elim__doc">
        {a.tipo_documento} {a.numero_documento}
      </p>

      {tieneCertificado ? (
        <div className="elim__bloqueado">
          <p className="elim__bloqueado-titulo">No se puede eliminar</p>
          <p className="elim__bloqueado-texto">
            Esta matrícula tiene un certificado emitido. Si el curso se canceló o hubo
            un error, cambia su estado a <strong>Anulado</strong> en lugar de eliminarla.
            El certificado quedará registrado pero marcado como no vigente.
          </p>
          <div className="elim__acciones">
            <button className="elim__boton" onClick={onCancelar}>
              Entendido
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="elim__alerta">
            <p className="elim__alerta-titulo">Esta acción no se puede deshacer</p>
            <p className="elim__alerta-texto">
              Se eliminará esta matrícula y los documentos que subiste para este curso
              (ARL, EPS, examen médico).
            </p>
            <p className="elim__alerta-texto">
              La cédula y el certificado previo del aprendiz <strong>no</strong> se borran,
              porque le pertenecen a él y sirven para sus otros cursos.
            </p>
          </div>

          <p className="elim__nota">
            Si el aprendiz canceló o no asistió, es mejor cambiar el estado a{' '}
            <strong>Anulado</strong>: así queda el registro de que existió.
            Elimina solo si esta matrícula nunca debió crearse.
          </p>

          <label className="elim__label" htmlFor="elim_conf">
            Escribe <strong>ELIMINAR</strong> para confirmar
          </label>
          <input
            id="elim_conf"
            type="text"
            className="elim__input"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off"
          />

          {error && <p className="elim__error">{error}</p>}

          <div className="elim__acciones">
            <button className="elim__boton elim__boton_sec" onClick={onCancelar}>
              Cancelar
            </button>
            <button
              className="elim__boton elim__boton_peligro"
              onClick={eliminar}
              disabled={!confirmacionValida || eliminando}
            >
              {eliminando ? 'Eliminando…' : 'Eliminar matrícula'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default EliminarMatricula