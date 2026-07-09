import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useCatalogos } from '../../../hooks/useCatalogos'
import SelectorGrupo from '../../SelectorGrupo/SelectorGrupo'
import './FormularioMatricula.css'

const DATOS_PERSONA_VACIOS = {
  nombres: '',
  apellidos: '',
  sexo: '',
  pais: 'Colombia',
  fecha_nacimiento: '',
  nivel_educativo_id: '',
  rh: '',
}

function FormularioMatricula({ onGuardada, onCancelar }) {
  const { catalogos, cargando: cargandoCatalogos } = useCatalogos()

  const [tipoDocumento, setTipoDocumento] = useState('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aprendizExistente, setAprendizExistente] = useState(null)
  const [busquedaHecha, setBusquedaHecha] = useState(false)

  const [persona, setPersona] = useState(DATOS_PERSONA_VACIOS)

  const [grupoId, setGrupoId] = useState(null)
  const [empresaId, setEmpresaId] = useState('')
  const [arlId, setArlId] = useState('')
  const [epsId, setEpsId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [cargoId, setCargoId] = useState('')
  const [fechaArl, setFechaArl] = useState('')
  const [fechaExamen, setFechaExamen] = useState('')

  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function actualizarPersona(campo, valor) {
    setPersona((anterior) => ({ ...anterior, [campo]: valor }))
  }

  function reiniciarBusqueda() {
    setBusquedaHecha(false)
    setAprendizExistente(null)
    setPersona(DATOS_PERSONA_VACIOS)
    setNumeroDocumento('')
    setError('')
  }

  async function buscarAprendiz() {
    if (!numeroDocumento.trim()) {
      setError('Ingresa el número de documento')
      return
    }

    setError('')
    setBuscando(true)

    const { data, error } = await supabase
      .from('aprendices')
      .select('*')
      .eq('tipo_documento', tipoDocumento)
      .eq('numero_documento', numeroDocumento.trim())
      .maybeSingle()

    setBuscando(false)

    if (error) {
      setError('Error al buscar el aprendiz')
      console.error(error.message)
      return
    }

    setBusquedaHecha(true)

    if (data) {
      setAprendizExistente(data)
      setPersona({
        nombres: data.nombres,
        apellidos: data.apellidos,
        sexo: data.sexo || '',
        pais: data.pais || 'Colombia',
        fecha_nacimiento: data.fecha_nacimiento || '',
        nivel_educativo_id: data.nivel_educativo_id || '',
        rh: data.rh || '',
      })
    } else {
      setAprendizExistente(null)
      setPersona(DATOS_PERSONA_VACIOS)
    }
  }

  function opcional(valor) {
    return valor === '' ? null : valor
  }

  function hoyLocal() {
    const hoy = new Date()
    const yyyy = hoy.getFullYear()
    const mm = String(hoy.getMonth() + 1).padStart(2, '0')
    const dd = String(hoy.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  async function guardar() {
    setError('')

    if (!persona.nombres.trim() || !persona.apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios')
      return
    }
    if (!grupoId) {
      setError('Selecciona un grupo')
      return
    }
    if (!empresaId) {
      setError('Selecciona una empresa')
      return
    }

    setGuardando(true)

    const { data, error } = await supabase.rpc('registrar_matricula', {
      p_tipo_documento: tipoDocumento,
      p_numero_documento: numeroDocumento.trim(),
      p_nombres: persona.nombres.trim(),
      p_apellidos: persona.apellidos.trim(),
      p_sexo: opcional(persona.sexo),
      p_pais: persona.pais.trim() || 'Colombia',
      p_fecha_nacimiento: opcional(persona.fecha_nacimiento),
      p_nivel_educativo_id: opcional(persona.nivel_educativo_id),
      p_rh: opcional(persona.rh),
      p_grupo_id: grupoId,
      p_empresa_id: Number(empresaId),
      p_arl_id: opcional(arlId),
      p_eps_id: opcional(epsId),
      p_area_id: opcional(areaId),
      p_cargo_id: opcional(cargoId),
      p_fecha_arl: opcional(fechaArl),
      p_fecha_examen: opcional(fechaExamen),
      p_fecha_ingreso: hoyLocal(),
    })

    setGuardando(false)

    if (error) {
      if (error.message.includes('fechas que se cruzan')) {
        setError('Este aprendiz ya está en otro grupo con fechas que se cruzan')
      } else if (error.code === '23505') {
        setError('Este aprendiz ya está matriculado en ese grupo')
      } else {
        setError('No se pudo guardar la matrícula')
      }
      console.error(error.message)
      return
    }

    onGuardada(data)
  }

  if (cargandoCatalogos) {
    return <p className="form-matricula__mensaje">Cargando catálogos...</p>
  }

  return (
    <div className="form-matricula">
      <div className="form-matricula__encabezado">
        <h2 className="form-matricula__titulo">Agregar aprendiz</h2>
        <button
          type="button"
          className="form-matricula__cerrar"
          onClick={onCancelar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <fieldset className="form-matricula__seccion">
        <legend className="form-matricula__legend">1. Documento</legend>

        <div className="form-matricula__fila">
          <div className="form-matricula__campo form-matricula__campo_corto">
            <label className="form-matricula__label" htmlFor="tipo_doc">Tipo *</label>
            <select
              id="tipo_doc"
              className="form-matricula__select"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              disabled={busquedaHecha}
            >
              <option value="CC">CC</option>
              <option value="CE">CE</option>
              <option value="PPT">PPT</option>
              <option value="PA">PA</option>
            </select>
          </div>

          <div className="form-matricula__campo">
            <label className="form-matricula__label" htmlFor="num_doc">Número *</label>
            <input
              id="num_doc"
              type="text"
              className="form-matricula__input"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              disabled={busquedaHecha}
              autoFocus
            />
          </div>

          {!busquedaHecha ? (
            <button
              type="button"
              className="form-matricula__boton-buscar"
              onClick={buscarAprendiz}
              disabled={buscando}
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          ) : (
            <button
              type="button"
              className="form-matricula__boton-buscar form-matricula__boton-buscar_secundario"
              onClick={reiniciarBusqueda}
            >
              Cambiar
            </button>
          )}
        </div>

        {busquedaHecha && aprendizExistente && (
          <p className="form-matricula__aviso form-matricula__aviso_existe">
            Aprendiz ya registrado. Sus datos se autocompletaron; revisa que sigan vigentes.
          </p>
        )}

        {busquedaHecha && !aprendizExistente && (
          <p className="form-matricula__aviso form-matricula__aviso_nuevo">
            Aprendiz nuevo. Completa sus datos personales.
          </p>
        )}
      </fieldset>

      {busquedaHecha && (
        <>
          <fieldset className="form-matricula__seccion">
            <legend className="form-matricula__legend">2. Datos personales</legend>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="nombres">Nombres *</label>
                <input
                  id="nombres"
                  type="text"
                  className="form-matricula__input"
                  value={persona.nombres}
                  onChange={(e) => actualizarPersona('nombres', e.target.value)}
                />
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="apellidos">Apellidos *</label>
                <input
                  id="apellidos"
                  type="text"
                  className="form-matricula__input"
                  value={persona.apellidos}
                  onChange={(e) => actualizarPersona('apellidos', e.target.value)}
                />
              </div>
            </div>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo form-matricula__campo_corto">
                <label className="form-matricula__label" htmlFor="sexo">Sexo</label>
                <select
                  id="sexo"
                  className="form-matricula__select"
                  value={persona.sexo}
                  onChange={(e) => actualizarPersona('sexo', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>

              <div className="form-matricula__campo form-matricula__campo_corto">
                <label className="form-matricula__label" htmlFor="rh">RH</label>
                <select
                  id="rh"
                  className="form-matricula__select"
                  value={persona.rh}
                  onChange={(e) => actualizarPersona('rh', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="fecha_nac">Fecha de nacimiento</label>
                <input
                  id="fecha_nac"
                  type="date"
                  className="form-matricula__input"
                  value={persona.fecha_nacimiento}
                  onChange={(e) => actualizarPersona('fecha_nacimiento', e.target.value)}
                />
              </div>
            </div>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="pais">País</label>
                <input
                  id="pais"
                  type="text"
                  className="form-matricula__input"
                  value={persona.pais}
                  onChange={(e) => actualizarPersona('pais', e.target.value)}
                />
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="nivel_edu">Nivel educativo</label>
                <select
                  id="nivel_edu"
                  className="form-matricula__select"
                  value={persona.nivel_educativo_id}
                  onChange={(e) => actualizarPersona('nivel_educativo_id', e.target.value)}
                >
                  <option value="">—</option>
                  {catalogos.nivelesEducativos.map((nivel) => (
                    <option key={nivel.id} value={nivel.id}>{nivel.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="form-matricula__seccion">
            <legend className="form-matricula__legend">3. Grupo y empresa</legend>

            <div className="form-matricula__campo form-matricula__campo_ancho">
              <label className="form-matricula__label">Grupo *</label>
              <SelectorGrupo valor={grupoId} onCambio={setGrupoId} />
            </div>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="empresa">Empresa *</label>
                <select
                  id="empresa"
                  className="form-matricula__select"
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

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="area">Área</label>
                <select
                  id="area"
                  className="form-matricula__select"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                >
                  <option value="">—</option>
                  {catalogos.areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="cargo">Cargo</label>
                <select
                  id="cargo"
                  className="form-matricula__select"
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

          <fieldset className="form-matricula__seccion">
            <legend className="form-matricula__legend">4. Documentos</legend>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="arl">ARL</label>
                <select
                  id="arl"
                  className="form-matricula__select"
                  value={arlId}
                  onChange={(e) => setArlId(e.target.value)}
                >
                  <option value="">—</option>
                  {catalogos.arls.map((arl) => (
                    <option key={arl.id} value={arl.id}>{arl.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="fecha_arl">Fecha ARL</label>
                <input
                  id="fecha_arl"
                  type="date"
                  className="form-matricula__input"
                  value={fechaArl}
                  onChange={(e) => setFechaArl(e.target.value)}
                />
              </div>
            </div>

            <div className="form-matricula__fila">
              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="eps">EPS</label>
                <select
                  id="eps"
                  className="form-matricula__select"
                  value={epsId}
                  onChange={(e) => setEpsId(e.target.value)}
                >
                  <option value="">—</option>
                  {catalogos.eps.map((eps) => (
                    <option key={eps.id} value={eps.id}>{eps.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-matricula__campo">
                <label className="form-matricula__label" htmlFor="fecha_examen">Examen médico</label>
                <input
                  id="fecha_examen"
                  type="date"
                  className="form-matricula__input"
                  value={fechaExamen}
                  onChange={(e) => setFechaExamen(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {error && <p className="form-matricula__error">{error}</p>}

         <div className="form-matricula__acciones">
            <button
              type="button"
              className="form-matricula__boton form-matricula__boton_secundario"
              onClick={onCancelar}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="form-matricula__boton"
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar aprendiz'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default FormularioMatricula