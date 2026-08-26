import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { hoyISO, formatearFechaLarga } from '../../../lib/fechas'
import './RegistroContabilidad.css'

const POR_PAGINA = 25
const CLAVE_IDENTIDAD = 'dabi_conta_identidad_separada'

function RegistroContabilidad() {
  const [fecha, setFecha] = useState(hoyISO())
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Cómo se muestra la identidad del aprendiz: junta en una sola columna lista
  // para copiar al software contable, o separada en nombre, tipo y número.
  const [separada, setSeparada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_IDENTIDAD) === 'si'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_IDENTIDAD, separada ? 'si' : 'no')
    } catch {
      // Sin localStorage la preferencia no se recuerda, y no pasa nada más.
    }
  }, [separada])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')

      const desde = pagina * POR_PAGINA

      const { data, error: errorConsulta, count } = await supabase
        .from('contabilidad_matriculas')
        .select('*', { count: 'exact' })
        .eq('fecha_ingreso', fecha)
        .order('apellidos', { ascending: true })
        .order('nombres', { ascending: true })
        .range(desde, desde + POR_PAGINA - 1)

      if (errorConsulta) {
        setError('No se pudieron cargar los registros')
        console.error(errorConsulta.message)
      } else {
        setFilas(data || [])
        setTotal(count || 0)
      }

      setCargando(false)
    }

    cargar()
  }, [fecha, pagina])

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <section className="conta-reg">
      <header className="conta-reg__header">
        <div>
          <p className="conta-reg__eyebrow">Contabilidad</p>
          <h1 className="conta-reg__titulo">Registro diario</h1>
          <p className="conta-reg__fecha-larga">{formatearFechaLarga(fecha)}</p>
        </div>

        <div className="conta-reg__acciones">
          <div className="conta-reg__campo-fecha">
            <label className="conta-reg__label" htmlFor="conta_fecha">Día</label>
            <input
              id="conta_fecha"
              type="date"
              className="conta-reg__input-fecha"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value)
                setPagina(0)
              }}
              max={hoyISO()}
            />
          </div>

          <button
            type="button"
            className="conta-reg__toggle"
            onClick={() => setSeparada((v) => !v)}
          >
            {separada ? 'Ver identificación junta' : 'Ver datos separados'}
          </button>
        </div>
      </header>

      {error && <p className="conta-reg__mensaje">{error}</p>}

      {!error && (
        <>
          <div className="conta-reg__resumen">
            <span className="conta-reg__conteo">
              {total} {total === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {total === 0 && !cargando ? (
            <p className="conta-reg__mensaje">No hubo registros este día.</p>
          ) : (
            <>
              <div className="conta-reg__tabla-wrap entra-bloque">
                <table className="conta-reg__tabla entra-tabla">
                  <thead>
                    <tr>
                      <th className="conta-reg__th">Ingreso</th>
                      {separada ? (
                        <>
                          <th className="conta-reg__th">Nombre completo</th>
                          <th className="conta-reg__th">Tipo</th>
                          <th className="conta-reg__th">Documento</th>
                        </>
                      ) : (
                        <th className="conta-reg__th">Aprendiz</th>
                      )}
                      <th className="conta-reg__th">Curso</th>
                      <th className="conta-reg__th">NIT</th>
                      <th className="conta-reg__th">Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => (
                      <tr key={fila.matricula_id}>
                        <td className="conta-reg__td conta-reg__td_fecha">
                          {fila.fecha_ingreso}
                        </td>

                        {separada ? (
                          <>
                            <td className="conta-reg__td conta-reg__td_principal">
                              {fila.nombre_completo}
                            </td>
                            <td className="conta-reg__td">{fila.tipo_documento}</td>
                            <td className="conta-reg__td conta-reg__td_doc">
                              {fila.numero_documento}
                            </td>
                          </>
                        ) : (
                          <td className="conta-reg__td conta-reg__td_identificacion">
                            {fila.identificacion}
                          </td>
                        )}

                        <td className="conta-reg__td">{fila.curso}</td>
                        <td className="conta-reg__td conta-reg__td_doc">
                          {fila.nit || '—'}
                        </td>
                        <td className="conta-reg__td">{fila.empresa || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="conta-reg__paginacion">
                  <button
                    className="conta-reg__pagina-boton"
                    onClick={() => setPagina((p) => Math.max(p - 1, 0))}
                    disabled={pagina === 0 || cargando}
                  >
                    ← Anterior
                  </button>
                  <span className="conta-reg__pagina-info">
                    Página {pagina + 1} de {totalPaginas}
                  </span>
                  <button
                    className="conta-reg__pagina-boton"
                    onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas - 1))}
                    disabled={pagina >= totalPaginas - 1 || cargando}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

export default RegistroContabilidad