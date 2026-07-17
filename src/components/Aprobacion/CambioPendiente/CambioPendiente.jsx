import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './CambioPendiente.css'

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

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return String(valor)
}

function CambioPendiente({ cambio, catalogos, onResuelto }) {
  const [procesando, setProcesando] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const m = cambio.matriculas
  const cert = m.certificados?.find((c) => c.estado === 'vigente')

  function nombreDeValor(campo, valor) {
    if (valor === null || valor === undefined || valor === '') return '—'

    const id = Number(valor)
    if (campo === 'empresa_id') return catalogos.empresas.find((e) => e.id === id)?.razon_social || valor
    if (campo === 'arl_id') return catalogos.arls.find((e) => e.id === id)?.nombre || valor
    if (campo === 'eps_id') return catalogos.eps.find((e) => e.id === id)?.nombre || valor
    if (campo === 'area_id') return catalogos.areas.find((e) => e.id === id)?.nombre || valor
    if (campo === 'cargo_id') return catalogos.cargos.find((e) => e.id === id)?.nombre || valor

    return formatearValor(valor)
  }

  async function aprobar() {
    setError('')
    setProcesando(true)

    const { error } = await supabase.rpc('aprobar_cambio', { p_cambio_id: cambio.id })

    setProcesando(false)

    if (error) {
      setError('No se pudo aprobar el cambio')
      console.error(error.message)
      return
    }

    onResuelto(cambio.id)
  }

  async function rechazar() {
    setError('')
    setProcesando(true)

    const { error } = await supabase.rpc('rechazar_cambio', {
      p_cambio_id: cambio.id,
      p_motivo: motivo.trim() || null,
    })

    setProcesando(false)

    if (error) {
      setError('No se pudo rechazar el cambio')
      console.error(error.message)
      return
    }

    onResuelto(cambio.id)
  }

  const campos = Object.keys(cambio.cambios).filter((campo) => {
    const nuevo = cambio.cambios[campo]
    const actual = m[campo]
    const norm = (v) => (v === null || v === undefined || v === '' ? null : String(v))
    return norm(nuevo) !== norm(actual)
  })

  return (
    <article className="cambio">
      <div className="cambio__encabezado">
        <div>
          <p className="cambio__nombre">
            {m.aprendices.apellidos} {m.aprendices.nombres}
          </p>
          <p className="cambio__meta">
            {m.aprendices.tipo_documento} {m.aprendices.numero_documento}
            {' · '}
            {m.grupos.cursos.nombre}
            {cert && (
              <>
                {' · '}
                <code className="cambio__codigo">{cert.codigo}</code>
              </>
            )}
          </p>
        </div>
        <p className="cambio__solicitante">
          Solicitado por{' '}
          <strong>{cambio.solicitante?.nombre_completo || 'desconocido'}</strong>
          <br />
          {new Date(cambio.solicitado_en).toLocaleString('es-CO')}
        </p>
      </div>
        
        {campos.length === 0 && (
        <p className="cambio__sin-cambios">
          Los valores solicitados ya coinciden con los actuales. Puedes rechazar esta solicitud.
        </p>
      )}
      
      <div className="cambio__tabla">
        {campos.map((campo) => (
          <div key={campo} className="cambio__fila">
            <span className="cambio__campo">{ETIQUETAS_CAMPO[campo] || campo}</span>
            <span className="cambio__antes">{nombreDeValor(campo, m[campo])}</span>
            <span className="cambio__flecha">→</span>
            <span className="cambio__despues">{nombreDeValor(campo, cambio.cambios[campo])}</span>
          </div>
        ))}
      </div>

      {error && <p className="cambio__error">{error}</p>}

      {rechazando ? (
        <div className="cambio__rechazo">
          <input
            type="text"
            className="cambio__motivo"
            placeholder="Motivo del rechazo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            className="cambio__boton cambio__boton_ver"
            onClick={() => setRechazando(false)}
          >
            Cancelar
          </button>
          <button
            className="cambio__boton cambio__boton_rechazar"
            onClick={rechazar}
            disabled={procesando}
          >
            Confirmar rechazo
          </button>
        </div>
      ) : (
        <div className="cambio__acciones">
          <button
            className="cambio__boton cambio__boton_rechazar"
            onClick={() => setRechazando(true)}
            disabled={procesando}
          >
            Rechazar
          </button>
          <button
            className="cambio__boton cambio__boton_aprobar"
            onClick={aprobar}
            disabled={procesando}
          >
            {procesando ? '…' : 'Autorizar cambio'}
          </button>
        </div>
      )}
    </article>
  )
}

export default CambioPendiente