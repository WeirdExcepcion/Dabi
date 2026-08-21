import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../../lib/supabaseClient'
import './AprendicesEmpresa.css'

const POR_PAGINA = 25

// PostgREST separa los filtros de or() con comas y agrupa con paréntesis.
function limpiarParaFiltro(texto) {
  return texto.replace(/[,()]/g, ' ').trim()
}

function AprendicesEmpresa() {
  const { empresaId } = useParams()
  const navegar = useNavigate()

  const [empresa, setEmpresa] = useState(null)
  const [aprendices, setAprendices] = useState([])
  const [total, setTotal] = useState(0)
  const [totalEmpresa, setTotalEmpresa] = useState(0)
  const [pagina, setPagina] = useState(0)

  const [iniciando, setIniciando] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPagina(0)
    }, 400)
    return () => clearTimeout(temporizador)
  }, [busqueda])

  useEffect(() => {
    async function cargarEmpresa() {
      const [resEmpresa, resTotal] = await Promise.all([
        supabase
          .from('empresas')
          .select('id, razon_social, nit, arls ( nombre ), sectores ( nombre )')
          .eq('id', empresaId)
          .maybeSingle(),
        supabase
          .from('aprendices_por_empresa')
          .select('aprendiz_id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
      ])

      if (resEmpresa.error || !resEmpresa.data) {
        setError('No se encontró la empresa')
        setIniciando(false)
        setCargando(false)
        return
      }

      setEmpresa(resEmpresa.data)
      setTotalEmpresa(resTotal.count || 0)
    }

    cargarEmpresa()
  }, [empresaId])

  useEffect(() => {
    async function cargarAprendices() {
      setCargando(true)

      let consulta = supabase
        .from('aprendices_por_empresa')
        .select('*', { count: 'exact' })
        .eq('empresa_id', empresaId)

      if (busquedaAplicada) {
        const termino = limpiarParaFiltro(busquedaAplicada)
        if (termino) {
          consulta = consulta.or(
            `nombre_completo.ilike.%${termino}%,nombre_invertido.ilike.%${termino}%,numero_documento.ilike.%${termino}%`
          )
        }
      }

      const desde = pagina * POR_PAGINA
      const { data, error: errorConsulta, count } = await consulta
        .order('apellidos', { ascending: true })
        .order('nombres', { ascending: true })
        .range(desde, desde + POR_PAGINA - 1)

      if (errorConsulta) {
        console.error(errorConsulta.message)
      } else {
        setAprendices(data || [])
        setTotal(count || 0)
      }

      setCargando(false)
      setIniciando(false)
    }

    cargarAprendices()
  }, [empresaId, busquedaAplicada, pagina])

  if (iniciando) {
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

  const totalPaginas = Math.ceil(total / POR_PAGINA)

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
          {totalEmpresa} {totalEmpresa === 1 ? 'aprendiz' : 'aprendices'}
        </span>
      </header>

      {totalEmpresa > 0 && (
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

      {totalEmpresa === 0 ? (
        <p className="apr-emp__mensaje">
          Esta empresa aún no tiene aprendices matriculados.
        </p>
      ) : total === 0 ? (
        <p className="apr-emp__mensaje">Ningún aprendiz coincide con la búsqueda.</p>
      ) : (
        <>
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
                {aprendices.map((aprendiz) => (
                  <tr
                    key={aprendiz.aprendiz_id}
                    className="apr-emp__fila"
                    onClick={() => navegar(`/alturas/aprendices/${aprendiz.aprendiz_id}`)}
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

          {totalPaginas > 1 && (
            <div className="apr-emp__paginacion">
              <button
                className="apr-emp__pagina-boton"
                onClick={() => setPagina((p) => Math.max(p - 1, 0))}
                disabled={pagina === 0 || cargando}
              >
                ← Anterior
              </button>
              <span className="apr-emp__pagina-info">
                Página {pagina + 1} de {totalPaginas}
              </span>
              <button
                className="apr-emp__pagina-boton"
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

export default AprendicesEmpresa