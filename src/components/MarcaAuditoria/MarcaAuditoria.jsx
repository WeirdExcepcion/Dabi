import { useState, useRef } from 'react'
import { useAuditoria } from '../../context/AuditoriaContext'
import './MarcaAuditoria.css'

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
  edicion_certificada_aprobada: 'cambio autorizado',
}

function fechaHora(iso) {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function MarcaAuditoria({ matriculaId }) {
  const { modoActivo, auditadas, detalles, traducir } = useAuditoria()
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const botonRef = useRef(null)

  if (!modoActivo) return null

  const info = auditadas[matriculaId]
  if (!info) return null

  const eventos = detalles[matriculaId] || []

  function abrir(e) {
    e.stopPropagation()
    const rect = botonRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
    setAbierto(true)
  }

  return (
    <span className="marca-audit">
      <button
        ref={botonRef}
        className="marca-audit__punto"
        onClick={abrir}
        aria-label="Ver cambios"
      />

      {!abierto && (
        <span className="marca-audit__tooltip">
          Editado por {info.autor} · {fechaHora(info.ultima)}
          {info.total > 1 && ` · ${info.total} cambios`}
        </span>
      )}

      {abierto && (
        <>
          <span className="marca-audit__cerrar-fondo" onClick={() => setAbierto(false)} />
          <div
            className="marca-audit__popover"
            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="marca-audit__pop-header">
              <span className="marca-audit__pop-titulo">Historial de cambios</span>
              <button className="marca-audit__pop-cerrar" onClick={() => setAbierto(false)}>
                ×
              </button>
            </div>

            <div className="marca-audit__pop-lista">
              {eventos.map((evento, i) => {
                const campos = Object.keys(evento.cambios || {})
                const huboAprobador =
                  evento.aprobador &&
                  evento.aprobador.nombre_completo !== evento.autor?.nombre_completo

                return (
                  <div key={i} className="marca-audit__evento">
                    <p className="marca-audit__evento-cabecera">
                      <strong>{evento.autor?.nombre_completo || 'Alguien'}</strong>
                      {' '}{ACCIONES[evento.accion] || evento.accion}
                    </p>
                    <p className="marca-audit__evento-fecha">{fechaHora(evento.realizado_en)}</p>

                    {huboAprobador && (
                      <p className="marca-audit__evento-aprobador">
                        Autorizado por {evento.aprobador.nombre_completo}
                      </p>
                    )}

                    <div className="marca-audit__cambios">
                      {campos.map((campo) => (
                        <div key={campo} className="marca-audit__cambio">
                          <span className="marca-audit__campo">
                            {ETIQUETAS_CAMPO[campo] || campo}
                          </span>
                          <span className="marca-audit__antes">
                            {traducir(campo, evento.cambios[campo].antes)}
                          </span>
                          <span className="marca-audit__flecha">→</span>
                          <span className="marca-audit__despues">
                            {traducir(campo, evento.cambios[campo].despues)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </span>
  )
}

export default MarcaAuditoria