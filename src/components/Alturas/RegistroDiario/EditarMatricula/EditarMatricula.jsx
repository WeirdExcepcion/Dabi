import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useCatalogos } from '../../../../hooks/useCatalogos'
import { PUEDE_CAMBIAR_ESTADO_GRUPO } from '../../../../constants/permisos'
import SelectorBuscable from "../../../compartidos/SelectorBuscable/SelectorBuscable";
import SelectorCargo from '../../../compartidos/SelectorCargo/SelectorCargo'
import './EditarMatricula.css'
import { ESTADOS_MATRICULA, ESTADOS_APROBACION } from '../../../../constants/estados'
import DocumentosMatricula from '../../DocumentosMatricula/DocumentosMatricula'


function EditarMatricula({ matricula, rol, onGuardada, onCancelar }) {
  const { catalogos, cargando: cargandoCatalogos } = useCatalogos()
  const puedeEstadoGrupo = PUEDE_CAMBIAR_ESTADO_GRUPO.includes(rol)

  const [empresaId, setEmpresaId] = useState(matricula.empresa_id || '')
  const [arlId, setArlId] = useState(matricula.arl_id || '')
  const [epsId, setEpsId] = useState(matricula.eps_id || '')
  const [areaId, setAreaId] = useState(matricula.area_id || '')
  const [cargoId, setCargoId] = useState(matricula.cargo_id || '')
  const [sectorId, setSectorId] = useState(matricula.sector_id || '')
  const [cargosLocales, setCargosLocales] = useState([])
  const [fechaArl, setFechaArl] = useState(matricula.fecha_arl || '')
  const [fechaExamen, setFechaExamen] = useState(matricula.fecha_examen || '')
  const [estado, setEstado] = useState(matricula.estado)

  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [pestana, setPestana] = useState('datos')

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

    setGuardando(true)

    const cambios = {
      empresa_id: Number(empresaId),
      arl_id: opcional(arlId),
      eps_id: opcional(epsId),
      area_id: opcional(areaId),
      cargo_id: opcional(cargoId),
      sector_id: opcional(sectorId),
      fecha_arl: opcionalFecha(fechaArl),
      fecha_examen: opcionalFecha(fechaExamen),
    }

    if (puedeEstadoGrupo) {
      cambios.estado = estado
    }

    const { data, error } = await supabase.rpc('editar_matricula', {
      p_matricula_id: matricula.id,
      p_cambios: cambios,
    })

    setGuardando(false)

    if (error) {
      if (error.message.includes('fechas que se cruzan')) {
        setError('Este aprendiz ya está en otro grupo con fechas que se cruzan')
      } else if (error.message.includes('no tiene entrenador')) {
        setError('No se puede certificar: el grupo no tiene entrenador asignado')
      } else if (error.message.includes('no permite')) {
        setError('Tu rol no permite este cambio')
      } else if (error.code === '23505') {
        setError('Este aprendiz ya está matriculado en ese grupo')
      } else {
        setError('No se pudieron guardar los cambios')
      }
      console.error(error.message)
      return
    }

    if (data?.resultado === 'pendiente_aprobacion') {
      setResultado('pendiente')
      return
    }

    onGuardada()
  }

  if (cargandoCatalogos) {
    return <p className="editar-mat__mensaje">Cargando catálogos...</p>
  }

  if (resultado === 'pendiente') {
    return (
      <div className="editar-mat">
        <div className="editar-mat__pendiente">
          <p className="editar-mat__pendiente-titulo">Solicitud enviada</p>
          <p className="editar-mat__pendiente-texto">
            Esta matrícula tiene un certificado emitido, así que tu cambio requiere
            autorización de coordinación. Se aplicará cuando lo aprueben.
          </p>
          <button className="editar-mat__boton" onClick={onGuardada}>
            Entendido
          </button>
        </div>
      </div>
    )
  }

  const certificadoVigente = matricula.certificados?.find((c) => c.estado === 'vigente')

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

      {certificadoVigente && (
        <div className="editar-mat__cert-alerta">
          <p className="editar-mat__cert-titulo">
            Esta matrícula tiene un certificado emitido
          </p>
          <p className="editar-mat__cert-codigo">
            Código: <code>{certificadoVigente.codigo}</code>
          </p>
          <p className="editar-mat__cert-texto">
            Si cambias datos que aparecen en el certificado, este perderá validez y
            habrá que emitirlo de nuevo.
          </p>
        </div>
      )}
        <div className="editar-mat__pestanas">
        <button
          type="button"
          className={pestana === 'datos' ? 'editar-mat__pestana editar-mat__pestana_activa' : 'editar-mat__pestana'}
          onClick={() => setPestana('datos')}
        >
          Datos
        </button>
        <button
          type="button"
          className={pestana === 'documentos' ? 'editar-mat__pestana editar-mat__pestana_activa' : 'editar-mat__pestana'}
          onClick={() => setPestana('documentos')}
        >
          Documentos
        </button>
      </div>

      {pestana === 'documentos' && (
        <DocumentosMatricula
          matriculaId={matricula.id}
          aprendizId={matricula.aprendiz_id}
          requiereCertificadoPrevio={matricula.grupos?.cursos?.requiere_certificado_previo}
        />
      )}

      {pestana === 'datos' && (
        <>
      
      
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
                {ESTADOS_APROBACION.map((valor) => (
                  <option key={valor} value={valor}>{ESTADOS_MATRICULA[valor]}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="editar-mat__seccion">
        <legend className="editar-mat__legend">Empresa y cargo</legend>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_empresa">Empresa *</label>
            <SelectorBuscable
              id="edit_empresa"
              opciones={catalogos.empresas}
              valor={empresaId}
              campoTexto="razon_social"
              placeholder="Buscar empresa…"
              vacioTexto="Selecciona…"
              onCambio={(nuevaEmpresaId) => {
                setEmpresaId(nuevaEmpresaId)

                const empresaElegida = catalogos.empresas.find(
                  (emp) => String(emp.id) === String(nuevaEmpresaId)
                )
                if (empresaElegida?.arl_id && !arlId) {
                  setArlId(String(empresaElegida.arl_id))
                }
                if (empresaElegida?.sector_id && !sectorId) {
                  setSectorId(String(empresaElegida.sector_id))
                }
              }}
            />
          </div>
        </div>

        <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_sector">Sector</label>
            <SelectorBuscable
              id="edit_sector"
              opciones={catalogos.sectores}
              valor={sectorId}
              onCambio={setSectorId}
              placeholder="Buscar sector…"
            />
          </div>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_area">Área</label>
            <SelectorBuscable
              id="edit_area"
              opciones={catalogos.areas}
              valor={areaId}
              onCambio={setAreaId}
              placeholder="Buscar área…"
            />
          </div>

          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_cargo">Cargo</label>
            <SelectorCargo
              id="edit_cargo"
              cargos={[...catalogos.cargos, ...cargosLocales]}
              valor={cargoId}
              onCambio={setCargoId}
              onCargoCreado={(nuevo) =>
                    setCargosLocales((antes) => {
                      const yaEsta =
                        antes.some((c) => c.id === nuevo.id) ||
                        catalogos.cargos.some((c) => c.id === nuevo.id)
                      return yaEsta ? antes : [...antes, nuevo]
                    })
                  }
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="editar-mat__seccion">
        <legend className="editar-mat__legend">Documentos</legend>

        <div className="editar-mat__fila">
          <div className="editar-mat__campo">
            <label className="editar-mat__label" htmlFor="edit_arl">ARL</label>
            <SelectorBuscable
              id="edit_arl"
              opciones={catalogos.arls}
              valor={arlId}
              onCambio={setArlId}
              placeholder="Buscar ARL…"
            />
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
            <SelectorBuscable
              id="edit_eps"
              opciones={catalogos.eps}
              valor={epsId}
              onCambio={setEpsId}
              placeholder="Buscar EPS…"
            />
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
              </>
      )}
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