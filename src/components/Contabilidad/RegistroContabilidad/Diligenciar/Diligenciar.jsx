import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { hoyISO, formatearFechaCorta } from '../../../../lib/fechas'
import { formatearPesos } from '../../../../lib/dinero'
import './Diligenciar.css'

// Mensajes que diligenciar_matricula lanza pensados para leerse tal cual. El
// resto de errores de Postgres no se le muestran al contable.
const ERRORES_PROPIOS = [
  'sesión', 'no permite', 'obligatorio', 'positivo',
  'no existe', 'anulada', 'empresa',
]

function Diligenciar({ fila, onGuardada, onCancelar }) {
  const [numero, setNumero] = useState(fila.numero_factura || '')
  const [valor, setValor] = useState(() => {
    const inicial = fila.valor_sin_iva ?? fila.valor_sugerido
    return inicial === null || inicial === undefined ? '' : String(inicial)
  })
  const [estadoPago, setEstadoPago] = useState(fila.estado_pago || 'no_pago')
  const [fechaPago, setFechaPago] = useState('')
  const [banco, setBanco] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [facturas, setFacturas] = useState([])
  // Qué factura ya se volcó a los campos, para no pisar lo que el contable
  // escriba después de que se cargue la lista.
  const [idVolcado, setIdVolcado] = useState(null)

  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!fila.empresa_id) return

    async function cargarFacturas() {
      const { data, error: errorConsulta } = await supabase
        .from('contabilidad_facturas')
        .select('id, numero, estado_pago, fecha_pago, entidad_bancaria, observaciones, total_aprendices, fecha_emision')
        .eq('empresa_id', fila.empresa_id)
        .eq('estado', 'emitida')
        .order('fecha_emision', { ascending: false })
        .limit(50)

      if (errorConsulta) {
        console.error(errorConsulta.message)
        return
      }

      setFacturas(data || [])
    }

    cargarFacturas()
  }, [fila.empresa_id])

  const buscado = numero.trim().toLowerCase()
  const existente = facturas.find((f) => f.numero.toLowerCase() === buscado)

  // Al apuntar a una factura que ya existe, sus datos de pago son los que
  // manda: son de la factura, no de este aprendiz.
  useEffect(() => {
    if (!existente || existente.id === idVolcado) return

    setEstadoPago(existente.estado_pago)
    setFechaPago(existente.fecha_pago || '')
    setBanco(existente.entidad_bancaria || '')
    setObservaciones(existente.observaciones || '')
    setIdVolcado(existente.id)
  }, [existente, idVolcado])

  const sugerencias = existente
    ? []
    : (buscado
        ? facturas.filter((f) => f.numero.toLowerCase().includes(buscado))
        : facturas
      ).slice(0, 5)

  const valorNumero = Number(valor)
  const valorValido = valor !== '' && Number.isFinite(valorNumero) && valorNumero >= 0

  function cambiarEstadoPago(nuevo) {
    setEstadoPago(nuevo)
    if (nuevo === 'pago' && !fechaPago) setFechaPago(hoyISO())
  }

  async function guardar() {
    setError('')

    if (numero.trim() === '') {
      setError('Escribe el número de factura')
      return
    }

    if (!valorValido) {
      setError('El valor sin IVA debe ser un número positivo')
      return
    }

    setGuardando(true)

    const { data, error: errorRpc } = await supabase.rpc('diligenciar_matricula', {
      p_matricula_id: fila.matricula_id,
      p_numero: numero.trim(),
      p_valor_sin_iva: valorNumero,
      p_estado_pago: estadoPago,
      p_fecha_pago: estadoPago === 'pago' ? (fechaPago || hoyISO()) : null,
      p_entidad_bancaria: banco,
      p_observaciones: observaciones,
    })

    setGuardando(false)

    if (errorRpc) {
      const propio = ERRORES_PROPIOS.some((t) => errorRpc.message.includes(t))
      setError(propio ? errorRpc.message : 'No se pudo guardar la facturación')
      console.error(errorRpc.message)
      return
    }

    onGuardada(data)
  }

  return (
    <div className="conta-dil">
      <div className="conta-dil__encabezado">
        <div>
          <p className="conta-dil__eyebrow">Diligenciar facturación</p>
          <h2 className="conta-dil__titulo">{fila.nombre_completo}</h2>
          <p className="conta-dil__doc">
            {fila.tipo_documento} {fila.numero_documento}
          </p>
        </div>
        <button
          type="button"
          className="conta-dil__cerrar"
          onClick={onCancelar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Lo que registró Alturas. Desde aquí no se toca. */}
      <dl className="conta-dil__datos">
        <div className="conta-dil__dato">
          <dt className="conta-dil__dato-clave">Ingreso</dt>
          <dd className="conta-dil__dato-valor">{formatearFechaCorta(fila.fecha_ingreso)}</dd>
        </div>
        <div className="conta-dil__dato">
          <dt className="conta-dil__dato-clave">Curso</dt>
          <dd className="conta-dil__dato-valor">{fila.curso}</dd>
        </div>
        <div className="conta-dil__dato">
          <dt className="conta-dil__dato-clave">Empresa</dt>
          <dd className="conta-dil__dato-valor">{fila.empresa || '—'}</dd>
        </div>
        <div className="conta-dil__dato">
          <dt className="conta-dil__dato-clave">NIT</dt>
          <dd className="conta-dil__dato-valor conta-dil__dato-valor_mono">
            {fila.nit || '—'}
          </dd>
        </div>
      </dl>

      {!fila.empresa_id && (
        <p className="conta-dil__bloqueo">
          Esta matrícula no tiene empresa asignada. Alturas tiene que completarla
          antes de poder facturarla.
        </p>
      )}

      <fieldset className="conta-dil__seccion">
        <legend className="conta-dil__legend">Factura</legend>

        <div className="conta-dil__fila">
          <div className="conta-dil__campo">
            <label className="conta-dil__label" htmlFor="dil_numero">Número *</label>
            <input
              id="dil_numero"
              type="text"
              className="conta-dil__input"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="FE-1234"
              autoComplete="off"
            />

            {sugerencias.length > 0 && (
              <ul className="conta-dil__sugerencias">
                {sugerencias.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="conta-dil__sugerencia"
                      onClick={() => setNumero(f.numero)}
                    >
                      <span className="conta-dil__sugerencia-numero">{f.numero}</span>
                      <span className="conta-dil__sugerencia-nota">
                        {f.total_aprendices} {f.total_aprendices === 1 ? 'aprendiz' : 'aprendices'}
                        {' · '}
                        {formatearFechaCorta(f.fecha_emision)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="conta-dil__campo">
            <label className="conta-dil__label" htmlFor="dil_valor">Valor sin IVA *</label>
            <input
              id="dil_valor"
              type="number"
              min="0"
              step="100"
              className="conta-dil__input"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0"
            />
            {valorValido && (
              <p className="conta-dil__calculo">
                Con IVA: {formatearPesos(Math.round(valorNumero * 1.19))}
              </p>
            )}
            {fila.valor_sugerido !== null && fila.valor_sugerido !== undefined && (
              <p className="conta-dil__nota">
                Tarifa de la empresa: {formatearPesos(fila.valor_sugerido)}
              </p>
            )}
          </div>
        </div>

        {existente && (
          <div className="conta-dil__aviso">
            <p className="conta-dil__aviso-titulo">
              La factura {existente.numero} ya existe
            </p>
            <p className="conta-dil__aviso-texto">
              Cubre {existente.total_aprendices}{' '}
              {existente.total_aprendices === 1 ? 'aprendiz' : 'aprendices'}. El pago,
              el banco y las observaciones son de la factura completa: lo que cambies
              aquí les aplica a todos.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="conta-dil__seccion">
        <legend className="conta-dil__legend">Pago</legend>

        <div className="conta-dil__fila">
          <div className="conta-dil__campo">
            <label className="conta-dil__label" htmlFor="dil_estado_pago">Estado</label>
            <select
              id="dil_estado_pago"
              className="conta-dil__select"
              value={estadoPago}
              onChange={(e) => cambiarEstadoPago(e.target.value)}
            >
              <option value="no_pago">No pagada</option>
              <option value="pago">Pagada</option>
            </select>
          </div>

          {estadoPago === 'pago' && (
            <>
              <div className="conta-dil__campo">
                <label className="conta-dil__label" htmlFor="dil_fecha_pago">Fecha de pago</label>
                <input
                  id="dil_fecha_pago"
                  type="date"
                  className="conta-dil__input"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  max={hoyISO()}
                />
              </div>

              <div className="conta-dil__campo">
                <label className="conta-dil__label" htmlFor="dil_banco">Entidad bancaria</label>
                <input
                  id="dil_banco"
                  type="text"
                  className="conta-dil__input"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Bancolombia…"
                />
              </div>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="conta-dil__seccion">
        <legend className="conta-dil__legend">Observaciones de la factura</legend>
        <div className="conta-dil__campo">
          <textarea
            id="dil_observaciones"
            className="conta-dil__textarea"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Acuerdos de pago, retenciones, notas para contabilidad…"
          />
        </div>
      </fieldset>

      {error && <p className="conta-dil__error">{error}</p>}

      <div className="conta-dil__acciones">
        <button
          type="button"
          className="conta-dil__boton conta-dil__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="conta-dil__boton"
          onClick={guardar}
          disabled={guardando || !fila.empresa_id}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default Diligenciar
