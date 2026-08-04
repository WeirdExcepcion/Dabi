import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_CREAR_EMPRESAS, PUEDE_EDITAR_EMPRESAS, PUEDE_ELIMINAR_EMPRESAS } from '../../../constants/permisos'
import Modal from '../Modal/Modal'
import FormularioEmpresa from './FormularioEmpresa/FormularioEmpresa'
import './Empresas.css'

const CAMPOS = `
  id, razon_social, nit, representante_legal, correo, telefono,
  arl_id, sector_id, rut_path, activo, created_at, total_aprendices,
  arls ( nombre ), sectores ( nombre )
`

function Empresas() {
  const { perfil } = useOutletContext()
  const navegar = useNavigate()

  const [empresas, setEmpresas] = useState([])
  const [arls, setArls] = useState([])
  const [sectores, setSectores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState(null)
  const [verInactivas, setVerInactivas] = useState(false)
  const [mensajeAccion, setMensajeAccion] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [orden, setOrden] = useState('alfabetico')
  const [filtroArl, setFiltroArl] = useState('')
  const [filtroSector, setFiltroSector] = useState('')
  const [minAprendices, setMinAprendices] = useState('')

  const puedeCrear = PUEDE_CREAR_EMPRESAS.includes(perfil.rol)
  const puedeEditar = PUEDE_EDITAR_EMPRESAS.includes(perfil.rol)
  const puedeEliminar = PUEDE_ELIMINAR_EMPRESAS.includes(perfil.rol)

  async function obtenerEmpresas() {
    const { data, error } = await supabase
      .from('empresas_con_conteo')
      .select(CAMPOS)
      .order('razon_social', { ascending: true })

    if (error) {
      setError('No se pudieron cargar las empresas')
      console.error(error.message)
    } else {
      setEmpresas(data)
    }

    setCargando(false)
  }

  useEffect(() => {
    async function cargarCatalogos() {
      const [resArls, resSectores] = await Promise.all([
        supabase.from('arls').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('sectores').select('id, nombre').eq('activo', true).order('nombre'),
      ])
      if (resArls.data) setArls(resArls.data)
      if (resSectores.data) setSectores(resSectores.data)
    }

    obtenerEmpresas()
    cargarCatalogos()
  }, [])

  function handleEmpresaCreada() {
    setMostrandoFormulario(false)
    obtenerEmpresas()
  }

  function handleEmpresaEditada() {
    setEmpresaEditando(null)
    obtenerEmpresas()
  }

  async function eliminarEmpresa(empresa) {
    setMensajeAccion('')

    const { data, error } = await supabase.rpc('eliminar_empresa', {
      p_empresa_id: empresa.id,
    })

    if (error) {
      setMensajeAccion('No se pudo procesar la solicitud')
      console.error(error.message)
      return
    }

    if (data.resultado === 'desactivada') {
      setMensajeAccion(
        `${empresa.razon_social} tiene ${data.matriculas} matrícula(s) registrada(s), así que se desactivó en lugar de eliminarse. Su historial queda intacto.`
      )
    } else {
      setMensajeAccion(`${empresa.razon_social} se eliminó.`)
    }

    obtenerEmpresas()
  }

  async function reactivarEmpresa(empresa) {
    setMensajeAccion('')

    const { error } = await supabase.rpc('reactivar_empresa', {
      p_empresa_id: empresa.id,
    })

    if (error) {
      setMensajeAccion('No se pudo reactivar')
      console.error(error.message)
      return
    }

    obtenerEmpresas()
  }

  function limpiarFiltros() {
    setFiltroArl('')
    setFiltroSector('')
    setMinAprendices('')
  }

  if (cargando) {
    return <p className="empresas__mensaje">Cargando empresas...</p>
  }

  if (error) {
    return <p className="empresas__mensaje">{error}</p>
  }

  const activas = empresas.filter((e) => e.activo)
  const inactivas = empresas.filter((e) => !e.activo)
  let visibles = verInactivas ? empresas : activas

  const termino = busqueda.trim().toLowerCase()
  if (termino) {
    visibles = visibles.filter(
      (e) =>
        e.razon_social.toLowerCase().includes(termino) ||
        (e.nit || '').toLowerCase().includes(termino)
    )
  }

  if (filtroArl) {
    visibles = visibles.filter((e) => String(e.arl_id) === String(filtroArl))
  }

  if (filtroSector) {
    visibles = visibles.filter((e) => String(e.sector_id) === String(filtroSector))
  }

  if (minAprendices) {
    visibles = visibles.filter((e) => (e.total_aprendices || 0) >= Number(minAprendices))
  }

  visibles = [...visibles].sort((a, b) => {
    if (orden === 'recientes') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    if (orden === 'antiguas') {
      return new Date(a.created_at) - new Date(b.created_at)
    }
    if (orden === 'aprendices') {
      return (b.total_aprendices || 0) - (a.total_aprendices || 0)
    }
    return a.razon_social.localeCompare(b.razon_social)
  })

  const hayFiltros = filtroArl || filtroSector || minAprendices

  return (
    <section className="empresas">
      <header className="empresas__header">
        <div>
          <p className="empresas__eyebrow">Administración</p>
          <h1 className="empresas__titulo">Empresas</h1>
        </div>

        <div className="empresas__header-acciones">
          <span className="empresas__conteo">{activas.length} activas</span>
          {puedeCrear && !mostrandoFormulario && (
            <button
              className="empresas__boton-nueva"
              onClick={() => setMostrandoFormulario(true)}
            >
              Nueva empresa
            </button>
          )}
        </div>
      </header>

      {mostrandoFormulario && (
        <Modal onCerrar={() => setMostrandoFormulario(false)} bloquearCierre>
          <FormularioEmpresa
            rol={perfil.rol}
            onGuardada={handleEmpresaCreada}
            onCancelar={() => setMostrandoFormulario(false)}
          />
        </Modal>
      )}

      {empresaEditando && (
        <Modal onCerrar={() => setEmpresaEditando(null)} bloquearCierre>
          <FormularioEmpresa
            empresa={empresaEditando}
            rol={perfil.rol}
            onGuardada={handleEmpresaEditada}
            onCancelar={() => setEmpresaEditando(null)}
          />
        </Modal>
      )}

      <div className="empresas__buscador">
        <input
          type="text"
          className="empresas__input-busqueda"
          placeholder="Buscar por razón social o NIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {termino && (
          <span className="empresas__resultado-conteo">
            {visibles.length} {visibles.length === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </div>

      <div className="empresas__filtros">
        <div className="empresas__filtro">
          <label className="empresas__filtro-label" htmlFor="orden">Ordenar por</label>
          <select
            id="orden"
            className="empresas__filtro-select"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="alfabetico">Orden alfabético</option>
            <option value="recientes">Más recientes</option>
            <option value="antiguas">Más antiguas</option>
            <option value="aprendices">Más aprendices</option>
          </select>
        </div>

        <div className="empresas__filtro">
          <label className="empresas__filtro-label" htmlFor="f_sector">Sector</label>
          <select
            id="f_sector"
            className="empresas__filtro-select"
            value={filtroSector}
            onChange={(e) => setFiltroSector(e.target.value)}
          >
            <option value="">Todos</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="empresas__filtro">
          <label className="empresas__filtro-label" htmlFor="f_arl">ARL</label>
          <select
            id="f_arl"
            className="empresas__filtro-select"
            value={filtroArl}
            onChange={(e) => setFiltroArl(e.target.value)}
          >
            <option value="">Todas</option>
            {arls.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>

        <div className="empresas__filtro empresas__filtro_corto">
          <label className="empresas__filtro-label" htmlFor="f_min">Mín. aprendices</label>
          <input
            id="f_min"
            type="number"
            min="0"
            className="empresas__filtro-input"
            value={minAprendices}
            onChange={(e) => setMinAprendices(e.target.value)}
            placeholder="0"
          />
        </div>

        {hayFiltros && (
          <button className="empresas__limpiar" onClick={limpiarFiltros}>
            Limpiar
          </button>
        )}
      </div>

      {mensajeAccion && (
        <p className="empresas__mensaje-accion">{mensajeAccion}</p>
      )}

      {inactivas.length > 0 && (
        <button
          className="empresas__toggle"
          onClick={() => setVerInactivas((v) => !v)}
        >
          {verInactivas ? 'Ocultar inactivas' : `Ver inactivas (${inactivas.length})`}
        </button>
      )}

      {empresas.length === 0 ? (
        <p className="empresas__mensaje">Aún no hay empresas registradas.</p>
      ) : visibles.length === 0 ? (
        <p className="empresas__mensaje">Ninguna empresa coincide con los filtros.</p>
      ) : (
        <div className="empresas__tabla-wrap">
          <table className="empresas__tabla">
            <thead>
              <tr>
                <th className="empresas__th">Razón social</th>
                <th className="empresas__th">NIT</th>
                <th className="empresas__th">Representante legal</th>
                <th className="empresas__th">Teléfono</th>
                <th className="empresas__th">ARL</th>
                <th className="empresas__th">Sector</th>
                <th className="empresas__th">Aprendices</th>
                <th className="empresas__th"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="empresas__fila"
                  onClick={() => navegar(`/alturas/empresas/${empresa.id}`)}
                >
                  <td className="empresas__td empresas__td_principal">{empresa.razon_social}</td>
                  <td className="empresas__td">{empresa.nit || '—'}</td>
                  <td className="empresas__td">{empresa.representante_legal || '—'}</td>
                  <td className="empresas__td">{empresa.telefono || '—'}</td>
                  <td className="empresas__td">{empresa.arls?.nombre || '—'}</td>
                  <td className="empresas__td">{empresa.sectores?.nombre || '—'}</td>
                  <td className="empresas__td empresas__td_conteo">
                    {empresa.total_aprendices || 0}
                  </td>
                  <td className="empresas__td empresas__td_acciones">
                    {puedeEditar && (
                      <button
                        className="empresas__boton-editar"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEmpresaEditando(empresa)
                        }}
                      >
                        Editar
                      </button>
                    )}
                    {puedeEliminar && empresa.activo && (
                      <button
                        className="empresas__boton-eliminar"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`¿Eliminar ${empresa.razon_social}? Si tiene matrículas registradas, se desactivará en lugar de borrarse.`)) {
                            eliminarEmpresa(empresa)
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                    {puedeEliminar && !empresa.activo && (
                      <button
                        className="empresas__boton-reactivar"
                        onClick={(e) => {
                          e.stopPropagation()
                          reactivarEmpresa(empresa)
                        }}
                      >
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default Empresas