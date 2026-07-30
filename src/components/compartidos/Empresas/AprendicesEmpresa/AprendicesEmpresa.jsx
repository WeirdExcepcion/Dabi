import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../../lib/supabaseClient'
import './AprendicesEmpresa.css'

function AprendicesEmpresa() {
  const { empresaId } = useParams()
  const navegar = useNavigate()

  const [empresa, setEmpresa] = useState(null)
  const [aprendices, setAprendices] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')

      const [resEmpresa, resMatriculas] = await Promise.all([
        supabase
          .from('empresas')
          .select('id, razon_social, nit, arls ( nombre ), sectores ( nombre )')
          .eq('id', empresaId)
          .maybeSingle(),
        supabase
          .from('matriculas')
          .select(`
            aprendiz_id,
            aprendices ( id, tipo_documento, numero_documento, nombres, apellidos )
          `)
          .eq('empresa_id', empresaId),
      ])

      if (resEmpresa.error || !resEmpresa.data) {
        setError('No se encontró la empresa')
        setCargando(false)
        return
      }

      setEmpresa(resEmpresa.data)

      if (resMatriculas.error) {
        console.error(resMatriculas.error.message)
        setCargando(false)
        return
      }

      const mapa = {}
      ;(resMatriculas.data || []).forEach((m) => {
        if (!m.aprendices) return
        const id = m.aprendices.id
        if (!mapa[id]) {
          mapa[id] = { ...m.aprendices, cursos: 0 }
        }
        mapa[id].cursos += 1
      })

      const lista = Object.values(mapa).sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`)
      )

      setAprendices(lista)
      setCargando(false)
    }

    cargar()
  }, [empresaId])

  if (cargando) {
    return <p className="apr-emp__mensaje">Cargando…</p>
  }

  if (error) {
    return (
      <section>
        <p className="apr-emp__mensaje">{error}</p>
        <button className="apr-emp__volver" onClick={() => navegar('/alturas/empresas')}>
          Volver a empresas
        </button>
      </section>
    )
  }

  const termino = busqueda.trim().toLowerCase()
  const visibles = termino
    ? aprendices.filter(
        (a) =>
          `${a.nombres} ${a.apellidos}`.toLowerCase().includes(termino) ||
          a.numero_documento.toLowerCase().includes(termino)
      )
    : aprendices

  return (
    <section className="apr-emp">
      <button className="apr-emp__volver" onClick={() => navegar('/alturas/empresas')}>
        ← Empresas
      </button>

      <header className="apr-emp__header">
        <div>
          <p className="apr-emp__eyebrow">Aprendices de</p>
          <h1 className="apr-emp__titulo">{empresa.razon_social}</h1>
          <p className="apr-emp__detalle">
            {empresa.nit && `NIT ${empresa.nit}`}
            {empresa.arls?.nombre && ` · ${empresa.arls.nombre}`}
            {empresa.sectores?.nombre && ` · ${empresa.sectores.nombre}`}
          </p>
        </div>

        <span className="apr-emp__conteo">
          {aprendices.length} {aprendices.length === 1 ? 'aprendiz' : 'aprendices'}
        </span>
      </header>

      {aprendices.length > 0 && (
        <div className="apr-emp__buscador">
          <input
            type="text"
            className="apr-emp__input-busqueda"
            placeholder="Buscar por nombre o documento…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {aprendices.length === 0 ? (
        <p className="apr-emp__mensaje">
          Esta empresa aún no tiene aprendices matriculados.
        </p>
      ) : visibles.length === 0 ? (
        <p className="apr-emp__mensaje">Ningún aprendiz coincide con la búsqueda.</p>
      ) : (
        <div className="apr-emp__tabla-wrap">
          <table className="apr-emp__tabla">
            <thead>
              <tr>
                <th className="apr-emp__th">Documento</th>
                <th className="apr-emp__th">Apellidos</th>
                <th className="apr-emp__th">Nombres</th>
                <th className="apr-emp__th">Cursos con esta empresa</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((aprendiz) => (
                <tr
                  key={aprendiz.id}
                  className="apr-emp__fila"
                  onClick={() => navegar(`/alturas/aprendices/${aprendiz.id}`)}
                >
                  <td className="apr-emp__td apr-emp__td_doc">
                    {aprendiz.tipo_documento} {aprendiz.numero_documento}
                  </td>
                  <td className="apr-emp__td apr-emp__td_principal">{aprendiz.apellidos}</td>
                  <td className="apr-emp__td">{aprendiz.nombres}</td>
                  <td className="apr-emp__td apr-emp__td_conteo">{aprendiz.cursos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AprendicesEmpresa