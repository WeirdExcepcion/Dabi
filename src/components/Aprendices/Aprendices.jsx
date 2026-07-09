import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_CREAR_APRENDICES } from '../../constants/permisos'
import './Aprendices.css'

function Aprendices() {
  const { perfil } = useOutletContext()
  const [aprendices, setAprendices] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const puedeCrear = PUEDE_CREAR_APRENDICES.includes(perfil.rol)

  useEffect(() => {
    async function obtenerAprendices() {
      const { data, error } = await supabase
        .from('aprendices')
        .select(`
          id,
          tipo_documento,
          numero_documento,
          nombres,
          apellidos,
          sexo,
          rh,
          niveles_educativos ( nombre )
        `)
        .order('apellidos', { ascending: true })

      if (error) {
        setError('No se pudieron cargar los aprendices')
        console.error(error.message)
      } else {
        setAprendices(data)
      }

      setCargando(false)
    }

    obtenerAprendices()
  }, [])

  if (cargando) {
    return <p className="aprendices__mensaje">Cargando aprendices...</p>
  }

  if (error) {
    return <p className="aprendices__mensaje">{error}</p>
  }

  return (
    <section className="aprendices">
      <header className="aprendices__header">
        <div>
          <p className="aprendices__eyebrow">Formación</p>
          <h1 className="aprendices__titulo">Aprendices</h1>
        </div>

        <div className="aprendices__header-acciones">
          <span className="aprendices__conteo">{aprendices.length} registrados</span>
          {puedeCrear && (
            <button className="aprendices__boton-nuevo" disabled>
              Nuevo aprendiz
            </button>
          )}
        </div>
      </header>

      {aprendices.length === 0 ? (
        <p className="aprendices__mensaje">Aún no hay aprendices registrados.</p>
      ) : (
        <div className="aprendices__tabla-wrap">
          <table className="aprendices__tabla">
            <thead>
              <tr>
                <th className="aprendices__th">Documento</th>
                <th className="aprendices__th">Apellidos</th>
                <th className="aprendices__th">Nombres</th>
                <th className="aprendices__th">Sexo</th>
                <th className="aprendices__th">RH</th>
                <th className="aprendices__th">Nivel educativo</th>
              </tr>
            </thead>
            <tbody>
              {aprendices.map((aprendiz) => (
                <tr key={aprendiz.id}>
                  <td className="aprendices__td aprendices__td_doc">
                    {aprendiz.tipo_documento} {aprendiz.numero_documento}
                  </td>
                  <td className="aprendices__td aprendices__td_principal">
                    {aprendiz.apellidos}
                  </td>
                  <td className="aprendices__td">{aprendiz.nombres}</td>
                  <td className="aprendices__td">{aprendiz.sexo || '—'}</td>
                  <td className="aprendices__td">{aprendiz.rh || '—'}</td>
                  <td className="aprendices__td">
                    {aprendiz.niveles_educativos?.nombre || '—'}
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

export default Aprendices