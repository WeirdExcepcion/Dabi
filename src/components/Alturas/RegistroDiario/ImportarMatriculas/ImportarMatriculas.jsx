import { useState, useMemo, useEffect } from 'react'
import { procesarArchivo, generarPlantilla } from '../../../../lib/importarMatriculas'
import { construirPlan } from '../../../../lib/planImportacion'
import { cargarContexto, ejecutarCarga } from '../../../../lib/cargaImportacion'
import { descargarCsv } from '../../../../lib/csvMintrabajo'
import { formatearFechaCorta } from '../../../../lib/fechas'
import { PUEDE_CREAR_GRUPOS, PUEDE_CREAR_EMPRESAS } from '../../../../constants/permisos'
import ResolverPendientes from './ResolverPendientes/ResolverPendientes'
import './ImportarMatriculas.css'

const FILTROS = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'error', etiqueta: 'Con error' },
  { id: 'inconsistencia', etiqueta: 'Con inconsistencias' },
]

const ETIQUETA_ESTADO = {
  valida: 'Lista',
  inconsistencia: 'Inconsistencia',
  error: 'Error',
}

const ETIQUETA_RESULTADO = {
  cargada: 'Cargada',
  ya_estaba: 'Ya estaba',
  error: 'No se cargó',
  bloqueada: 'Sin decidir',
  omitida: 'Error en el archivo',
}

const CLASE_RESULTADO = {
  cargada: 'valida',
  ya_estaba: 'neutra',
  error: 'error',
  bloqueada: 'error',
  omitida: 'error',
}

// Una sola referencia para "sin filas": un [] nuevo en cada render haría que
// el plan se recalculara siempre.
const SIN_FILAS = []

// Pasos: archivo → resolver → cargando → resumen.
function ImportarMatriculas({ rol, onCerrar }) {
  const [paso, setPaso] = useState('archivo')

  const [nombreArchivo, setNombreArchivo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [filtro, setFiltro] = useState('todas')

  const [contexto, setContexto] = useState(null)
  const [cargandoContexto, setCargandoContexto] = useState(false)
  const [errorContexto, setErrorContexto] = useState('')
  const [decisiones, setDecisiones] = useState({})

  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [resumen, setResumen] = useState(null)

  const permisos = useMemo(() => ({
    crearGrupos: PUEDE_CREAR_GRUPOS.includes(rol),
    crearEmpresas: PUEDE_CREAR_EMPRESAS.includes(rol),
  }), [rol])

  const filas = resultado?.filas ?? SIN_FILAS

  const plan = useMemo(
    () => (contexto && filas.length ? construirPlan(filas, contexto, decisiones, permisos) : null),
    [filas, contexto, decisiones, permisos]
  )

  // Cerrar la pestaña a mitad de carga deja la mitad registrada. Se puede
  // retomar subiendo el mismo archivo, pero mejor avisar.
  useEffect(() => {
    if (paso !== 'cargando') return
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [paso])

  async function elegirArchivo(e) {
    const archivo = e.target.files?.[0]
    // Se vacía para que volver a elegir el mismo archivo, ya corregido en
    // Excel, dispare el cambio otra vez.
    e.target.value = ''
    if (!archivo) return

    setNombreArchivo(archivo.name)
    setFiltro('todas')
    setContexto(null)
    setDecisiones({})

    if (/\.xlsx?$/i.test(archivo.name)) {
      setResultado({
        error: 'Ese es un archivo de Excel, no un CSV. En Excel: Archivo → Guardar como → "CSV UTF-8 (delimitado por comas)".',
      })
      return
    }

    setLeyendo(true)
    try {
      setResultado(procesarArchivo(await archivo.arrayBuffer()))
    } catch (err) {
      console.error(err)
      setResultado({ error: 'No se pudo leer el archivo.' })
    }
    setLeyendo(false)
  }

  async function continuar() {
    setPaso('resolver')
    if (contexto) return

    setCargandoContexto(true)
    setErrorContexto('')
    try {
      setContexto(await cargarContexto(filas))
    } catch (err) {
      console.error(err)
      setErrorContexto('No se pudo consultar la base. Revisa la conexión e inténtalo de nuevo.')
    }
    setCargandoContexto(false)
  }

  async function cargar() {
    setPaso('cargando')
    setProgreso({ hechas: 0, total: plan.conteo.lista })

    const intentadas = await ejecutarCarga(plan, (hechas, total) => setProgreso({ hechas, total }))
    const sinIntentar = plan.filas
      .filter((f) => f.estado !== 'lista')
      .map((f) => ({ ...f, resultado: f.estado, motivo: f.motivos.join(' · ') }))

    setResumen([...intentadas, ...sinIntentar].sort((a, b) => a.fila - b.fila))
    setPaso('resumen')
  }

  const huboCargas = resumen?.some((r) => r.resultado === 'cargada') ?? false
  const cerrar = () => onCerrar(huboCargas)

  return (
    <div className="importar">
      <div className="importar__encabezado">
        <div>
          <p className="importar__eyebrow">Carga masiva</p>
          <h2 className="importar__titulo">Importar matrículas</h2>
        </div>
        <button
          type="button"
          className="importar__cerrar"
          onClick={cerrar}
          disabled={paso === 'cargando'}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <ol className="importar__pasos">
        {[
          ['archivo', 'Revisar el archivo'],
          ['resolver', 'Cruzar con la base'],
          ['resumen', 'Cargar'],
        ].map(([id, texto], i) => (
          <li
            key={id}
            className={
              id === paso || (id === 'resumen' && paso === 'cargando')
                ? 'importar__paso importar__paso_actual'
                : 'importar__paso'
            }
          >
            <span className="importar__paso-numero">{i + 1}</span>
            {texto}
          </li>
        ))}
      </ol>

      {paso === 'archivo' && (
        <PasoArchivo
          nombreArchivo={nombreArchivo}
          resultado={resultado}
          leyendo={leyendo}
          filtro={filtro}
          onFiltro={setFiltro}
          onArchivo={elegirArchivo}
        />
      )}

      {paso === 'resolver' && (
        <PasoResolver
          plan={plan}
          cargando={cargandoContexto}
          error={errorContexto}
          onReintentar={() => {
            setContexto(null)
            continuar()
          }}
          onDecidir={(llave, decision) => setDecisiones((d) => ({ ...d, [llave]: decision }))}
        />
      )}

      {paso === 'cargando' && (
        <div className="importar__progreso" role="status">
          <p className="importar__progreso-texto">
            Registrando {progreso.hechas} de {progreso.total}…
          </p>
          <div className="importar__barra">
            <div
              className="importar__barra-relleno"
              style={{ width: `${progreso.total ? (progreso.hechas / progreso.total) * 100 : 0}%` }}
            />
          </div>
          <p className="importar__nota">No cierres esta ventana hasta que termine.</p>
        </div>
      )}

      {paso === 'resumen' && <PasoResumen resumen={resumen} />}

      <div className="importar__pie">
        {paso === 'archivo' && (
          <>
            <p className="importar__nota">
              Las filas con error no se cargan. Corrígelas en Excel y vuelve a subir el
              archivo, o sigue sin ellas.
            </p>
            <div className="importar__botones">
              <button type="button" className="importar__boton-secundario" onClick={cerrar}>
                Cerrar
              </button>
              <button
                type="button"
                className="importar__boton-principal"
                onClick={continuar}
                disabled={!filas.some((f) => f.estado !== 'error')}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {paso === 'resolver' && (
          <>
            <p className="importar__nota">
              Se registra cada fila lista. Si algo falla en una, las demás siguen.
            </p>
            <div className="importar__botones">
              <button
                type="button"
                className="importar__boton-secundario"
                onClick={() => setPaso('archivo')}
              >
                Volver
              </button>
              <button
                type="button"
                className="importar__boton-principal"
                onClick={cargar}
                disabled={!plan || plan.conteo.lista === 0}
              >
                {plan?.conteo.lista
                  ? `Cargar ${plan.conteo.lista} ${plan.conteo.lista === 1 ? 'matrícula' : 'matrículas'}`
                  : 'Nada para cargar'}
              </button>
            </div>
          </>
        )}

        {paso === 'resumen' && (
          <>
            <p className="importar__nota">
              Para retomar lo que no entró, corrige esas filas y sube el mismo archivo: lo
              que ya está cargado se reconoce y no se duplica.
            </p>
            <button type="button" className="importar__boton-principal" onClick={cerrar}>
              Terminar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PasoArchivo({ nombreArchivo, resultado, leyendo, filtro, onFiltro, onArchivo }) {
  const filas = resultado?.filas || []
  const conteo = { valida: 0, inconsistencia: 0, error: 0 }
  for (const f of filas) conteo[f.estado]++

  const visibles = filtro === 'todas' ? filas : filas.filter((f) => f.estado === filtro)

  return (
    <>
      <p className="importar__intro">
        Sube un CSV con las columnas de la plantilla. Cada fila se revisa antes de
        cargar nada.
      </p>

      <div className="importar__archivo">
        {/* El input queda oculto a la vista pero no al teclado: el label hace
            de botón y el foco sigue llegando al input. */}
        <label className={leyendo ? 'importar__boton importar__boton_inactivo' : 'importar__boton'}>
          {leyendo ? 'Leyendo…' : nombreArchivo ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="importar__input-archivo"
            onChange={onArchivo}
            disabled={leyendo}
          />
        </label>

        {nombreArchivo && <span className="importar__nombre-archivo">{nombreArchivo}</span>}

        <button
          type="button"
          className="importar__enlace"
          onClick={() => descargarCsv(generarPlantilla(), 'plantilla-matriculas-dabi.csv')}
        >
          Descargar plantilla
        </button>
      </div>

      {resultado?.error && (
        <div className="importar__fallo">
          <p className="importar__fallo-texto">{resultado.error}</p>
          {resultado.faltantes?.length > 0 && (
            <p className="importar__fallo-detalle">Faltan: {resultado.faltantes.join(', ')}</p>
          )}
          {/* Con columnas faltantes, las ignoradas suelen ser la pista: un
              "Fecha de ingresso" mal escrito aparece aquí. */}
          {resultado.ignoradas?.length > 0 && (
            <p className="importar__fallo-detalle">
              No se reconocieron: {resultado.ignoradas.join(', ')}
            </p>
          )}
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div className="importar__resumen">
            <span className="importar__total">
              {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
            </span>
            <span className="importar__marca importar__marca_valida">
              {conteo.valida} {conteo.valida === 1 ? 'lista' : 'listas'}
            </span>
            {conteo.inconsistencia > 0 && (
              <span className="importar__marca importar__marca_inconsistencia">
                {conteo.inconsistencia} con {conteo.inconsistencia === 1 ? 'inconsistencia' : 'inconsistencias'}
              </span>
            )}
            {conteo.error > 0 && (
              <span className="importar__marca importar__marca_error">
                {conteo.error} con error
              </span>
            )}
          </div>

          {resultado.ignoradas.length > 0 && (
            <p className="importar__aviso">
              Columnas que no son de la plantilla y se ignoran: {resultado.ignoradas.join(', ')}
            </p>
          )}

          <div className="importar__filtros">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={
                  filtro === f.id ? 'importar__filtro importar__filtro_activo' : 'importar__filtro'
                }
                onClick={() => onFiltro(f.id)}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>

          <TablaFilas
            filas={visibles}
            columnaCurso
            estado={(f) => (
              <span className={`importar__marca importar__marca_${f.estado}`}>
                {ETIQUETA_ESTADO[f.estado]}
              </span>
            )}
            mensajes={(f) => [
              ...f.errores.map((m) => ({ texto: m, tipo: 'error' })),
              ...f.inconsistencias.map((m) => ({ texto: m, tipo: 'inconsistencia' })),
            ]}
            vacio="Ninguna fila en este filtro."
          />
        </>
      )}
    </>
  )
}

function PasoResolver({ plan, cargando, error, onReintentar, onDecidir }) {
  if (cargando) {
    return <p className="importar__intro">Cruzando el archivo con lo que hay en Dabi…</p>
  }

  if (error) {
    return (
      <div className="importar__fallo">
        <p className="importar__fallo-texto">{error}</p>
        <button type="button" className="importar__enlace" onClick={onReintentar}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!plan) return null

  const conAlgoQueDecir = plan.filas.filter(
    (f) => f.estado === 'bloqueada' || (f.estado === 'lista' && f.avisos.length > 0)
  )

  return (
    <>
      <div className="importar__resumen">
        <span className="importar__marca importar__marca_valida">
          {plan.conteo.lista} {plan.conteo.lista === 1 ? 'lista' : 'listas'} para cargar
        </span>
        {plan.conteo.bloqueada > 0 && (
          <span className="importar__marca importar__marca_inconsistencia">
            {plan.conteo.bloqueada} {plan.conteo.bloqueada === 1 ? 'espera' : 'esperan'} una decisión
          </span>
        )}
        {plan.conteo.omitida > 0 && (
          <span className="importar__marca importar__marca_error">
            {plan.conteo.omitida} se {plan.conteo.omitida === 1 ? 'omite' : 'omiten'} por errores del archivo
          </span>
        )}
      </div>

      <div className="importar__resolver">
        {plan.pendientes.length === 0 ? (
          <p className="importar__intro">
            Todo coincide con lo que ya hay en Dabi: no hay nada que decidir.
          </p>
        ) : (
          <ResolverPendientes pendientes={plan.pendientes} onDecidir={onDecidir} />
        )}
      </div>

      {conAlgoQueDecir.length > 0 && (
        <>
          <h3 className="importar__subtitulo">Filas con algo que saber</h3>
          <TablaFilas
            filas={conAlgoQueDecir}
            estado={(f) => (
              <span
                className={
                  f.estado === 'lista'
                    ? 'importar__marca importar__marca_valida'
                    : 'importar__marca importar__marca_inconsistencia'
                }
              >
                {f.estado === 'lista' ? 'Lista' : 'Sin decidir'}
              </span>
            )}
            mensajes={(f) => [
              ...f.motivos.map((m) => ({ texto: m, tipo: 'error' })),
              ...f.avisos.map((m) => ({ texto: m, tipo: 'inconsistencia' })),
            ]}
          />
        </>
      )}
    </>
  )
}

function PasoResumen({ resumen }) {
  const conteo = { cargada: 0, ya_estaba: 0, error: 0, bloqueada: 0, omitida: 0 }
  for (const r of resumen) conteo[r.resultado]++
  const noCargadas = conteo.error + conteo.bloqueada + conteo.omitida
  const problemas = resumen.filter((r) => r.resultado !== 'cargada' || r.avisosCarga?.length)

  return (
    <>
      <div className="importar__resumen">
        <span className="importar__marca importar__marca_valida">
          {conteo.cargada} {conteo.cargada === 1 ? 'cargada' : 'cargadas'}
        </span>
        {conteo.ya_estaba > 0 && (
          <span className="importar__marca importar__marca_neutra">
            {conteo.ya_estaba} ya {conteo.ya_estaba === 1 ? 'estaba' : 'estaban'}
          </span>
        )}
        {noCargadas > 0 && (
          <span className="importar__marca importar__marca_error">
            {noCargadas} no {noCargadas === 1 ? 'entró' : 'entraron'}
          </span>
        )}
      </div>

      {problemas.length === 0 ? (
        <p className="importar__intro">Todas las filas quedaron registradas.</p>
      ) : (
        <TablaFilas
          filas={problemas}
          estado={(r) => (
            <span className={`importar__marca importar__marca_${CLASE_RESULTADO[r.resultado]}`}>
              {ETIQUETA_RESULTADO[r.resultado]}
            </span>
          )}
          mensajes={(r) => [
            ...(r.motivo ? [{ texto: r.motivo, tipo: r.resultado === 'ya_estaba' ? 'neutro' : 'error' }] : []),
            ...(r.detalle ? [{ texto: r.detalle, tipo: 'detalle' }] : []),
            ...(r.avisosCarga || []).map((m) => ({ texto: m, tipo: 'inconsistencia' })),
          ]}
        />
      )}
    </>
  )
}

// La fecha que falte se calcula al cruzar con la base, con la duración del
// curso; aquí todavía no se conoce.
function rangoFechas(d) {
  if (!d.fecha_inicio && !d.fecha_fin) return 'Fechas por calcular'
  const inicio = d.fecha_inicio ? formatearFechaCorta(d.fecha_inicio) : '…'
  const fin = d.fecha_fin ? formatearFechaCorta(d.fecha_fin) : '…'
  return `${inicio} – ${fin}`
}

// La misma tabla en los tres pasos; cambia qué estado y qué mensajes muestra.
function TablaFilas({ filas, estado, mensajes, columnaCurso = false, vacio }) {
  return (
    <div className="importar__tabla-wrap">
      <table className="importar__tabla">
        <thead>
          <tr>
            <th className="importar__th">Fila</th>
            <th className="importar__th">Aprendiz</th>
            {columnaCurso && <th className="importar__th">Curso</th>}
            {columnaCurso && <th className="importar__th">Empresa</th>}
            <th className="importar__th">Estado</th>
            <th className="importar__th">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const d = f.datos
            const lista = mensajes(f)
            return (
              <tr key={f.fila} className="importar__fila">
                {/* Mismo número que en Excel, para ir directo a la fila. */}
                <td className="importar__td importar__td_numero">{f.fila}</td>

                <td className="importar__td">
                  <span className="importar__principal">
                    {[d.apellidos, d.nombres].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className="importar__secundario">
                    {d.tipo_documento} {d.numero_documento}
                  </span>
                </td>

                {columnaCurso && (
                  <td className="importar__td">
                    <span className="importar__principal">{d.curso || '—'}</span>
                    <span className="importar__secundario">{rangoFechas(d)}</span>
                    <span className="importar__secundario">
                      Ingreso {formatearFechaCorta(d.fecha_ingreso)}
                    </span>
                  </td>
                )}

                {columnaCurso && (
                  <td className="importar__td">
                    {d.independiente ? (
                      <span className="importar__principal">Independiente</span>
                    ) : (
                      <>
                        <span className="importar__principal">{d.empresa || '—'}</span>
                        {d.nit && <span className="importar__secundario">NIT {d.nit}</span>}
                      </>
                    )}
                  </td>
                )}

                <td className="importar__td">{estado(f)}</td>

                <td className="importar__td importar__td_detalle">
                  {lista.length === 0 ? (
                    '—'
                  ) : (
                    <ul className="importar__mensajes">
                      {lista.map((m) => (
                        <li key={m.texto} className={`importar__mensaje importar__mensaje_${m.tipo}`}>
                          {m.texto}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {filas.length === 0 && vacio && <p className="importar__vacio">{vacio}</p>}
    </div>
  )
}

export default ImportarMatriculas
