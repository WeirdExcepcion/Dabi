import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_CREAR_EMPRESAS } from '../../constants/permisos'
import FormularioEmpresa from './FormularioEmpresa/FormularioEmpresa'
import './Empresas.css'

function Empresas() {
  const { perfil } = useOutletContext()
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)

  const puedeCrear = PUEDE_CREAR_EMPRESAS.includes(perfil.rol)

  useEffect(() => {
    async function obtenerEmpresas() {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social, nit, representante_legal, correo, telefono')
        .order('razon_social', { ascending: true })

      if (error) {
        setError('No se pudieron cargar las empresas')
        console.error(error.message)
      } else {
        setEmpresas(data)
      }

      setCargando(false)
    }

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

  if (cargando) {
    return <p className="empresas__mensaje">Cargando empresas...</p>
  }

  if (error) {
    return <p className="empresas__mensaje">{error}</p>
  }

  return (
    <section className="empresas">
      <header className="empresas__header">
        <div>
          <p className="empresas__eyebrow">Administración</p>
          <h1 className="empresas__titulo">Empresas</h1>
        </div>

        <div className="empresas__header-acciones">
          <span className="empresas__conteo">{empresas.length} registradas</span>
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
        <FormularioEmpresa
          onCreada={handleEmpresaCreada}
          onCancelar={() => setMostrandoFormulario(false)}
        />
      )}

      {empresas.length === 0 ? (
        <p className="empresas__mensaje">Aún no hay empresas registradas.</p>
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
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="empresas__td empresas__td_principal">{empresa.razon_social}</td>
                  <td className="empresas__td">{empresa.nit || '—'}</td>
                  <td className="empresas__td">{empresa.representante_legal || '—'}</td>
                  <td className="empresas__td">{empresa.correo || '—'}</td>
                  <td className="empresas__td">{empresa.telefono || '—'}</td>
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