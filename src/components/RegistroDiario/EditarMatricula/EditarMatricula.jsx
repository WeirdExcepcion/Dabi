import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useCatalogos } from '../../../hooks/useCatalogos'
import { PUEDE_CAMBIAR_ESTADO_GRUPO } from '../../../constants/permisos'
import SelectorGrupo from '../../SelectorGrupo/SelectorGrupo'
import './EditarMatricula.css'

const ESTADOS = {
  en_proceso: 'En proceso',
  faltan_documentos: 'Faltan documentos',
  esperando_fecha: 'Esperando fecha',
  certificado: 'Certificado',
  anulado: 'Anulado',
}

function EditarMatricula({ matricula, rol, onGuardada, onCancelar }) {
  const { catalogos, cargando: cargandoCatalogos } = useCatalogos()
  const puedeEstadoGrupo = PUEDE_CAMBIAR_ESTADO_GRUPO.includes(rol)

  const [empresaId, setEmpresaId] = useState(matricula.empresa_id || '')
  const [arlId, setArlId] = useState(matricula.arl_id || '')
  const [epsId, setEpsId] = useState(matricula.eps_id || '')
  const [areaId, setAreaId] = useState(matricula.area_id || '')
  const [cargoId, setCargoId] = useState(matricula.cargo_id || '')
  const [fechaArl, setFechaArl] = useState(matricula.fecha_arl || '')
  const [fechaExamen, setFechaExamen] = useState(matricula.fecha_examen || '')
  const [estado, setEstado] = useState(matricula.estado)
  const [grupoId, setGrupoId] = useState(matricula.grupo_id)

  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function opcional(valor) {
    return valor === '' ? null : Number(valor)
  }

  function opcionalFecha(valor) {
    return valor === '' ? null : valor
  }

  async function guardar() {
    setError('')

    if (!empresaId) {
      setError('Selecciona una empresa')
      return
    }
    if (!grupoId) {
      setError('Selecciona un grupo')
      return
    }

    setGuardando(true)

    const cambios = {
      empresa_id: Number(empresaId),
      arl_id: opcional(arlId),
      eps_id: opcional(epsId),
      area_id: opcional(areaId),
      cargo_id: opcional(cargoId),
      fecha_arl: opcionalFecha(fechaArl),
      fecha_examen: opcionalFecha(fechaExamen),
    }

    if (puedeEstadoGrupo) {
      cambios.estado = estado
      cambios.grupo_id = grupoId
    }

    const { error } = await supabase
      .from('matriculas')
      .update(cambios)
      .eq('id', matricula.id)

    setGuardando(false)

    if (error) {
      if (error.message.includes('fechas que se cruzan')) {
        setError('Este aprendiz ya está en otro grupo con fechas que se cruzan')
      } else if (error.message.includes('no tiene entrenador')) {
        setError('No se puede certificar: el grupo no tiene entrenador asignado')
      } else if (error.message.includes('no permite cambiar')) {
        setError('Tu rol no permite cambiar el estado o el grupo')
      } else if (error.code === '23505') {
        setError('Este aprendiz ya está matriculado en ese grupo')
      } else {
        setError('No se pudieron guardar los cambios')
      }
      console.error(error.message)
      return
    }

    onGuardada()
  }

  if (cargandoCatalogos) {
    return <p className="editar-mat__mensaje">Cargando catálogos...</p>
  }

  const a = matricula.aprendices

  return (
    <div className="editar-mat">
      <div className="editar-mat__encabezado">
        <div>
          <p className="editar-mat__eyebrow">Editar matrícula</p>
          <h2 className="editar-mat__titulo">
            {a.apellidos} {a.nombres}
          </h2>
          <p className="editar-mat__doc">
            {a.tipo_documento} {a.numero_documento}
            <span className="editar-mat__doc-nota"> · el documento no se edita desde aquí</span>
          </p>
        </div>
        <button
          type="button"
          className="editar-mat__cerrar"
          onClick={onCancelar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {puedeEstadoGrupo && (
        <fieldset className="editar-mat__seccion">
          <legend className="editar-mat__legend">Estado y grupo</legend>

          <div className="editar-mat__fila">
            <div className="editar-mat__campo">
              <label className="editar-mat__label" htmlFor="edit_estado">Estado</label>
              <select
                id="edit_estado"
                className="editar-mat__select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {Object.entries(ESTADOS).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="editar-mat__campo">
            <label className="editar-mat__label">Grupo</label>
            <SelectorGrupo valor={grupoId} onCambio={setGrupoId} />
          </div>
        </fieldset>
      )}

      <fieldset className="editar-mat__seccion">
        <legend className="editar-mat__legend">Empresa y cargo</legend>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_empresa">Empresa *</label>
            <select
              id="edit_empresa"
              className="editar-mat__select"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {catalogos.empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.razon_social}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_area">Área</label>
            <select
              id="edit_area"
              className="editar-mat__select"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">—</option>
              {catalogos.areas.map((area) => (
                <option key={area.id} value={area.id}>{area.nombre}</option>
              ))}
            </select>
          </div>

          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_cargo">Cargo</label>
            <select
              id="edit_cargo"
              className="editar-mat__select"
              value={cargoId}
              onChange={(e) => setCargoId(e.target.value)}
            >
              <option value="">—</option>
              {catalogos.cargos.map((cargo) => (
                <option key={cargo.id} value={cargo.id}>{cargo.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="editar-mat__seccion">
        <legend className="editar-mat__legend">Documentos</legend>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_arl">ARL</label>
            <select
              id="edit_arl"
              className="editar-mat__select"
              value={arlId}
              onChange={(e) => setArlId(e.target.value)}
            >
              <option value="">—</option>
              {catalogos.arls.map((arl) => (
                <option key={arl.id} value={arl.id}>{arl.nombre}</option>
              ))}
            </select>
          </div>

          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_fecha_arl">Fecha ARL</label>
            <input
              id="edit_fecha_arl"
              type="date"
              className="editar-mat__input"
              value={fechaArl}
              onChange={(e) => setFechaArl(e.target.value)}
            />
          </div>
        </div>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_eps">EPS</label>
            <select
              id="edit_eps"
              className="editar-mat__select"
              value={epsId}
              onChange={(e) => setEpsId(e.target.value)}
            >
              <option value="">—</option>
              {catalogos.eps.map((eps) => (
                <option key={eps.id} value={eps.id}>{eps.nombre}</option>
              ))}
            </select>
          </div>

          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_fecha_examen">Examen médico</label>
            <input
              id="edit_fecha_examen"
              type="date"
              className="editar-mat__input"
              value={fechaExamen}
              onChange={(e) => setFechaExamen(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {error && <p className="editar-mat__error">{error}</p>}

      <div className="editar-mat__acciones">
        <button
          type="button"
          className="editar-mat__boton editar-mat__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="editar-mat__boton"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

export default EditarMatricula