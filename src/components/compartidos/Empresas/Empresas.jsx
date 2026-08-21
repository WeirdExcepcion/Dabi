import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_CREAR_EMPRESAS, PUEDE_EDITAR_EMPRESAS, PUEDE_ELIMINAR_EMPRESAS } from '../../../constants/permisos'
import { invalidarCatalogo } from '../../../lib/catalogos'
import { useCatalogos } from '../../../hooks/useCatalogos'
import Modal from '../Modal/Modal'
import Confirmacion from '../Confirmacion/Confirmacion'
import FormularioEmpresa from './FormularioEmpresa/FormularioEmpresa'
import './Empresas.css'

// Fuera del componente: si se declarara dentro, sería un array nuevo en cada
// render y useCatalogos volvería a disparar su efecto.
const CATALOGOS_FILTROS = ['arls', 'sectores']

const POR_PAGINA = 25

const ORDENES = {
  alfabetico: { columna: 'razon_social', ascendente: true },
  recientes: { columna: 'created_at', ascendente: false },
  antiguas: { columna: 'created_at', ascendente: true },
  aprendices: { columna: 'total_aprendices', ascendente: false },
}

const CAMPOS = `
  id, razon_social, nit, representante_legal, correo, telefono,
  arl_id, sector_id, rut_path, activo, created_at, total_aprendices,
  arls ( nombre ), sectores ( nombre )
`

// PostgREST separa los filtros de or() con comas y agrupa con paréntesis, así
// que esos caracteres dentro del término romperían la consulta.
function limpiarParaFiltro(texto) {
  return texto.replace(/[,()]/g, ' ').trim()
}

function Empresas() {
  const { perfil } = useOutletContext()
  const navegar = useNavigate()

  const { catalogos } = useCatalogos(CATALOGOS_FILTROS)
  const { arls, sectores } = catalogos

  const [empresas, setEmpresas] = useState([])
  const [total, setTotal] = useState(0)
  const [conteos, setConteos] = useState({ activas: 0, inactivas: 0 })
  const [pagina, setPagina] = useState(0)

  const [iniciando, setIniciando] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState(null)
  const [empresaEliminando, setEmpresaEliminando] = useState(null)
  const [verInactivas, setVerInactivas] = useState(false)
  const [mensajeAccion, setMensajeAccion] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')

  const [orden, setOrden] = useState('alfabetico')
  const [filtroArl, setFiltroArl] = useState('')
  const [filtroSector, setFiltroSector] = useState('')
  const [minAprendices, setMinAprendices] = useState('')

  const puedeCrear = PUEDE_CREAR_EMPRESAS.includes(perfil.rol)
  const puedeEditar = PUEDE_EDITAR_EMPRESAS.includes(perfil.rol)
  const puedeEliminar = PUEDE_ELIMINAR_EMPRESAS.includes(perfil.rol)

  // El input se actualiza en cada tecla, pero la consulta espera a que pares.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPagina(0)
    }, 400)
    return () => clearTimeout(temporizador)
  }, [busqueda])

  async function obtenerEmpresas() {
    setCargando(true)
    setError('')

    let consulta = supabase
      .from('empresas_con_conteo')
      .select(CAMPOS, { count: 'exact' })

    if (!verInactivas) consulta = consulta.eq('activo', true)
    if (filtroArl) consulta = consulta.eq('arl_id', filtroArl)
    if (filtroSector) consulta = consulta.eq('sector_id', filtroSector)
    if (minAprendices) consulta = consulta.gte('total_aprendices', Number(minAprendices))

    if (busquedaAplicada) {
      const termino = limpiarParaFiltro(busquedaAplicada)
      if (termino) {
        consulta = consulta.or(`razon_social.ilike.%${termino}%,nit.ilike.%${termino}%`)
      }
    }

    const { columna, ascendente } = ORDENES[orden] || ORDENES.alfabetico
    consulta = consulta.order(columna, { ascending: ascendente })

    const desde = pagina * POR_PAGINA
    const { data, error: errorConsulta, count } = await consulta.range(desde, desde + POR_PAGINA - 1)

    if (errorConsulta) {
      setError('No se pudieron cargar las empresas')
      console.error(errorConsulta.message)
    } else {
      setEmpresas(data || [])
      setTotal(count || 0)
    }

    setCargando(false)
    setIniciando(false)
  }

  async function obtenerConteos() {
    const [resActivas, resInactivas] = await Promise.all([
      supabase.from('empresas_con_conteo').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('empresas_con_conteo').select('id', { count: 'exact', head: true }).eq('activo', false),
    ])
    setConteos({
      activas: resActivas.count || 0,
      inactivas: resInactivas.count || 0,
    })
  }

  useEffect(() => {
    obtenerEmpresas()
  }, [busquedaAplicada, filtroArl, filtroSector, minAprendices, orden, verInactivas, pagina])

  useEffect(() => {
    obtenerConteos()
  }, [])

  function refrescar() {
    obtenerEmpresas()
    obtenerConteos()
  }

  function handleEmpresaCreada() {
    invalidarCatalogo('empresas')
    setMostrandoFormulario(false)
    refrescar()
  }

  function handleEmpresaEditada() {
    invalidarCatalogo('empresas')
    setEmpresaEditando(null)
    refrescar()
  }

  async function eliminarEmpresa(empresa) {
    setMensajeAccion('')

    const { data, error: errorRpc } = await supabase.rpc('eliminar_empresa', {
      p_empresa_id: empresa.id,
    })

    if (errorRpc) {
      setMensajeAccion('No se pudo procesar la solicitud')
      console.error(errorRpc.message)
      return
    }

    if (data.resultado === 'desactivada') {
      setMensajeAccion(
        `${empresa.razon_social} tiene ${data.matriculas} matrícula(s) registrada(s), así que se desactivó en lugar de eliminarse. Su historial queda intacto.`
      )
    } else {
      setMensajeAccion(`${empresa.razon_social} se eliminó.`)
    }

    invalidarCatalogo('empresas')
    refrescar()
  }

  async function reactivarEmpresa(empresa) {
    setMensajeAccion('')

    const { error: errorRpc } = await supabase.rpc('reactivar_empresa', {
      p_empresa_id: empresa.id,
    })

    if (errorRpc) {
      setMensajeAccion('No se pudo reactivar')
      console.error(errorRpc.message)
      return
    }

    invalidarCatalogo('empresas')
    refrescar()
  }

  function limpiarFiltros() {
    setFiltroArl('')
    setFiltroSector('')
    setMinAprendices('')
    setPagina(0)
  }

  if (iniciando) return null

  if (error) {
    return <p className="empresas__mensaje">{error}</p>
  }

  const hayFiltros = filtroArl || filtroSector || minAprendices
  const hayCriterio = hayFiltros || busquedaAplicada
  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const sinEmpresas = conteos.activas === 0 && conteos.inactivas === 0

  return (
    <section className="empresas">
      <header className="empresas__header">
        <div>
          <p className="empresas__eyebrow">Administración</p>
          <h1 className="empresas__titulo">Empresas</h1>
        </div>

        <div className="empresas__header-acciones">
          <span className="empresas__conteo">{conteos.activas} activas</span>
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

      {empresaEliminando && (
        <Confirmacion
          titulo={`¿Eliminar ${empresaEliminando.razon_social}?`}
          mensaje="Si tiene matrículas registradas se desactivará en lugar de borrarse, y su historial queda intacto."
          textoConfirmar="Eliminar"
          onConfirmar={() => {
            const empresa = empresaEliminando
            setEmpresaEliminando(null)
            eliminarEmpresa(empresa)
          }}
          onCancelar={() => setEmpresaEliminando(null)}
        />
      )}

      <div className="empresas__buscador">
        <input
          type="text"
          className="empresas__input-busqueda"
          placeholder="Buscar por razón social o NIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busquedaAplicada && (
          <span className="empresas__resultado-conteo">
            {total} {total === 1 ? 'resultado' : 'resultados'}
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
            onChange={(e) => { setOrden(e.target.value); setPagina(0) }}
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
            onChange={(e) => { setFiltroSector(e.target.value); setPagina(0) }}
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
            onChange={(e) => { setFiltroArl(e.target.value); setPagina(0) }}
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
            onChange={(e) => { setMinAprendices(e.target.value); setPagina(0) }}
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

      {conteos.inactivas > 0 && (
        <button
          className="empresas__toggle"
          onClick={() => { setVerInactivas((v) => !v); setPagina(0) }}
        >
          {verInactivas ? 'Ocultar inactivas' : `Ver inactivas (${conteos.inactivas})`}
        </button>
      )}

      {sinEmpresas ? (
        <p className="empresas__mensaje">Aún no hay empresas registradas.</p>
      ) : total === 0 ? (
        <p className="empresas__mensaje">
          {hayCriterio
            ? 'Ninguna empresa coincide con los filtros.'
            : 'No hay empresas para mostrar.'}
        </p>
      ) : (
        <>
          <div className="empresas__tabla-wrap entra-bloque">
            <table className="empresas__tabla entra-tabla">
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
                {empresas.map((empresa) => (
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
                            setEmpresaEliminando(empresa)
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

          {totalPaginas > 1 && (
            <div className="empresas__paginacion">
              <button
                className="empresas__pagina-boton"
                onClick={() => setPagina((p) => Math.max(p - 1, 0))}
                disabled={pagina === 0 || cargando}
              >
                ← Anterior
              </button>
              <span className="empresas__pagina-info">
                Página {pagina + 1} de {totalPaginas}
              </span>
              <button
                className="empresas__pagina-boton"
                onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas - 1))}
                disabled={pagina >= totalPaginas - 1 || cargando}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Empresas