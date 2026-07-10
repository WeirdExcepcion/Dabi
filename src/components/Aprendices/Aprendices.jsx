import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import './Aprendices.css'

function Aprendices() {
  const navegar = useNavigate()
  const [aprendices, setAprendices] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const temporizador = setTimeout(() => {
      obtenerAprendices()
    }, 300)

    return () => clearTimeout(temporizador)
  }, [busqueda])

  async function obtenerAprendices() {
    setCargando(true)
    setError('')

    let consulta = supabase
      .from('aprendices')
      .select(`
        id,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        matriculas ( count )
      `)
      .order('apellidos', { ascending: true })
      .limit(50)

    const termino = busqueda.trim()
    if (termino) {
      consulta = consulta.or(
        `numero_documento.ilike.%${termino}%,nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%`
      )
    }

    const { data, error } = await consulta

    if (error) {
      setError('No se pudieron cargar los aprendices')
      console.error(error.message)
    } else {
      setAprendices(data)
    }

    setCargando(false)
  }

  return (
    <section className="aprendices">
      <header className="aprendices__header">
        <div>
          <p className="aprendices__eyebrow">Formación</p>
          <h1 className="aprendices__titulo">Aprendices</h1>
        </div>
      </header>

      <div className="aprendices__buscador">
        <input
          type="text"
          className="aprendices__input-busqueda"
          placeholder="Buscar por documento, nombre o apellido…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {cargando && <p className="aprendices__mensaje">Buscando...</p>}

      {error && <p className="aprendices__mensaje">{error}</p>}

      {!cargando && !error && aprendices.length === 0 && (
        <p className="aprendices__mensaje">
          {busqueda.trim()
            ? 'Ningún aprendiz coincide con la búsqueda.'
            : 'Aún no hay aprendices registrados.'}
        </p>
      )}

      {!cargando && !error && aprendices.length > 0 && (
        <>
          <div className="aprendices__resumen">
            <span className="aprendices__conteo">
              {aprendices.length === 50
                ? 'Mostrando los primeros 50'
                : `${aprendices.length} ${aprendices.length === 1 ? 'aprendiz' : 'aprendices'}`}
            </span>
          </div>

          <div className="aprendices__tabla-wrap">
            <table className="aprendices__tabla">
              <thead>
                <tr>
                  <th className="aprendices__th">Documento</th>
                  <th className="aprendices__th">Apellidos</th>
                  <th className="aprendices__th">Nombres</th>
                  <th className="aprendices__th">Cursos</th>
                </tr>
              </thead>
              <tbody>
                {aprendices.map((aprendiz) => (
                  <tr
                    key={aprendiz.id}
                    className="aprendices__fila"
                    onClick={() => navegar(`/aprendices/${aprendiz.id}`)}
                  >
                    <td className="aprendices__td aprendices__td_doc">
                      {aprendiz.tipo_documento} {aprendiz.numero_documento}
                    </td>
                    <td className="aprendices__td aprendices__td_principal">
                      {aprendiz.apellidos}
                    </td>
                    <td className="aprendices__td">{aprendiz.nombres}</td>
                    <td className="aprendices__td aprendices__td_conteo">
                      {aprendiz.matriculas[0]?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default Aprendices