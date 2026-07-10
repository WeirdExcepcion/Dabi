import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './CorregirDocumento.css'

function CorregirDocumento({ aprendiz, totalMatriculas, onCorregido, onCancelar }) {
  const [tipoDocumento, setTipoDocumento] = useState(aprendiz.tipo_documento)
  const [numeroDocumento, setNumeroDocumento] = useState(aprendiz.numero_documento)
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const huboCambio =
    tipoDocumento !== aprendiz.tipo_documento ||
    numeroDocumento.trim() !== aprendiz.numero_documento

  const confirmacionValida = confirmacion.trim() === numeroDocumento.trim()

  async function guardar() {
    setError('')

    if (!numeroDocumento.trim()) {
      setError('El número de documento no puede estar vacío')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('aprendices')
      .update({
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento.trim(),
      })
      .eq('id', aprendiz.id)

    setGuardando(false)

    if (error) {
      if (error.code === '23505') {
        setError('Ya existe otro aprendiz con ese tipo y número de documento')
      } else if (error.message.includes('no permite corregir')) {
        setError('Tu rol no permite corregir el documento')
      } else {
        setError('No se pudo corregir el documento')
      }
      console.error(error.message)
      return
    }

    onCorregido()
  }

  return (
    <div className="corregir">
      <div className="corregir__encabezado">
        <div>
          <p className="corregir__eyebrow">Corregir documento</p>
          <h2 className="corregir__titulo">
            {aprendiz.apellidos} {aprendiz.nombres}
          </h2>
        </div>
        <button
          type="button"
          className="corregir__cerrar"
          onClick={onCancelar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="corregir__alerta">
        <p className="corregir__alerta-titulo">Esta acción afecta el historial completo</p>
        <p className="corregir__alerta-texto">
          El documento identifica a esta persona en{' '}
          <strong>
            {totalMatriculas} {totalMatriculas === 1 ? 'matrícula' : 'matrículas'}
          </strong>
          , incluidos sus certificados. Solo corrígelo si hubo un error de digitación.
        </p>
        <p className="corregir__alerta-texto">
          Si el documento actual pertenece a <em>otra persona real</em>, no lo cambies:
          la matrícula está asociada al aprendiz equivocado y debe corregirse de otra forma.
        </p>
      </div>

      <div className="corregir__actual">
        <p className="corregir__etiqueta">Documento actual</p>
        <p className="corregir__valor-actual">
          {aprendiz.tipo_documento} {aprendiz.numero_documento}
        </p>
      </div>

      <div className="corregir__fila">
        <div className="corregir__campo corregir__campo_corto">
          <label className="corregir__label" htmlFor="corr_tipo">Tipo</label>
          <select
            id="corr_tipo"
            className="corregir__select"
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
          >
            <option value="CC">CC</option>
            <option value="CE">CE</option>
            <option value="PPT">PPT</option>
            <option value="PA">PA</option>
          </select>
        </div>

        <div className="corregir__campo">
          <label className="corregir__label" htmlFor="corr_numero">Nuevo número</label>
          <input
            id="corr_numero"
            type="text"
            className="corregir__input"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
          />
        </div>
      </div>

      {huboCambio && (
        <div className="corregir__campo corregir__campo_confirmacion">
          <label className="corregir__label" htmlFor="corr_confirmacion">
            Escribe el nuevo número para confirmar
          </label>
          <input
            id="corr_confirmacion"
            type="text"
            className="corregir__input"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}

      {error && <p className="corregir__error">{error}</p>}

      <div className="corregir__acciones">
        <button
          type="button"
          className="corregir__boton corregir__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="corregir__boton corregir__boton_peligro"
          onClick={guardar}
          disabled={!huboCambio || !confirmacionValida || guardando}
        >
          {guardando ? 'Corrigiendo…' : 'Corregir documento'}
        </button>
      </div>
    </div>
  )
}

export default CorregirDocumento