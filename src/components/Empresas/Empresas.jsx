import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_CREAR_EMPRESAS, PUEDE_EDITAR_EMPRESAS, PUEDE_ELIMINAR_EMPRESAS } from '../../constants/permisos'
import Modal from '../Modal/Modal'
import FormularioEmpresa from './FormularioEmpresa/FormularioEmpresa'
import './Empresas.css'

function Empresas() {
  const { perfil } = useOutletContext()
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState(null)
  const [verInactivas, setVerInactivas] = useState(false)
  const [mensajeAccion, setMensajeAccion] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const puedeCrear = PUEDE_CREAR_EMPRESAS.includes(perfil.rol)
  const puedeEditar = PUEDE_EDITAR_EMPRESAS.includes(perfil.rol)
  const puedeEliminar = PUEDE_ELIMINAR_EMPRESAS.includes(perfil.rol)

  async function obtenerEmpresas() {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, razon_social, nit, representante_legal, correo, telefono, arl_id, sector_id, rut_path, activo, arls ( nombre ), sectores ( nombre )')
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
    obtenerEmpresas()
  }, [])

  function handleEmpresaCreada(nuevaEmpresa) {
    setEmpresas((anteriores) =>
      [...anteriores, nuevaEmpresa].sort((a, b) =>
        a.razon_social.localeCompare(b.razon_social)
      )
    )
    setMostrandoFormulario(false)
  }

  function handleEmpresaEditada(empresaActualizada) {
    setEmpresas((anteriores) =>
      anteriores
        .map((e) => (e.id === empresaActualizada.id ? empresaActualizada : e))
        .sort((a, b) => a.razon_social.localeCompare(b.razon_social))
    )
    setEmpresaEditando(null)
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

  if (cargando) {
    return <p className="empresas__mensaje">Cargando empresas...</p>
  }

  if (error) {
    return <p className="empresas__mensaje">{error}</p>
  }

  const activas = empresas.filter((e) => e.activo)
  const inactivas = empresas.filter((e) => !e.activo)
  const base = verInactivas ? empresas : activas

  const termino = busqueda.trim().toLowerCase()
  const visibles = termino
    ? base.filter(
        (e) =>
          e.razon_social.toLowerCase().includes(termino) ||
          (e.nit || '').toLowerCase().includes(termino)
      )
    : base
  
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
        <Modal onCerrar={() => setMostrandoFormulario(false)}>
          <FormularioEmpresa
            rol={perfil.rol}
            onGuardada={handleEmpresaCreada}
            onCancelar={() => setMostrandoFormulario(false)}
          />
        </Modal>
      )}

      {empresaEditando && (
        <Modal onCerrar={() => setEmpresaEditando(null)}>
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
        <p className="empresas__mensaje">Ninguna empresa coincide con la búsqueda.</p>
      ) : (
        <div className="empresas__tabla-wrap">
          <table className="empresas__tabla">
            <thead>
              <tr>
                <th className="empresas__th">Razón social</th>
                <th className="empresas__th">NIT</th>
                <th className="empresas__th">Representante legal</th>
                <th className="empresas__th">Correo</th>
                <th className="empresas__th">Teléfono</th>
                <th className="empresas__th">ARL</th>
                <th className="empresas__th">Sector</th>
                <th className="empresas__th"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="empresas__td empresas__td_principal">{empresa.razon_social}</td>
                  <td className="empresas__td">{empresa.nit || '—'}</td>
                  <td className="empresas__td">{empresa.representante_legal || '—'}</td>
                  <td className="empresas__td">{empresa.correo || '—'}</td>
                  <td className="empresas__td">{empresa.telefono || '—'}</td>
                  <td className="empresas__td">{empresa.arls?.nombre || '—'}</td>
                  <td className="empresas__td">{empresa.sectores?.nombre || '—'}</td>
                  <td className="empresas__td empresas__td_acciones">
                    {puedeEditar && (
                      <button
                        className="empresas__boton-editar"
                        onClick={() => setEmpresaEditando(empresa)}
                      >
                        Editar
                      </button>
                    )}
                    {puedeEliminar && empresa.activo && (
                      <button
                        className="empresas__boton-eliminar"
                        onClick={() => {
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
                        onClick={() => reactivarEmpresa(empresa)}
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